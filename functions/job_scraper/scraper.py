# file: scapholf.py
"""
scapholf — a polite, extensible job scraper for Swiss job sites.

Dependencies:
  - Python 3.9+
  - No hard deps beyond stdlib.
  - Optional (recommended): 'orjson' for faster JSON, 'beautifulsoup4' for HTML parsing.
Install (optional):
  pip install orjson beautifulsoup4

Usage examples:
  python scapholf.py --sites jobs.ch indeed aurawoo swissmedicsjobs adecco jobboardfinder \
      --query "nurse" --location "Zurich" --max-pages 3 --concurrency 6 --out-jsonl jobs.jsonl

Notes:
  - LinkedIn & TieTalent adapters are stubs (respect ToS; use official feeds/APIs).
  - Adapters rely on JSON-LD JobPosting when available; selectors are deliberately minimal.
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import csv
import dataclasses
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.robotparser
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
from html import unescape
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple
from urllib.parse import urljoin, urlparse

# Optional fast JSON
try:
    import orjson  # type: ignore
except Exception:  # pragma: no cover
    orjson = None  # fallback to stdlib json

# Optional BS4
try:
    from bs4 import BeautifulSoup  # type: ignore
except Exception:
    BeautifulSoup = None

DEFAULT_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 scapholf/1.0"
)

# ----------------------------
# Data model
# ----------------------------

@dataclass
class JobPosting:
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    datePosted: Optional[str] = None
    validThrough: Optional[str] = None
    employmentType: Optional[str] = None
    salary: Optional[str] = None
    url: Optional[str] = None
    source: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None  # why: preserve original JSON-LD block for auditing


# ----------------------------
# Helpers
# ----------------------------

class RobotsCache:
    """Cache robots.txt per netloc to avoid repeated downloads; fail closed when disallowed."""
    def __init__(self, user_agent: str) -> None:
        self.user_agent = user_agent
        self.cache: Dict[str, urllib.robotparser.RobotFileParser] = {}

    def can_fetch(self, url: str) -> bool:
        parsed = urlparse(url)
        robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
        rp = self.cache.get(parsed.netloc)
        if rp is None:
            rp = urllib.robotparser.RobotFileParser()
            with contextlib.suppress(Exception):
                rp.set_url(robots_url)
                rp.read()
            self.cache[parsed.netloc] = rp
        with contextlib.suppress(Exception):
            allowed = rp.can_fetch(self.user_agent, url)
            return bool(allowed)
        return False


class RateLimiter:
    """Simple per-host delay; jitter avoids thundering herd."""
    def __init__(self, base_delay: float = 1.0) -> None:
        self.base_delay = max(0.0, base_delay)
        self.last_seen: Dict[str, float] = defaultdict(lambda: 0.0)

    async def wait(self, url: str) -> None:
        host = urlparse(url).netloc
        now = time.monotonic()
        elapsed = now - self.last_seen[host]
        min_delay = self.base_delay + random.uniform(0.0, self.base_delay * 0.25)
        if elapsed < min_delay:
            await asyncio.sleep(min_delay - elapsed)
        self.last_seen[host] = time.monotonic()


def safe_json_dumps(obj: Any) -> bytes:
    if orjson:
        # why: keep exact bytes for fast streaming
        return orjson.dumps(obj, option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SERIALIZE_NUMPY)
    return json.dumps(obj, ensure_ascii=False).encode("utf-8")


def normalize_space(s: Optional[str]) -> Optional[str]:
    if s is None:
        return None
    return re.sub(r"\s+", " ", unescape(s)).strip() or None


def same_host(url: str, base: str) -> bool:
    return urlparse(url).netloc == urlparse(base).netloc


def default_headers(user_agent: str) -> Dict[str, str]:
    return {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.8,de-CH;q=0.7",
        "Connection": "close",
    }


async def http_get(url: str, timeout: float, headers: Dict[str, str], robots: RobotsCache,
                   limiter: RateLimiter, max_retries: int = 3) -> Optional[str]:
    if not robots.can_fetch(url):
        sys.stderr.write(f"[robots] Disallowed: {url}\n")
        return None
    await limiter.wait(url)
    backoff = 0.75
    for attempt in range(1, max_retries + 1):
        try:
            import aiohttp  # local import to avoid hard dep if unused
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=timeout), headers=headers) as sess:
                async with sess.get(url, allow_redirects=True) as resp:
                    if resp.status >= 400:
                        raise RuntimeError(f"HTTP {resp.status}")
                    ct = resp.headers.get("Content-Type", "")
                    if "text/html" not in ct and "application/xhtml+xml" not in ct:
                        body = await resp.text(errors="ignore")
                        return body  # why: some sites serve jsonld with text/plain
                    text = await resp.text(errors="ignore")
                    return text
        except Exception as e:
            if attempt == max_retries:
                sys.stderr.write(f"[fetch] Failed {url}: {e}\n")
                return None
            await asyncio.sleep(backoff * attempt + random.uniform(0, 0.3))
    return None


def extract_ld_json_blocks(html: str) -> List[Dict[str, Any]]:
    blocks: List[Dict[str, Any]] = []
    # Cheap scan to avoid full HTML parse when possible
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.IGNORECASE | re.DOTALL,
    ):
        raw = m.group(1).strip()
        # Try lenient JSON recovery
        try:
            data = json.loads(raw)
            blocks.append(data)
            continue
        except Exception:
            pass
        # Try array fallback
        with contextlib.suppress(Exception):
            raw2 = raw.replace("\n", " ").replace("\r", " ")
            data = json.loads(raw2)
            blocks.append(data)
    return blocks


def coerce_to_list(x: Any) -> List[Any]:
    if x is None:
        return []
    if isinstance(x, list):
        return x
    return [x]


def from_jsonld_jobposting(obj: Dict[str, Any], base_url: str, source_name: str) -> JobPosting:
    # Accept both "JobPosting" and list under @graph
    if "@graph" in obj:
        # pick first JobPosting in graph
        for g in coerce_to_list(obj["@graph"]):
            if isinstance(g, dict) and g.get("@type") in ("JobPosting", ["JobPosting"]):
                obj = g
                break
    title = normalize_space(obj.get("title"))
    hiring_org = obj.get("hiringOrganization") or {}
    if isinstance(hiring_org, str):
        company = normalize_space(hiring_org)
    else:
        company = normalize_space(hiring_org.get("name")) if isinstance(hiring_org, dict) else None

    loc_obj = obj.get("jobLocation") or {}
    if isinstance(loc_obj, list) and loc_obj:
        loc_obj = loc_obj[0]
    if isinstance(loc_obj, dict):
        address = loc_obj.get("address") or {}
        if isinstance(address, dict):
            location = ", ".join(filter(None, [
                normalize_space(address.get("addressLocality")),
                normalize_space(address.get("addressRegion")),
                normalize_space(address.get("addressCountry")),
            ])) or None
        else:
            location = normalize_space(str(address))
    else:
        location = None

    desc = obj.get("description")
    if isinstance(desc, str):
        # Strip HTML tags minimally
        desc = normalize_space(re.sub(r"<[^>]+>", " ", desc))
    else:
        desc = None

    salary = None
    comp = obj.get("baseSalary") or obj.get("salary")
    if isinstance(comp, dict):
        val = comp.get("value")
        if isinstance(val, dict):
            amount = val.get("value") or val.get("minValue") or val.get("maxValue")
            unit = val.get("unitText")
            currency = comp.get("currency") or val.get("currency")
            parts = [str(amount) if amount else None, unit, currency]
            salary = normalize_space(" ".join([p for p in parts if p]))
        else:
            salary = normalize_space(str(val))
    elif isinstance(comp, str):
        salary = normalize_space(comp)

    url = obj.get("url") or obj.get("hiringOrganization", {}).get("sameAs")
    if isinstance(url, str):
        url = urljoin(base_url, url)
    else:
        url = base_url

    return JobPosting(
        title=title,
        company=company,
        location=location,
        description=desc,
        datePosted=normalize_space(obj.get("datePosted")),
        validThrough=normalize_space(obj.get("validThrough")),
        employmentType=normalize_space(obj.get("employmentType")),
        salary=salary,
        url=url,
        source=source_name,
        raw=obj,
    )


def extract_ld_json_jobpostings(html: str, base_url: str, source_name: str) -> List[JobPosting]:
    jobs: List[JobPosting] = []
    for block in extract_ld_json_blocks(html):
        if isinstance(block, list):
            for it in block:
                if isinstance(it, dict) and (it.get("@type") == "JobPosting" or "JobPosting" in coerce_to_list(it.get("@type"))):
                    jobs.append(from_jsonld_jobposting(it, base_url, source_name))
        elif isinstance(block, dict):
            if block.get("@type") == "JobPosting" or "JobPosting" in coerce_to_list(block.get("@type")) or "@graph" in block:
                try:
                    jobs.append(from_jsonld_jobposting(block, base_url, source_name))
                except Exception:
                    continue
    return jobs


def html_links(html: str, base_url: str) -> List[str]:
    links: List[str] = []
    if BeautifulSoup:
        soup = BeautifulSoup(html, "html.parser")
        for a in soup.find_all("a", href=True):
            href = a["href"]
            href = urljoin(base_url, href)
            links.append(href)
    else:
        for m in re.finditer(r"<a\s[^>]*href=[\"']([^\"']+)[\"']", html, re.IGNORECASE):
            href = urljoin(base_url, m.group(1))
            links.append(href)
    return links


# ----------------------------
# Adapter interface & registry
# ----------------------------

class BaseAdapter:
    name: str = "base"
    domains: Sequence[str] = ()

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        raise NotImplementedError

    def parse_list_page(self, html: str, url: str) -> Tuple[List[str], Optional[str]]:
        # Default heuristic: collect in-domain links that look like job detail pages.
        links = html_links(html, url)
        job_like = []
        for href in links:
            if not same_host(href, url):
                continue
            if any(key in href.lower() for key in ("job", "jobs", "stelle", "vacanc", "offer", "position")):
                job_like.append(href)
        # Pagination heuristic
        next_page = None
        for href in links:
            low = href.lower()
            if same_host(href, url) and any(k in low for k in ("page=", "seite=", "pagenumber=", "start=", "offset=")):
                next_page = href
                break
        return list(dict.fromkeys(job_like)), next_page

    def parse_job_page(self, html: str, url: str) -> List[JobPosting]:
        jobs = extract_ld_json_jobpostings(html, url, self.name)
        return jobs or []

    # Utility
    @staticmethod
    def search_url(base: str, params: Dict[str, str]) -> str:
        return f"{base}?{urllib.parse.urlencode(params)}"


# Concrete adapters (lightweight; rely on JSON-LD + heuristics)

class JobsChAdapter(BaseAdapter):
    name = "jobs.ch"
    domains = ("www.jobs.ch", "jobs.ch")

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        # Public search uses 'term' (EN) and 'ort' sometimes; keep simple.
        base = "https://www.jobs.ch/en/vacancies/"
        params = {"term": query}
        if location:
            params["location"] = location
        return [self.search_url(base, params)]


class IndeedChAdapter(BaseAdapter):
    name = "indeed.ch"
    domains = ("ch.indeed.com", "www.indeed.ch", "indeed.ch", "www.indeed.com")

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        base = "https://ch.indeed.com/jobs"
        params = {"q": query}
        if location:
            params["l"] = location
        return [self.search_url(base, params)]


class AurawooAdapter(BaseAdapter):
    name = "aurawoo"
    domains = ("aurawoo.com", "www.aurawoo.com")

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        base = "https://www.aurawoo.com/jobs/"
        # Some portals use on-site search path; keep one general listing
        params = {"s": query}
        return [self.search_url(base, params)]


class SwissMedicsJobsAdapter(BaseAdapter):
    name = "swissmedicsjobs"
    domains = ("swissmedicsjobs.com", "www.swissmedicsjobs.com")

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        base = "https://www.swissmedicsjobs.com/jobs"
        params = {"search": query}
        if location:
            params["location"] = location
        return [self.search_url(base, params)]


class AdeccoChAdapter(BaseAdapter):
    name = "adecco.ch"
    domains = ("www.adecco.ch", "adecco.ch")

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        base = "https://www.adecco.ch/en-us/jobs"
        params = {"k": query}
        if location:
            params["l"] = location
        return [self.search_url(base, params)]


class JobboardFinderAdapter(BaseAdapter):
    name = "jobboardfinder"
    domains = ("www.jobboardfinder.com", "jobboardfinder.com")

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        base = "https://www.jobboardfinder.com/search"
        params = {"q": query}
        if location:
            params["country"] = location
        return [self.search_url(base, params)]


class LinkedInAdapter(BaseAdapter):
    name = "linkedin"
    domains = ("www.linkedin.com", "linkedin.com")

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        raise NotImplementedError(
            "LinkedIn scraping is not supported here. Use official feeds/APIs or partner integrations."
        )


class TieTalentAdapter(BaseAdapter):
    name = "tietalent"
    domains = ("www.tietalent.com", "tietalent.com")

    def build_seed_urls(self, query: str, location: Optional[str]) -> List[str]:
        raise NotImplementedError(
            "TieTalent scraping not provided. Prefer their partner/API or export features where available."
        )


ADAPTERS: Dict[str, BaseAdapter] = {
    "jobs.ch": JobsChAdapter(),
    "indeed": IndeedChAdapter(),
    "aurawoo": AurawooAdapter(),
    "swissmedicsjobs": SwissMedicsJobsAdapter(),
    "adecco": AdeccoChAdapter(),
    "jobboardfinder": JobboardFinderAdapter(),
    "linkedin": LinkedInAdapter(),
    "tietalent": TieTalentAdapter(),
}

# ----------------------------
# Crawler
# ----------------------------

class ScapholfCrawler:
    def __init__(
        self,
        adapters: Sequence[BaseAdapter],
        query: str,
        location: Optional[str],
        max_pages_per_site: int,
        concurrency: int,
        delay: float,
        timeout: float,
        user_agent: str,
        allow_domains: Optional[Sequence[str]] = None,
    ) -> None:
        self.adapters = adapters
        self.query = query
        self.location = location
        self.max_pages_per_site = max_pages_per_site
        self.semaphore = asyncio.Semaphore(max(1, concurrency))
        self.headers = default_headers(user_agent or DEFAULT_UA)
        self.robots = RobotsCache(self.headers["User-Agent"])
        self.limiter = RateLimiter(delay)
        self.timeout = timeout
        self.allow_domains = set(allow_domains or [])
        self.visited: Set[str] = set()
        self.out_queue: asyncio.Queue[JobPosting] = asyncio.Queue()

    def domain_allowed(self, url: str) -> bool:
        if not self.allow_domains:
            return True
        netloc = urlparse(url).netloc
        return any(netloc.endswith(d) for d in self.allow_domains)

    async def crawl_site(self, adapter: BaseAdapter) -> None:
        seeds = adapter.build_seed_urls(self.query, self.location)
        pages_crawled = 0
        queue: deque[str] = deque(seeds)

        while queue and pages_crawled < self.max_pages_per_site:
            url = queue.popleft()
            if url in self.visited or not self.domain_allowed(url):
                continue
            self.visited.add(url)
            async with self.semaphore:
                html = await http_get(url, self.timeout, self.headers, self.robots, self.limiter)
            if not html:
                continue
            pages_crawled += 1

            # If this page is a job page, try to parse directly
            jobs = adapter.parse_job_page(html, url)
            for job in jobs:
                await self.out_queue.put(job)

            # Parse as list page and schedule discovered links
            job_links, next_page = adapter.parse_list_page(html, url)
            for jurl in job_links:
                if jurl not in self.visited:
                    queue.append(jurl)
            if next_page and next_page not in self.visited:
                queue.append(next_page)

    async def run(self) -> List[JobPosting]:
        producers = [self.crawl_site(adp) for adp in self.adapters]
        consumer_task = asyncio.create_task(self._collect_output())
        await asyncio.gather(*producers)
        await self.out_queue.put(None)  # type: ignore
        await consumer_task
        return self._collected

    async def _collect_output(self) -> None:
        self._collected: List[JobPosting] = []
        while True:
            item = await self.out_queue.get()
            if item is None:  # type: ignore
                break
            self._collected.append(item)


# ----------------------------
# Output writers
# ----------------------------

class Writer:
    def __init__(self, jsonl_path: Optional[str], csv_path: Optional[str]) -> None:
        self.jsonl_path = jsonl_path
        self.csv_path = csv_path
        self.csv_fields = [f.name for f in dataclasses.fields(JobPosting) if f.name != "raw"]

        self.jsonl_fp = open(jsonl_path, "wb") if jsonl_path else None
        self.csv_fp = open(csv_path, "w", newline="", encoding="utf-8") if csv_path else None
        self.csv_writer = csv.DictWriter(self.csv_fp, fieldnames=self.csv_fields) if self.csv_fp else None
        if self.csv_writer:
            self.csv_writer.writeheader()

    def write(self, job: JobPosting) -> None:
        record = asdict(job)
        if self.jsonl_fp:
            self.jsonl_fp.write(safe_json_dumps(record) + b"\n")
        if self.csv_writer:
            # Exclude raw for CSV
            csv_row = {k: v for k, v in record.items() if k in self.csv_fields}
            self.csv_writer.writerow(csv_row)

    def close(self) -> None:
        with contextlib.suppress(Exception):
            if self.jsonl_fp:
                self.jsonl_fp.close()
        with contextlib.suppress(Exception):
            if self.csv_fp:
                self.csv_fp.close()


# ----------------------------
# CLI
# ----------------------------

def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(prog="scapholf", description="Polite, extensible job scraper")
    p.add_argument("--sites", nargs="+", required=True,
                   help="Sites to scrape: jobs.ch indeed aurawoo swissmedicsjobs adecco jobboardfinder linkedin tietalent or 'all'")
    p.add_argument("--query", "-q", required=True, help="Search query, e.g., 'nurse'")
    p.add_argument("--location", "-l", default=None, help="Location filter, e.g., 'Zurich'")
    p.add_argument("--max-pages", type=int, default=5, help="Max list/detail pages per site")
    p.add_argument("--concurrency", type=int, default=6, help="Concurrent requests")
    p.add_argument("--delay", type=float, default=1.0, help="Base polite delay per host (seconds)")
    p.add_argument("--timeout", type=float, default=20.0, help="Request timeout (seconds)")
    p.add_argument("--user-agent", default=DEFAULT_UA, help="Custom User-Agent")
    p.add_argument("--out-jsonl", default=None, help="Write JSONL to this path")
    p.add_argument("--out-csv", default=None, help="Write CSV to this path")
    p.add_argument("--domain-allow", nargs="*", default=None, help="Restrict to these domain suffixes")
    return p.parse_args(argv)


def resolve_adapters(site_names: Sequence[str]) -> List[BaseAdapter]:
    if len(site_names) == 1 and site_names[0].lower() == "all":
        # Exclude ToS-heavy stubs from default all
        names = ["jobs.ch", "indeed", "aurawoo", "swissmedicsjobs", "adecco", "jobboardfinder"]
    else:
        names = [s.lower() for s in site_names]
    adapters: List[BaseAdapter] = []
    for n in names:
        key = n
        # map synonyms
        if n in ("jobsch", "jobs", "jobs.ch"):
            key = "jobs.ch"
        if n in ("indeed", "indeed.ch", "indeedch"):
            key = "indeed"
        if key not in ADAPTERS:
            raise SystemExit(f"Unknown site: {n}")
        adapters.append(ADAPTERS[key])
    return adapters


async def main_async(args: argparse.Namespace) -> int:
    adapters = resolve_adapters(args.sites)
    crawler = ScapholfCrawler(
        adapters=adapters,
        query=args.query,
        location=args.location,
        max_pages_per_site=args.max_pages,
        concurrency=args.concurrency,
        delay=args.delay,
        timeout=args.timeout,
        user_agent=args.user_agent,
        allow_domains=args.domain_allow,
    )

    jobs = await crawler.run()

    # Dedupe by (title, company, location, url)
    seen_keys: Set[Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]] = set()
    writer = Writer(args.out_jsonl, args.out_csv)
    kept = 0
    for job in jobs:
        key = (job.title, job.company, job.location, job.url)
        if key in seen_keys:
            continue
        seen_keys.add(key)
        writer.write(job)
        kept += 1
    writer.close()

    sys.stderr.write(f"\n[done] Collected: {len(jobs)} | Unique kept: {kept}\n")
    return 0


def main() -> None:
    args = parse_args()
    try:
        asyncio.run(main_async(args))
    except KeyboardInterrupt:
        sys.stderr.write("\n[abort] Interrupted by user\n")
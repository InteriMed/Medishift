import asyncio
import json
import sys
from scraper import ADAPTERS, ScapholfCrawler, DEFAULT_UA

async def scrape_website(site_name: str, query: str = "nurse", location: str = "Zurich", max_urls: int = 3):
    if site_name not in ADAPTERS:
        print(f"[skip] Unknown site: {site_name}")
        return []
    
    adapter = ADAPTERS[site_name]
    
    try:
        adapter.build_seed_urls(query, location)
    except NotImplementedError as e:
        print(f"[skip] {site_name}: {e}")
        return []
    
    crawler = ScapholfCrawler(
        adapters=[adapter],
        query=query,
        location=location,
        max_pages_per_site=2,
        concurrency=1,
        delay=1.0,
        timeout=20.0,
        user_agent=DEFAULT_UA,
    )
    
    jobs = await crawler.run()
    
    urls = []
    seen_urls = set()
    for job in jobs:
        if job.url and job.url not in seen_urls:
            urls.append(job.url)
            seen_urls.add(job.url)
            if len(urls) >= max_urls:
                break
    
    return urls

async def main():
    with open("database.json", "r") as f:
        database = json.load(f)
    
    results = {}
    
    for site_name in database.keys():
        print(f"[scraping] {site_name}...")
        urls = await scrape_website(site_name)
        results[site_name] = urls
        print(f"[done] {site_name}: {len(urls)} URLs")
    
    print("\n=== RESULTS ===")
    for site_name, urls in results.items():
        print(f"\n{site_name}:")
        for i, url in enumerate(urls, 1):
            print(f"  {i}. {url}")
    
    with open("results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n[output] Results saved to results.json")

if __name__ == "__main__":
    asyncio.run(main())

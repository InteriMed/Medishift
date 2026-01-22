import asyncio
import json
import sys
from scraper import ADAPTERS, ScapholfCrawler, DEFAULT_UA

async def test_pharmacist_jobs_geneva():
    print("=" * 60)
    print("🧪 TEST: Fetching Pharmacist Jobs in Geneva, Switzerland")
    print("=" * 60)
    print()
    
    query = "pharmacist"
    location = "Geneva"
    max_urls = 50
    
    print(f"🔍 Search Query: '{query}'")
    print(f"📍 Location: {location}")
    print(f"📊 Max Jobs: {max_urls}")
    print()
    
    results = {}
    
    for site_name in ADAPTERS.keys():
        if site_name == "linkedin" or site_name == "tietalent":
            print(f"[skip] {site_name}: Not supported (ToS restrictions)")
            continue
            
        print(f"[scraping] {site_name}...")
        try:
            adapter = ADAPTERS[site_name]
            adapter.build_seed_urls(query, location)
        except NotImplementedError as e:
            print(f"[skip] {site_name}: {e}")
            continue
        
        crawler = ScapholfCrawler(
            adapters=[adapter],
            query=query,
            location=location,
            max_pages_per_site=3,
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
                urls.append({
                    "title": job.title,
                    "company": job.company,
                    "location": job.location,
                    "url": job.url,
                    "description": job.description[:200] + "..." if job.description and len(job.description) > 200 else job.description,
                })
                seen_urls.add(job.url)
                if len(urls) >= max_urls:
                    break
        
        results[site_name] = urls
        print(f"[done] {site_name}: {len(urls)} jobs found")
        print()
    
    print("=" * 60)
    print("📋 RESULTS SUMMARY")
    print("=" * 60)
    
    total_jobs = sum(len(jobs) for jobs in results.values())
    print(f"✅ Total jobs found: {total_jobs}")
    print()
    
    if total_jobs > 0:
        print("📝 JOB LISTINGS BY SITE:\n")
        for site_name, jobs in results.items():
            if jobs:
                print(f"\n🏢 {site_name.upper()} ({len(jobs)} jobs):")
                for i, job in enumerate(jobs, 1):
                    print(f"  {i}. {job.get('title', 'N/A')}")
                    print(f"     Company: {job.get('company', 'N/A')}")
                    print(f"     Location: {job.get('location', 'N/A')}")
                    print(f"     URL: {job.get('url', 'N/A')}")
                    print()
    else:
        print("⚠️  No jobs found. This could be due to:")
        print("   - Site structure changes")
        print("   - No jobs matching the criteria")
        print("   - Network issues")
    
    output_file = "test_results_pharmacist_geneva.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Results saved to: {output_file}")
    print("\n✅ Test completed successfully!")
    
    return results

if __name__ == "__main__":
    asyncio.run(test_pharmacist_jobs_geneva())


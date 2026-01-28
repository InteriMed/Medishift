const admin = require('firebase-admin');
const axios = require('axios');
const { JSDOM } = require('jsdom');

const LINKEDIN_JOBS_API = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'DNT': '1',
  'Cache-Control': 'no-cache',
};

function buildSearchUrl(keywords, location, start = 0) {
  const params = new URLSearchParams({
    keywords: keywords || '',
    location: location || '',
    start: start.toString(),
  });
  return `${LINKEDIN_JOBS_API}?${params.toString()}`;
}

function extractJobData(jobCard) {
  try {
    const titleEl = jobCard.querySelector('h3.base-search-card__title');
    const companyEl = jobCard.querySelector('h4.base-search-card__subtitle');
    const locationEl = jobCard.querySelector('span.job-search-card__location');
    const linkEl = jobCard.querySelector('a.base-card__full-link');
    const dateEl = jobCard.querySelector('time.job-search-card__listdate');

    if (!titleEl || !companyEl || !linkEl) {
      return null;
    }

    const jobLink = linkEl.href.split('?')[0];

    return {
      title: titleEl.textContent.trim(),
      company: companyEl.textContent.trim(),
      location: locationEl ? locationEl.textContent.trim() : 'N/A',
      jobLink: jobLink,
      postedDate: dateEl ? dateEl.textContent.trim() : 'N/A',
    };
  } catch (error) {
    console.warn('Failed to extract job data:', error);
    return null;
  }
}

async function scrapeLinkedInJobs(keywords, location, maxJobs = 100) {
  const allJobs = [];
  let start = 0;
  const jobsPerPage = 25;

  console.log(`\n🔍 Starting scrape for: "${keywords}" in "${location}"`);
  console.log(`📊 Target: ${maxJobs} jobs\n`);

  while (allJobs.length < maxJobs) {
    try {
      const url = buildSearchUrl(keywords, location, start);
      console.log(`📡 Fetching page ${Math.floor(start / jobsPerPage) + 1}... (${url})`);

      const response = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: 30000,
      });

      if (response.status !== 200) {
        console.warn(`⚠️  Failed to fetch: Status ${response.status}`);
        break;
      }

      const dom = new JSDOM(response.data);
      const document = dom.window.document;
      const jobCards = document.querySelectorAll('div.base-card');

      if (!jobCards || jobCards.length === 0) {
        console.log('ℹ️  No more job cards found');
        break;
      }

      let foundNewJobs = false;
      for (const card of jobCards) {
        const jobData = extractJobData(card);
        if (jobData) {
          const isDuplicate = allJobs.some(
            job => job.jobLink === jobData.jobLink
          );
          if (!isDuplicate) {
            allJobs.push(jobData);
            foundNewJobs = true;
            console.log(`  ✓ Found: ${jobData.title} at ${jobData.company}`);
          }
        }
        if (allJobs.length >= maxJobs) {
          break;
        }
      }

      if (!foundNewJobs) {
        console.log('ℹ️  No new jobs found, stopping');
        break;
      }

      console.log(`📈 Progress: ${allJobs.length}/${maxJobs} jobs collected\n`);
      start += jobsPerPage;

      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    } catch (error) {
      console.error('❌ Scraping error:', error.message);
      if (error.response && error.response.status === 429) {
        console.warn('⏳ Rate limited, waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        continue;
      }
      break;
    }
  }

  return allJobs.slice(0, maxJobs);
}

async function testPharmacistJobsInGeneva() {
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TEST: Fetching Pharmacist Jobs in Geneva, Switzerland');
    console.log('═══════════════════════════════════════════════════════════\n');

    const keywords = 'pharmacist';
    const location = 'Geneva, Switzerland';
    const maxJobs = 50;

    const jobs = await scrapeLinkedInJobs(keywords, location, maxJobs);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📋 RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`✅ Total jobs found: ${jobs.length}`);
    console.log(`🔍 Search: "${keywords}" in "${location}"`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (jobs.length > 0) {
      console.log('📝 JOB LISTINGS:\n');
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.title}`);
        console.log(`   Company: ${job.company}`);
        console.log(`   Location: ${job.location}`);
        console.log(`   Posted: ${job.postedDate}`);
        console.log(`   Link: ${job.jobLink}`);
        console.log('');
      });

      const uniqueCompanies = [...new Set(jobs.map(job => job.company))];
      console.log(`\n🏢 Unique Companies: ${uniqueCompanies.length}`);
      uniqueCompanies.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company}`);
      });
    } else {
      console.log('⚠️  No jobs found. This could be due to:');
      console.log('   - LinkedIn blocking requests');
      console.log('   - No jobs matching the criteria');
      console.log('   - Network issues');
    }

    return jobs;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

if (require.main === module) {
  testPharmacistJobsInGeneva()
    .then((jobs) => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testPharmacistJobsInGeneva, scrapeLinkedInJobs };


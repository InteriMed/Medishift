const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const axios = require('axios');
const { JSDOM } = require('jsdom');

// Import centralized database instance configured for medishift
const db = require('../../../Medishift/functions/database/dbhift/functions/database/db');
const { FUNCTION_CONFIG } = require('../../../Medishift/functions/config/keysDatabasections/config/keysDatabase');

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
      scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  } catch (error) {
    logger.warn('Failed to extract job data:', error);
    return null;
  }
}

async function scrapeLinkedInJobs(keywords, location, maxJobs = 100) {
  const allJobs = [];
  let start = 0;
  const jobsPerPage = 25;

  while (allJobs.length < maxJobs) {
    try {
      const url = buildSearchUrl(keywords, location, start);
      logger.info(`Scraping LinkedIn jobs: ${url}`);

      const response = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: 30000,
      });

      if (response.status !== 200) {
        logger.warn(`Failed to fetch: Status ${response.status}`);
        break;
      }

      const dom = new JSDOM(response.data);
      const document = dom.window.document;
      const jobCards = document.querySelectorAll('div.base-card');

      if (!jobCards || jobCards.length === 0) {
        logger.info('No more job cards found');
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
          }
        }
        if (allJobs.length >= maxJobs) {
          break;
        }
      }

      if (!foundNewJobs) {
        logger.info('No new jobs found, stopping');
        break;
      }

      logger.info(`Scraped ${allJobs.length} jobs so far...`);
      start += jobsPerPage;

      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    } catch (error) {
      logger.error('Scraping error:', error);
      if (error.response && error.response.status === 429) {
        logger.warn('Rate limited, waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        continue;
      }
      break;
    }
  }

  return allJobs.slice(0, maxJobs);
}

exports.scrapeLinkedInJobs = onCall(
  { ...FUNCTION_CONFIG, timeoutSeconds: 540, memory: '512MiB' },
  async (request) => {
    logger.info('scrapeLinkedInJobs called', { structuredData: true });

    if (!request.auth) {
      logger.error('scrapeLinkedInJobs: Unauthenticated call');
      throw new HttpsError('unauthenticated', 'You must be signed in to scrape jobs');
    }

    const { keywords, location, maxJobs, saveToFirestore } = request.data || {};
    logger.info('scrapeLinkedInJobs: Data received', { keywords, location, maxJobs, saveToFirestore });

    if (!keywords) {
      throw new HttpsError('invalid-argument', 'Keywords are required');
    }

    const maxJobsToScrape = Math.min(maxJobs || 100, 500);
    const saveResults = saveToFirestore !== false;

    try {
      logger.info('Starting LinkedIn job scraping...');
      const jobs = await scrapeLinkedInJobs(keywords, location || '', maxJobsToScrape);

      logger.info(`Scraping completed: ${jobs.length} jobs found`);

      if (saveResults && jobs.length > 0) {
        const batch = db.batch();
        const collectionRef = db.collection('linkedinJobs');

        jobs.forEach((job, index) => {
          const docRef = collectionRef.doc();
          batch.set(docRef, {
            ...job,
            keywords,
            location: location || '',
            scrapedBy: request.auth.uid,
            scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        await batch.commit();
        logger.info(`Saved ${jobs.length} jobs to Firestore`);
      }

      return {
        success: true,
        jobsFound: jobs.length,
        jobs: jobs,
        message: `Successfully scraped ${jobs.length} jobs`,
      };
    } catch (error) {
      logger.error('Error scraping LinkedIn jobs:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', error.message || 'Failed to scrape LinkedIn jobs');
    }
  }
);

exports.getLinkedInJobs = onCall(
  FUNCTION_CONFIG,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in to view jobs');
    }

    const { keywords, location, limit = 50 } = request.data || {};

    try {
      let query = db.collection('linkedinJobs').orderBy('scrapedAt', 'desc');

      if (keywords) {
        query = query.where('keywords', '==', keywords);
      }
      if (location) {
        query = query.where('location', '==', location);
      }

      const snapshot = await query.limit(limit).get();
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        jobs: jobs,
        count: jobs.length,
      };
    } catch (error) {
      logger.error('Error fetching LinkedIn jobs:', error);
      throw new HttpsError('internal', error.message || 'Failed to fetch jobs');
    }
  }
);


const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const config = require('../config');
const { FUNCTION_CONFIG } = require('../config/keysDatabase');

const db = getFirestore();

async function runScheduledScrape(scheduleId, scheduleData) {
  try {
    logger.info(`Running scheduled scrape for schedule ${scheduleId}`, scheduleData);

    const linkedinJobScraper = require('../api/linkedinJobScraper');
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

    const jobs = await scrapeLinkedInJobs(
      scheduleData.keywords || 'pharmacist',
      scheduleData.location || 'Switzerland',
      scheduleData.maxJobs || 100
    );

    if (jobs.length > 0) {
      const batch = db.batch();
      const collectionRef = db.collection('linkedinJobs');

      jobs.forEach((job) => {
        const docRef = collectionRef.doc();
        batch.set(docRef, {
          ...job,
          keywords: scheduleData.keywords,
          location: scheduleData.location || '',
          scrapedBy: 'system',
          scrapedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      logger.info(`Saved ${jobs.length} jobs to Firestore`);
    }

    await db.collection('jobScraperSchedules').doc(scheduleId).update({
      lastRun: admin.firestore.FieldValue.serverTimestamp(),
      lastRunStatus: 'success',
      lastRunJobsFound: jobs.length || 0,
      nextRun: calculateNextRun(scheduleData),
    });

    logger.info(`Scheduled scrape completed: ${jobs.length} jobs found`);

    return {
      success: true,
      jobsFound: jobs.length,
      scheduleId,
    };
  } catch (error) {
    logger.error(`Error running scheduled scrape ${scheduleId}:`, error);

    await db.collection('jobScraperSchedules').doc(scheduleId).update({
      lastRun: admin.firestore.FieldValue.serverTimestamp(),
      lastRunStatus: 'error',
      lastRunError: error.message,
      nextRun: calculateNextRun(scheduleData),
    });

    throw error;
  }
}

function calculateNextRun(scheduleData) {
  if (scheduleData.enabled === false || !scheduleData.scheduleType) {
    return null;
  }

  const now = new Date();
  let nextRun = new Date(now);

  switch (scheduleData.scheduleType) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(scheduleData.hour || 9, scheduleData.minute || 0, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      const targetDay = scheduleData.dayOfWeek !== undefined ? scheduleData.dayOfWeek : 1;
      const currentDay = now.getDay();
      let daysUntilNext = (targetDay - currentDay + 7) % 7;
      if (daysUntilNext === 0) {
        const scheduledTime = new Date(now);
        scheduledTime.setHours(scheduleData.hour || 9, scheduleData.minute || 0, 0, 0);
        if (scheduledTime <= now) {
          daysUntilNext = 7;
        }
      }
      nextRun.setDate(nextRun.getDate() + daysUntilNext);
      nextRun.setHours(scheduleData.hour || 9, scheduleData.minute || 0, 0, 0);
      break;

    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(scheduleData.dayOfMonth || 1);
      nextRun.setHours(scheduleData.hour || 9, scheduleData.minute || 0, 0, 0);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;

    case 'custom':
      if (scheduleData.nextRun) {
        if (scheduleData.nextRun.toDate) {
          return scheduleData.nextRun;
        }
        return admin.firestore.Timestamp.fromDate(new Date(scheduleData.nextRun));
      }
      return null;

    default:
      return null;
  }

  return admin.firestore.Timestamp.fromDate(nextRun);
}

exports.createScraperSchedule = onCall(
  FUNCTION_CONFIG,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in');
    }

    const {
      keywords,
      location,
      maxJobs,
      scheduleType,
      hour,
      minute,
      dayOfWeek,
      dayOfMonth,
      enabled,
      nextRun,
    } = request.data || {};

    if (!keywords || !scheduleType) {
      throw new HttpsError('invalid-argument', 'Keywords and scheduleType are required');
    }

    try {
      const scheduleData = {
        keywords,
        location: location || 'Switzerland',
        maxJobs: maxJobs || 100,
        scheduleType,
        hour: hour || 9,
        minute: minute || 0,
        dayOfWeek,
        dayOfMonth,
        enabled: enabled !== false,
        nextRun: nextRun ? admin.firestore.Timestamp.fromDate(new Date(nextRun)) : calculateNextRun({ scheduleType, hour, minute, dayOfWeek, dayOfMonth, enabled: true }),
        createdBy: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastRun: null,
        lastRunStatus: null,
        lastRunJobsFound: null,
        lastRunError: null,
      };

      const docRef = await db.collection('jobScraperSchedules').add(scheduleData);

      logger.info(`Created scraper schedule ${docRef.id}`);

      return {
        success: true,
        scheduleId: docRef.id,
        schedule: { id: docRef.id, ...scheduleData },
      };
    } catch (error) {
      logger.error('Error creating scraper schedule:', error);
      throw new HttpsError('internal', error.message || 'Failed to create schedule');
    }
  }
);

exports.updateScraperSchedule = onCall(
  FUNCTION_CONFIG,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in');
    }

    const { scheduleId, ...updates } = request.data || {};

    if (!scheduleId) {
      throw new HttpsError('invalid-argument', 'scheduleId is required');
    }

    try {
      const scheduleRef = db.collection('jobScraperSchedules').doc(scheduleId);
      const scheduleDoc = await scheduleRef.get();

      if (!scheduleDoc.exists) {
        throw new HttpsError('not-found', 'Schedule not found');
      }

      const updateData = {
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (updates.scheduleType || updates.hour || updates.minute || updates.dayOfWeek || updates.dayOfMonth || updates.enabled !== undefined) {
        const currentSchedule = scheduleDoc.data();
        updateData.nextRun = calculateNextRun({
          ...currentSchedule,
          ...updates,
        });
      }

      await scheduleRef.update(updateData);

      logger.info(`Updated scraper schedule ${scheduleId}`);

      return {
        success: true,
        scheduleId,
      };
    } catch (error) {
      logger.error('Error updating scraper schedule:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', error.message || 'Failed to update schedule');
    }
  }
);

exports.deleteScraperSchedule = onCall(
  FUNCTION_CONFIG,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in');
    }

    const { scheduleId } = request.data || {};

    if (!scheduleId) {
      throw new HttpsError('invalid-argument', 'scheduleId is required');
    }

    try {
      await db.collection('jobScraperSchedules').doc(scheduleId).delete();

      logger.info(`Deleted scraper schedule ${scheduleId}`);

      return {
        success: true,
        scheduleId,
      };
    } catch (error) {
      logger.error('Error deleting scraper schedule:', error);
      throw new HttpsError('internal', error.message || 'Failed to delete schedule');
    }
  }
);

exports.getScraperSchedules = onCall(
  FUNCTION_CONFIG,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in');
    }

    try {
      const snapshot = await db.collection('jobScraperSchedules')
        .orderBy('createdAt', 'desc')
        .get();

      const schedules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        schedules,
      };
    } catch (error) {
      logger.error('Error fetching scraper schedules:', error);
      throw new HttpsError('internal', error.message || 'Failed to fetch schedules');
    }
  }
);

exports.getScraperStatus = onCall(
  FUNCTION_CONFIG,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'You must be signed in');
    }

    try {
      const schedulesSnapshot = await db.collection('jobScraperSchedules')
        .where('enabled', '==', true)
        .get();

      const activeSchedules = schedulesSnapshot.size;
      const schedules = schedulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const jobsSnapshot = await db.collection('linkedinJobs')
        .orderBy('scrapedAt', 'desc')
        .limit(1)
        .get();

      let lastScrapeTime = null;
      let totalJobs = 0;

      if (!jobsSnapshot.empty) {
        lastScrapeTime = jobsSnapshot.docs[0].data().scrapedAt;
      }

      const totalJobsSnapshot = await db.collection('linkedinJobs').count().get();
      totalJobs = totalJobsSnapshot.data().count;

      return {
        success: true,
        activeSchedules,
        schedules,
        lastScrapeTime,
        totalJobs,
      };
    } catch (error) {
      logger.error('Error fetching scraper status:', error);
      throw new HttpsError('internal', error.message || 'Failed to fetch status');
    }
  }
);

exports.runScheduledScraper = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: config.region,
    timeZone: 'Europe/Zurich',
  },
  async (event) => {
    logger.info('Checking for scheduled scraper runs...');

    try {
      const now = admin.firestore.Timestamp.now();
      const fiveMinutesFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + 5 * 60 * 1000);

      const schedulesSnapshot = await db.collection('jobScraperSchedules')
        .where('enabled', '==', true)
        .where('nextRun', '<=', fiveMinutesFromNow)
        .get();

      if (schedulesSnapshot.empty) {
        logger.info('No scheduled scrapes due');
        return null;
      }

      logger.info(`Found ${schedulesSnapshot.size} scheduled scrape(s) due`);

      const scrapePromises = schedulesSnapshot.docs.map(async (doc) => {
        const scheduleData = doc.data();
        return runScheduledScrape(doc.id, scheduleData);
      });

      const results = await Promise.allSettled(scrapePromises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          logger.info(`Schedule ${schedulesSnapshot.docs[index].id} completed successfully`);
        } else {
          logger.error(`Schedule ${schedulesSnapshot.docs[index].id} failed:`, result.reason);
        }
      });

      return {
        processed: schedulesSnapshot.size,
        results: results.map((r, i) => ({
          scheduleId: schedulesSnapshot.docs[i].id,
          status: r.status,
          value: r.status === 'fulfilled' ? r.value : null,
          error: r.status === 'rejected' ? r.reason.message : null,
        })),
      };
    } catch (error) {
      logger.error('Error in scheduled scraper check:', error);
      throw error;
    }
  }
);


# Job Scraper Test Files

## Test Files

### 1. `test_scraper.js` (Node.js)
Tests the LinkedIn job scraper for pharmacist jobs in Geneva, Switzerland.

**Usage:**
```bash
cd functions/job_scraper
node test_scraper.js
```

**What it does:**
- Searches for "pharmacist" jobs in "Geneva, Switzerland"
- Fetches up to 50 jobs
- Displays results with job titles, companies, locations, and links
- Shows summary statistics

### 2. `test_scraper_python.py` (Python)
Tests the multi-site scraper (jobs.ch, indeed, etc.) for pharmacist jobs in Geneva.

**Usage:**
```bash
cd functions/job_scraper
python test_scraper_python.py
```

**What it does:**
- Searches multiple job sites (jobs.ch, indeed, aurawoo, etc.)
- Searches for "pharmacist" jobs in "Geneva"
- Fetches jobs from all supported sites
- Saves results to `test_results_pharmacist_geneva.json`

## Test via Firebase Function

You can also test via the Firebase function:

```javascript
const functions = getFunctions(firebaseApp, 'europe-west6');
const scrapeLinkedInJobs = httpsCallable(functions, 'scrapeLinkedInJobs');

const result = await scrapeLinkedInJobs({
  keywords: 'pharmacist',
  location: 'Geneva, Switzerland',
  maxJobs: 50,
  saveToFirestore: true,
});

console.log('Jobs found:', result.data.jobsFound);
console.log('Jobs:', result.data.jobs);
```

## Expected Output

The test should output:
- Total number of jobs found
- List of jobs with:
  - Job title
  - Company name
  - Location
  - Posted date
  - Job link
- Summary statistics (unique companies, etc.)

## Notes

- The scraper respects rate limits and includes delays between requests
- LinkedIn may block requests if too many are made in a short time
- Results may vary based on current job postings
- The Python scraper tests multiple sites, while the Node.js version focuses on LinkedIn


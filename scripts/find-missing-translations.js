const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(__dirname, '../public/locales/en');

// Namespace mapping from i18n.js
const nsMapping = {
  home: 'pages/home',
  blog: 'pages/blog',
  about: 'pages/about',
  faq: 'pages/faq',
  facilities: 'pages/facilities',
  professionals: 'pages/professionals',
  blogArticles: 'pages/blog',
  contact: 'pages/contact',
  privacy: 'legal/privacy',
  terms: 'legal/terms',
  common: 'common',
  dashboard: 'dashboard/dashboard',
  calendar: 'dashboard/calendar',
  dashboardPersonal: 'dashboard/personalDashboard',
  dashboardProfile: 'dashboard/profile',
  messages: 'dashboard/messages',
  marketplace: 'dashboard/marketplace',
  organization: 'dashboard/organization',
  payroll: 'dashboard/payroll',
  contracts: 'dashboard/contracts',
  dropdowns: 'dropdowns',
  validation: 'validation',
  auth: 'auth',
  'pages/faq': 'pages/faq',
  sitemap: 'pages/sitemap'
};

const defaultNS = 'common';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'locales' && file !== 'node_modules') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

function getTranslationKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const keys = [];

  // Regex for useTranslation (to find default namespace for the file)
  // const { t } = useTranslation('ns') or useTranslation(['ns1', 'ns2'])
  // Support useTranslation('ns') and useTranslation(['ns'])
  const useTranslationRegex = /useTranslation\(\s*(?:\[\s*)?['"]([^'"]+)['"](?:,?\s*['"]([^'"]+)['"])*\s*(?:\]\s*)?\)/;
  const match = content.match(useTranslationRegex);
  let fileNS = defaultNS;
  if (match && match[1]) {
    fileNS = match[1];
  }

  // Regex for t('key') or t("key")
  const tRegex = /[^a-zA-Z]t\(['"]([^'"]+)['"]/g;
  let tMatch;
  while ((tMatch = tRegex.exec(content)) !== null) {
    keys.push({ key: tMatch[1], ns: fileNS });
  }

  // Regex for i18nKey="key"
  const i18nKeyRegex = /i18nKey=['"]([^'"]+)['"]/g;
  let i18nMatch;
  while ((i18nMatch = i18nKeyRegex.exec(content)) !== null) {
    keys.push({ key: i18nMatch[1], ns: fileNS });
  }

  return keys;
}

function loadLocaleFile(ns) {
  const mappedPath = nsMapping[ns] || ns;
  const filePath = path.join(LOCALES_DIR, `${mappedPath}.json`);

  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.warn(`Could not load locale file for ns: ${ns} at ${filePath}`);
  }
  return null;
}

function checkKeys() {
  const files = getAllFiles(SRC_DIR);
  const missingKeys = {};

  files.forEach(file => {
    const extractedKeys = getTranslationKeys(file);
    extractedKeys.forEach(({ key, ns }) => {
      let finalNS = ns;
      let finalKey = key;

      // Handle namespace in key "ns:key"
      if (key.includes(':')) {
        const parts = key.split(':');
        finalNS = parts[0];
        finalKey = parts.slice(1).join(':');
      }

      const localeData = loadLocaleFile(finalNS);

      if (!localeData) {
        // If file doesn't exist, we assume the whole file/ns is missing
        if (!missingKeys[finalNS]) missingKeys[finalNS] = [];
        if (!missingKeys[finalNS].includes(finalKey)) missingKeys[finalNS].push(finalKey);
      } else {
        // Check nested keys access, e.g. "section.title"
        const parts = finalKey.split('.');
        let current = localeData;
        let exists = true;
        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            exists = false;
            break;
          }
        }

        if (!exists) {
          if (!missingKeys[finalNS]) missingKeys[finalNS] = [];
          if (!missingKeys[finalNS].includes(finalKey)) missingKeys[finalNS].push(finalKey);
        }
      }
    });
  });

  return missingKeys;
}

const missing = checkKeys();
console.log(JSON.stringify(missing, null, 2));

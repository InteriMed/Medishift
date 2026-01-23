const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, 'public', 'locales');
const SRC_DIR = path.join(__dirname, 'src');
const LANGUAGES = ['en', 'fr', 'de', 'it'];
const NS_MAPPING = {
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
  admin: 'dashboard/admin',
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

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (!filePath.includes('node_modules') && !filePath.includes('.git')) {
        getAllFiles(filePath, arrayOfFiles);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      arrayOfFiles.push(filePath);
    }
  });
  return arrayOfFiles;
}

function extractTranslationKeys(content) {
  const keys = new Set();
  
  const patterns = [
    /t\(['"`]([^'"`]+)['"`]/g,
    /t\(['"`]([^'"`]+)['"`]\s*,\s*['"`]/g,
    /i18n\.t\(['"`]([^'"`]+)['"`]/g,
    /i18next\.t\(['"`]([^'"`]+)['"`]/g,
    /\.t\(['"`]([^'"`]+)['"`]/g,
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      if (key && 
          !key.includes('{{') && 
          !key.includes('${') &&
          !key.startsWith('http') &&
          key.length > 0) {
        keys.add(key);
      }
    }
  });
  
  return Array.from(keys);
}

function loadLocaleFile(lang, namespace) {
  const filePath = path.join(LOCALES_DIR, lang, `${namespace}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`Error loading ${filePath}:`, e.message);
      return null;
    }
  }
  return null;
}

function getAllKeysFromObject(obj, prefix = '') {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeysFromObject(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getNestedValue(obj, keyPath) {
  const keys = keyPath.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  return value;
}

function parseTranslationKey(key) {
  if (key.includes(':')) {
    const colonIndex = key.indexOf(':');
    const namespace = key.substring(0, colonIndex).trim();
    const keyPath = key.substring(colonIndex + 1).trim();
    return {
      namespace: namespace,
      key: keyPath
    };
  }
  return {
    namespace: 'common',
    key: key
  };
}

function findHardcodedStrings(content) {
  const hardcoded = [];
  const lines = content.split('\n');
  
  const suspiciousPatterns = [
    /(?:title|label|placeholder|text|message|error|success|warning|info|description|button|submit|cancel|save|delete|edit|add|remove|close|open|confirm|reject|approve|decline|accept|logout|login|register|forgot|reset|change|profile|settings|help|support|contact|about|terms|privacy|language|theme|notifications|messages|dashboard|home|back|next|continue|finish|required|optional|select|search|filter|sort|show|hide|view|preview|download|upload|expand|collapse|enable|disable|activate|deactivate)\s*[:=]\s*['"`]([A-Z][^'"`]{3,})['"`]/gi,
    />\s*([A-Z][a-zA-Z\s]{3,})\s*</g,
    /['"`]([A-Z][a-zA-Z\s]{5,})['"`]/g
  ];
  
  lines.forEach((line, index) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    
    suspiciousPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        const text = match[1] || match[0];
        if (text && 
            !text.includes('http') && 
            !text.includes('className') && 
            !text.includes('id=') &&
            !text.includes('src=') &&
            !text.match(/^[A-Z][a-z]+[A-Z]/) &&
            text.length > 3 &&
            !text.includes('{{') &&
            !text.includes('${')) {
          hardcoded.push({
            line: index + 1,
            text: text.substring(0, 100),
            context: line.trim().substring(0, 150)
          });
        }
      }
    });
  });
  
  return hardcoded;
}

function main() {
  console.log('🔍 Starting translation inspection...\n');
  
  const allLocaleKeys = {};
  const usedKeys = new Set();
  const missingKeys = {};
  const legacyKeys = {};
  const hardcodedStrings = {};
  
  console.log('📚 Loading locale files...');
  LANGUAGES.forEach(lang => {
    allLocaleKeys[lang] = {};
    Object.entries(NS_MAPPING).forEach(([ns, filePath]) => {
      const data = loadLocaleFile(lang, filePath);
      if (data) {
        allLocaleKeys[lang][ns] = data;
      }
    });
    
    const commonFile = loadLocaleFile(lang, 'common');
    if (commonFile) {
      allLocaleKeys[lang]['common'] = commonFile;
    }
  });
  
  console.log('🔎 Scanning source files for translation keys...');
  const sourceFiles = getAllFiles(SRC_DIR);
  console.log(`Found ${sourceFiles.length} source files\n`);
  
  sourceFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const keys = extractTranslationKeys(content);
      keys.forEach(key => usedKeys.add(key));
      
      const hardcoded = findHardcodedStrings(content);
      if (hardcoded.length > 0) {
        const relativePath = path.relative(SRC_DIR, filePath);
        hardcodedStrings[relativePath] = hardcoded;
      }
    } catch (e) {
      console.warn(`Error reading ${filePath}:`, e.message);
    }
  });
  
  console.log(`Found ${usedKeys.size} unique translation keys in code\n`);
  
  console.log('🔍 Checking for missing keys...');
  usedKeys.forEach(usedKey => {
    const { namespace, key } = parseTranslationKey(usedKey);
    const mappedPath = NS_MAPPING[namespace] || namespace;
    
    LANGUAGES.forEach(lang => {
      let localeData = allLocaleKeys[lang][namespace];
      
      if (!localeData) {
        const filePath = path.join(LOCALES_DIR, lang, `${mappedPath}.json`);
        if (fs.existsSync(filePath)) {
          try {
            localeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            allLocaleKeys[lang][namespace] = localeData;
          } catch (e) {
            console.warn(`Error loading ${filePath}:`, e.message);
          }
        }
      }
      
      if (!localeData) {
        if (!missingKeys[lang]) missingKeys[lang] = {};
        if (!missingKeys[lang][namespace]) missingKeys[lang][namespace] = [];
        missingKeys[lang][namespace].push(key);
      } else {
        const value = getNestedValue(localeData, key);
        if (value === undefined) {
          if (!missingKeys[lang]) missingKeys[lang] = {};
          if (!missingKeys[lang][namespace]) missingKeys[lang][namespace] = [];
          missingKeys[lang][namespace].push(key);
        }
      }
    });
  });
  
  console.log('🔍 Checking for legacy keys...');
  LANGUAGES.forEach(lang => {
    Object.keys(allLocaleKeys[lang]).forEach(namespace => {
      const localeData = allLocaleKeys[lang][namespace];
      const allKeysInFile = getAllKeysFromObject(localeData);
      
      allKeysInFile.forEach(fullKey => {
        let found = false;
        usedKeys.forEach(usedKey => {
          const { namespace: usedNs, key: usedKeyPath } = parseTranslationKey(usedKey);
          if (usedNs === namespace && usedKeyPath === fullKey) {
            found = true;
          }
        });
        
        if (!found) {
          if (!legacyKeys[lang]) legacyKeys[lang] = {};
          if (!legacyKeys[lang][namespace]) legacyKeys[lang][namespace] = [];
          legacyKeys[lang][namespace].push(fullKey);
        }
      });
    });
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 INSPECTION RESULTS');
  console.log('='.repeat(80) + '\n');
  
  console.log('❌ MISSING KEYS:\n');
  let hasMissing = false;
  const missingByLang = {};
  Object.keys(missingKeys).forEach(lang => {
    let langTotal = 0;
    Object.keys(missingKeys[lang]).forEach(ns => {
      if (missingKeys[lang][ns].length > 0) {
        hasMissing = true;
        langTotal += missingKeys[lang][ns].length;
        if (!missingByLang[lang]) missingByLang[lang] = {};
        missingByLang[lang][ns] = missingKeys[lang][ns].length;
      }
    });
    if (langTotal > 0) {
      console.log(`  ${lang}: ${langTotal} missing keys`);
    }
  });
  
  if (hasMissing) {
    console.log('\n  Breakdown by namespace (showing top 10 per language):');
    Object.keys(missingKeys).sort().forEach(lang => {
      const nsEntries = Object.entries(missingKeys[lang])
        .filter(([ns, keys]) => keys.length > 0)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 10);
      if (nsEntries.length > 0) {
        console.log(`\n    ${lang}:`);
        nsEntries.forEach(([ns, keys]) => {
          console.log(`      ${ns}: ${keys.length} missing keys`);
        });
      }
    });
    console.log('\n  (Full list available in translation-missing-keys.csv)\n');
  } else {
    console.log('  ✅ No missing keys found!\n');
  }
  
  console.log('🗑️  LEGACY KEYS (not used in code):\n');
  let hasLegacy = false;
  const legacyByLang = {};
  Object.keys(legacyKeys).forEach(lang => {
    let langTotal = 0;
    Object.keys(legacyKeys[lang]).forEach(ns => {
      if (legacyKeys[lang][ns].length > 0) {
        hasLegacy = true;
        langTotal += legacyKeys[lang][ns].length;
        if (!legacyByLang[lang]) legacyByLang[lang] = {};
        legacyByLang[lang][ns] = legacyKeys[lang][ns].length;
      }
    });
    if (langTotal > 0) {
      console.log(`  ${lang}: ${langTotal} legacy keys`);
    }
  });
  
  if (hasLegacy) {
    console.log('\n  Top namespaces with legacy keys:');
    Object.keys(legacyKeys).sort().forEach(lang => {
      const nsEntries = Object.entries(legacyKeys[lang])
        .filter(([ns, keys]) => keys.length > 0)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 5);
      if (nsEntries.length > 0) {
        console.log(`\n    ${lang}:`);
        nsEntries.forEach(([ns, keys]) => {
          console.log(`      ${ns}: ${keys.length} legacy keys`);
        });
      }
    });
    console.log('\n  (Full list available in translation-inspection-report.json)\n');
  } else {
    console.log('  ✅ No legacy keys found!\n');
  }
  
  console.log('⚠️  POTENTIALLY HARDCODED STRINGS:\n');
  const hardcodedFiles = Object.keys(hardcodedStrings);
  if (hardcodedFiles.length > 0) {
    const totalHardcoded = Object.values(hardcodedStrings).reduce((sum, arr) => sum + arr.length, 0);
    console.log(`  Found ${totalHardcoded} potential hardcoded strings across ${hardcodedFiles.length} files\n`);
    console.log('  Top 20 files with most hardcoded strings:');
    const sortedFiles = hardcodedFiles
      .map(file => ({ file, count: hardcodedStrings[file].length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    sortedFiles.forEach(({ file, count }) => {
      console.log(`    ${file}: ${count} occurrences`);
      hardcodedStrings[file].slice(0, 3).forEach(item => {
        console.log(`      Line ${item.line}: "${item.text.substring(0, 60)}${item.text.length > 60 ? '...' : ''}"`);
      });
      if (hardcodedStrings[file].length > 3) {
        console.log(`      ... and ${hardcodedStrings[file].length - 3} more`);
      }
      console.log();
    });
    if (hardcodedFiles.length > 20) {
      console.log(`  ... and ${hardcodedFiles.length - 20} more files with hardcoded strings\n`);
    }
  } else {
    console.log('  ✅ No hardcoded strings detected!\n');
  }
  
  console.log('='.repeat(80));
  console.log('✅ Inspection complete!');
  console.log('='.repeat(80));
  
  const summary = {
    totalUsedKeys: usedKeys.size,
    missingKeysCount: Object.values(missingKeys).reduce((sum, lang) => 
      sum + Object.values(lang).reduce((s, keys) => s + keys.length, 0), 0),
    legacyKeysCount: Object.values(legacyKeys).reduce((sum, lang) => 
      sum + Object.values(lang).reduce((s, keys) => s + keys.length, 0), 0),
    hardcodedFilesCount: hardcodedFiles.length
  };
  
  console.log('\n📈 SUMMARY:');
  console.log(`  Total translation keys used: ${summary.totalUsedKeys}`);
  console.log(`  Missing keys: ${summary.missingKeysCount}`);
  console.log(`  Legacy keys: ${summary.legacyKeysCount}`);
  console.log(`  Files with hardcoded strings: ${summary.hardcodedFilesCount}`);
  
  const reportData = {
    summary,
    missingKeys,
    legacyKeys,
    hardcodedStrings,
    usedKeys: Array.from(usedKeys).sort(),
    timestamp: new Date().toISOString()
  };
  
  const reportPath = path.join(__dirname, 'translation-inspection-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  const csvReportPath = path.join(__dirname, 'translation-missing-keys.csv');
  let csvContent = 'Language,Namespace,Key\n';
  Object.keys(missingKeys).sort().forEach(lang => {
    Object.keys(missingKeys[lang]).sort().forEach(ns => {
      missingKeys[lang][ns].forEach(key => {
        csvContent += `${lang},${ns},${key}\n`;
      });
    });
  });
  fs.writeFileSync(csvReportPath, csvContent, 'utf8');
  console.log(`📊 Missing keys CSV saved to: ${csvReportPath}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };


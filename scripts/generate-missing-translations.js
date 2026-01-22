const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');
const LOCALES_DIR = path.join(__dirname, '../public/locales');
const LANGUAGES = ['en', 'fr', 'de', 'it'];

// Reuse logic to find keys
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
    // Support useTranslation('ns') and useTranslation(['ns'])
    const useTranslationRegex = /useTranslation\(\s*(?:\[\s*)?['"]([^'"]+)['"](?:,?\s*['"]([^'"]+)['"])*\s*(?:\]\s*)?\)/;
    const match = content.match(useTranslationRegex);
    let fileNS = defaultNS;
    if (match && match[1]) {
        fileNS = match[1];
    }

    const tRegex = /[^a-zA-Z]t\(['"]([^'"]+)['"]/g;
    let tMatch;
    while ((tMatch = tRegex.exec(content)) !== null) {
        keys.push({ key: tMatch[1], ns: fileNS });
    }

    const i18nKeyRegex = /i18nKey=['"]([^'"]+)['"]/g;
    let i18nMatch;
    while ((i18nMatch = i18nKeyRegex.exec(content)) !== null) {
        keys.push({ key: i18nMatch[1], ns: fileNS });
    }

    return keys;
}

function loadLocaleFile(lang, ns) {
    const mappedPath = nsMapping[ns] || ns;
    const filePath = path.join(LOCALES_DIR, lang, `${mappedPath}.json`);

    try {
        if (fs.existsSync(filePath)) {
            return { data: JSON.parse(fs.readFileSync(filePath, 'utf8')), path: filePath };
        }
    } catch (e) {
        console.warn(`Could not load locale file for lang: ${lang}, ns: ${ns}`);
    }
    // Return path even if file doesn't exist, so we can create it
    return { data: {}, path: filePath };
}

function saveLocaleFile(filePath, data) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function formatKeyToText(key) {
    // auth.signup.createAccount -> Create Account
    const lastPart = key.split('.').pop();
    return lastPart
        .replace(/([A-Z])/g, ' $1') // insert space before capital letters
        .replace(/^./, str => str.toUpperCase()) // capitalize first letter
        .trim();
}

function updateKeys() {
    const files = getAllFiles(SRC_DIR);
    // Collect all keys first
    const allKeys = {}; // ns -> Set(keys)

    files.forEach(file => {
        const extractedKeys = getTranslationKeys(file);
        extractedKeys.forEach(({ key, ns }) => {
            let finalNS = ns;
            let finalKey = key;
            if (key.includes(':')) {
                const parts = key.split(':');
                finalNS = parts[0];
                finalKey = parts.slice(1).join(':');
            }
            if (!allKeys[finalNS]) allKeys[finalNS] = new Set();
            allKeys[finalNS].add(finalKey);
        });
    });

    // For each language and namespace, update the file
    LANGUAGES.forEach(lang => {
        for (const ns in allKeys) {
            console.log(`Processing ${lang}/${ns}`);
            if (!nsMapping[ns] && ns !== 'common') {
                // Skip unknown namespaces if they look suspicious or are variables
                // But 'common' is default.
                // If ns is not in map, it might map to itself in existing logic, so we proceed but with caution
                // However, previous script showed things like "pages.home" which is mapped to "pages/home" in logic?
                // No, "pages.home" isn't in nsMapping.
            }

            const { data, path: filePath } = loadLocaleFile(lang, ns);
            let modified = false;

            allKeys[ns].forEach(key => {
                const parts = key.split('.');
                let current = data;
                let exists = true;

                // Navigate or create structure
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    if (i === parts.length - 1) {
                        // Last part, check if value exists
                        if (current[part] === undefined) {
                            current[part] = formatKeyToText(part); // Use automated text
                            modified = true;
                        }
                    } else {
                        if (current[part] === undefined) {
                            current[part] = {};
                            modified = true;
                        }
                        if (typeof current[part] !== 'object') {
                            // Conflict: expected object but found string
                            // This happens if 'foo' is a key but we need 'foo.bar'
                            // We can't easily fix this without breaking existing translation.
                            // Warn and skip?
                            console.warn(`Conflict for key ${key} in ${lang}/${ns}. ${part} IS NOT an object.`);
                            exists = false;
                            break;
                        }
                        current = current[part];
                    }
                }
            });

            if (modified) {
                saveLocaleFile(filePath, data);
                console.log(`Updated ${lang}/${ns}`);
            }
        }
    });
}

updateKeys();

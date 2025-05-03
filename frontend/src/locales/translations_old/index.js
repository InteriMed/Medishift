// Import English translations
import authEn from './authentification/en.json';
import dashboardEn from './dashboard/en.json';
import websiteEn from './website/en.json';
import listsEn from './lists/en.json';

// Import French translations
import authFr from './authentification/fr.json';
import dashboardFr from './dashboard/fr.json';
import websiteFr from './website/fr.json';
import listsFr from './lists/fr.json';

// Create input_lists reference for backward compatibility
const inputLists = {
  countries: listsEn.countries,
  cantons: listsEn.cantons,
  certifications: listsEn.certifications,
  software: listsEn.software
};

// Export translations by language
const translations = {
  en: {
    auth: authEn.auth,
    common: authEn.common,
    dashboard: dashboardEn.dashboard,
    website: websiteEn,
    lists: listsEn,
    input_lists: inputLists
  },
  fr: {
    auth: authFr.auth,
    common: authFr.common,
    dashboard: dashboardFr.dashboard,
    website: websiteFr,
    lists: listsFr,
    input_lists: inputLists // Note: Using English as fallback for component compatibility
  }
};

export { inputLists };
export default translations; 
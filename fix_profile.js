const fs = require('fs');
const path = 'src/dashboard/pages/profile/Profile.js';
let content = fs.readFileSync(path, 'utf8');

// Fix the missing parenthesis in line 417 (approximately)
// Target: }, [activeTab, formData, profileConfig, t]);
// Replacement: }, [activeTab, formData, profileConfig, t]);

content = content.replace(/ \}, \[activeTab, formData, profileConfig, t\];/, ' }, [activeTab, formData, profileConfig, t]);');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed validateCurrentTabData closure');

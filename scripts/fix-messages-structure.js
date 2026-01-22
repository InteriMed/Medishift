const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../public/locales');
const LANGUAGES = ['en', 'fr', 'de', 'it'];
const MESSAGES_FILE = 'dashboard/messages.json';

LANGUAGES.forEach(lang => {
    const filePath = path.join(LOCALES_DIR, lang, MESSAGES_FILE);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        let modified = false;

        // Fix selectConversation
        if (typeof data.selectConversation === 'string') {
            const title = data.selectConversation;
            const subtitle = data.selectConversationPrompt || "Choose a conversation from the list to view messages";

            data.selectConversation = {
                title: title,
                subtitle: subtitle
            };

            delete data.selectConversationPrompt;
            modified = true;
            console.log(`Refactored selectConversation in ${lang}`);
        }

        if (modified) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
        }
    }
});

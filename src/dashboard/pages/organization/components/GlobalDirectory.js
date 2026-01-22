import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiMapPin, FiPhone, FiMail } from 'react-icons/fi';

const GlobalDirectory = () => {
    const { t } = useTranslation(['organization']);
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">{t('organization:directory.title', 'Global Enterprise Directory')}</h2>
                <div className="relative max-w-xl">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('organization:directory.searchPlaceholder', "Find a nurse, doctor, or staff member across all locations...")}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
                <FiUsersIllustration className="w-24 h-24 mx-auto mb-4 opacity-20" />
                <p>{t('organization:directory.emptyState', 'Enter a name or role to search across the entire organization.')}</p>
                <p className="text-xs mt-2 opacity-60">Connected to 50+ locations.</p>
            </div>
        </div>
    );
};

const FiUsersIllustration = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

export default GlobalDirectory;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiUserPlus, FiCheckSquare, FiSend } from 'react-icons/fi';

const ATSScorecard = () => {
    const { t } = useTranslation(['organization']);

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4">{t('organization:ats.title', 'Standardized Hiring & ATS')}</h2>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="border border-border rounded-lg p-5 hover:bg-muted/10 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                            <FiCheckSquare className="w-6 h-6" />
                        </div>
                        <h3 className="font-medium text-lg mb-2">Interview Scorecards</h3>
                        <p className="text-sm text-muted-foreground">
                            Create and manage standardized interview templates for all facilities to ensure consistent hiring quality.
                        </p>
                    </div>

                    <div className="border border-border rounded-lg p-5 hover:bg-muted/10 transition-colors cursor-pointer">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                            <FiSend className="w-6 h-6" />
                        </div>
                        <h3 className="font-medium text-lg mb-2">Automated Offer Letters</h3>
                        <p className="text-sm text-muted-foreground">
                            Configure offer letter templates with dynamic fields for instant generation and sending.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ATSScorecard;

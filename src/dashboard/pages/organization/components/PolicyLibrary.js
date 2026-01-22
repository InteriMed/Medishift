import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiFileText, FiUploadCloud, FiClock } from 'react-icons/fi';

const PolicyLibrary = () => {
    const { t } = useTranslation(['organization']);

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-lg font-semibold">{t('organization:policy.title', 'Standardized Policy Library')}</h2>
                        <p className="text-sm text-muted-foreground">Manage and distribute policies to all 50+ facilities instantly.</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                        <FiUploadCloud />
                        <span>Upload New Policy</span>
                    </button>
                </div>

                <div className="space-y-3">
                    {/* Mock Policy Items */}
                    {[
                        { name: "2025 Employee Handbook.pdf", date: "Updated 2 days ago", status: "Active" },
                        { name: "SOP - Night Shift Protocols.pdf", date: "Updated 1 week ago", status: "Review" },
                        { name: "Emergency Response Plan.pdf", date: "Updated 1 month ago", status: "Active" }
                    ].map((doc, i) => (
                        <div key={i} className="flex items-center p-4 bg-background border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer group">
                            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center mr-4">
                                <FiFileText className="text-red-500 w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{doc.name}</h4>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                    <FiClock className="mr-1" /> {doc.date}
                                </div>
                            </div>
                            <div>
                                <span className={`px-2 py-1 rounded text-xs ${doc.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {doc.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PolicyLibrary;

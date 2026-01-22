import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiUsers, FiShield, FiUser } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';

const OrganigramView = ({ organization, memberFacilities = [] }) => {
    const { t } = useTranslation(['organization']);

    // Mock hierarchy data based on passed organization and facilities
    // In a real implementation, this would likely be a recursive tree structure

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <FiShield className="w-5 h-5 text-primary" />
                    {t('organization:organigram.hqTitle', 'Headquarters / Admin Core')}
                </h3>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {organization?.admins?.map((adminId, index) => (
                        <div key={adminId} className="flex items-center gap-3 p-4 bg-muted/20 rounded-lg border border-border">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                <FiUser />
                            </div>
                            <div>
                                <div className="font-medium">Admin ID: {adminId.substring(0, 8)}...</div>
                                <div className="text-xs text-muted-foreground">{t('common:roles.admin', 'Organization Admin')}</div>
                            </div>
                        </div>
                    )) || (
                            <div className="text-sm text-muted-foreground italic">No admins found</div>
                        )}
                </div>
            </div>

            <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border -z-10" />

                <div className="space-y-8 pt-4">
                    {memberFacilities.map((facility) => (
                        <div key={facility.id} className="relative pl-12">
                            <div className="absolute left-6 top-6 w-6 h-0.5 bg-border" />
                            <div className="bg-card border border-border rounded-xl p-6">
                                <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                                    <FiUsers className="w-4 h-4 text-muted-foreground" />
                                    {facility.facilityName || facility.companyName || 'Unnamed Facility'}
                                </h4>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    {/* Mock usage of facility admins if available */}
                                    {facility.admins?.map((adminId) => (
                                        <div key={adminId} className="flex items-center gap-2 p-2 bg-muted/10 rounded border border-border/50 text-sm">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs">
                                                <FiUser className="w-3 h-3 text-slate-500" />
                                            </div>
                                            <span className="truncate">{adminId.substring(0, 8)}...</span>
                                            <span className="text-[10px] ml-auto bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Local Admin</span>
                                        </div>
                                    ))}
                                    {(!facility.admins || facility.admins.length === 0) && (
                                        <div className="text-xs text-muted-foreground italic">No local admins</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OrganigramView;

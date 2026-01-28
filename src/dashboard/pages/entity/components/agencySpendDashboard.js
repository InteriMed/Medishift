import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiPieChart, FiTrendingUp, FiDollarSign } from 'react-icons/fi';

const AgencySpendDashboard = () => {
    const { t } = useTranslation(['organization']);

    return (
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">{t('organization:spend.title', 'Agency Spend Overview')}</h2>
                    <select className="bg-background border border-border rounded-md px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                        <option>Last 30 Days</option>
                        <option>This Quarter</option>
                        <option>Last Year</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-background border border-border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Total Labor Cost</div>
                        <div className="text-2xl font-bold">CHF 1.2M</div>
                        <div className="text-xs text-red-500 flex items-center mt-1"><FiTrendingUp className="mr-1" /> +12%</div>
                    </div>
                    <div className="p-4 bg-background border border-border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Internal Staff</div>
                        <div className="text-2xl font-bold">CHF 950k</div>
                        <div className="text-xs text-muted-foreground mt-1">79% of total</div>
                    </div>
                    <div className="p-4 bg-background border border-border rounded-lg border-orange-200 bg-orange-50/10">
                        <div className="text-sm text-orange-700 mb-1">External Agency</div>
                        <div className="text-2xl font-bold text-orange-800">CHF 250k</div>
                        <div className="text-xs text-orange-600 mt-1">21% of total (Target: &lt;15%)</div>
                    </div>
                    <div className="p-4 bg-background border border-border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Projected Savings</div>
                        <div className="text-2xl font-bold text-green-600">CHF 45k</div>
                        <div className="text-xs text-muted-foreground mt-1">With Float Pool usage</div>
                    </div>
                </div>

                <div className="h-64 bg-muted/10 rounded-lg flex items-center justify-center border border-dashed border-border">
                    <div className="text-center">
                        <FiPieChart className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-muted-foreground">Detailed spend breakdown charts will appear here.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgencySpendDashboard;

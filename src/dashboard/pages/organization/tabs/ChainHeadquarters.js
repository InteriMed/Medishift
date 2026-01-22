import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiUsers, FiGlobe, FiDollarSign, FiFileText, FiUserPlus, FiCreditCard } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';

// Sub-components
import GlobalDirectory from '../components/GlobalDirectory';
import FloatPoolManager from '../components/FloatPoolManager';
import AgencySpendDashboard from '../components/AgencySpendDashboard';
import PolicyLibrary from '../components/PolicyLibrary';
import ATSScorecard from '../components/ATSScorecard';
import PayrollExport from '../../../admin/pages/payroll/PayrollExport'; // Reusing existing component

const ChainHeadquarters = () => {
    const { t } = useTranslation(['organization']);
    const [activeTool, setActiveTool] = useState('directory');

    const tools = [
        { id: 'directory', label: 'Global Directory', icon: FiGlobe, component: GlobalDirectory },
        { id: 'float_pool', label: 'Float Pool Manager', icon: FiUsers, component: FloatPoolManager },
        { id: 'spend', label: 'Agency Spend', icon: FiDollarSign, component: AgencySpendDashboard },
        { id: 'payroll', label: 'Consolidated Payroll', icon: FiCreditCard, component: PayrollExport },
        { id: 'policy', label: 'Policy Library', icon: FiFileText, component: PolicyLibrary },
        { id: 'ats', label: 'Hiring & ATS', icon: FiUserPlus, component: ATSScorecard },
    ];

    const ActiveComponent = tools.find(tool => tool.id === activeTool)?.component || GlobalDirectory;

    return (
        <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-500">
            {/* Sidebar Navigation for Tools */}
            <div className="w-full md:w-64 flex-shrink-0">
                <div className="bg-card border border-border rounded-xl p-2 sticky top-4">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {t('organization:hq.tools', 'Chain Tools')}
                    </div>
                    <nav className="space-y-1">
                        {tools.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => setActiveTool(tool.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    activeTool === tool.id
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <tool.icon className="w-4 h-4" />
                                {tool.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
                <ActiveComponent />
            </div>
        </div>
    );
};

export default ChainHeadquarters;

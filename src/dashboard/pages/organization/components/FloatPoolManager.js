import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiActivity, FiMap } from 'react-icons/fi';

const FloatPoolManager = () => {
    const { t } = useTranslation(['organization']);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6">
                    <h3 className="text-blue-900 font-semibold mb-1">Available Float Staff</h3>
                    <div className="text-3xl font-bold text-blue-700">12</div>
                    <p className="text-xs text-blue-600/80 mt-2">Ready for deployment</p>
                </div>
                <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-6">
                    <h3 className="text-orange-900 font-semibold mb-1">Current Shortages</h3>
                    <div className="text-3xl font-bold text-orange-700">5</div>
                    <p className="text-xs text-orange-600/80 mt-2">Critical needs across 2 facilities</p>
                </div>
                <div className="bg-green-50/50 border border-green-100 rounded-xl p-6">
                    <h3 className="text-green-900 font-semibold mb-1">Active Deployments</h3>
                    <div className="text-3xl font-bold text-green-700">8</div>
                    <p className="text-xs text-green-600/80 mt-2">Currently covering shifts</p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 min-h-[400px] flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-muted/30 rounded-full mb-4">
                    <FiMap className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Interactive Float Map</h3>
                <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                    Visualize staff distribution and drag-and-drop to assign float pool nurses to facilities with shortages.
                </p>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                    View Float Pool Roster
                </button>
            </div>
        </div>
    );
};

export default FloatPoolManager;

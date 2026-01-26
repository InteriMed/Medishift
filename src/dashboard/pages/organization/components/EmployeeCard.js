import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import {
  FiUser, FiPhone, FiMail, FiMessageCircle, FiClock, FiCalendar,
  FiAlertTriangle, FiCheckCircle, FiShield, FiTrendingUp, FiMapPin,
  FiFileText, FiX, FiActivity, FiDownload, FiStar, FiExternalLink, FiUserX, FiMessageSquare
} from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import PublicEmployeeProfile from './PublicEmployeeProfile';
import Button from '../../../../components/BoxedInputFields/Button';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../../contexts/DashboardContext';

const StatusBadge = ({ status }) => {
  // Mock status logic - in real app, derive from schedule/presence
  const config = {
    active: { color: 'bg-green-100 text-green-700', icon: '🟢', label: 'Active / On Shift' },
    off: { color: 'bg-gray-100 text-gray-700', icon: '⚪', label: 'Off Duty' },
    sick: { color: 'bg-red-100 text-red-700', icon: '🔴', label: 'Sick Leave' },
    holiday: { color: 'bg-yellow-100 text-yellow-700', icon: '🟡', label: 'On Holiday' }
  };
  const current = config[status] || config['off'];

  return (
    <div className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold", current.color)}>
      <span className="text-[10px]">{current.icon}</span>
      {current.label}
    </div>
  );
};

const MetricCard = ({ label, value, subtext, type = 'neutral', icon: Icon }) => {
  const colors = {
    neutral: 'bg-card border-border text-foreground',
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div className={cn("p-4 rounded-xl border flex flex-col gap-1 shadow-sm", colors[type])}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-80 uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 opacity-50" />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtext && <div className="text-xs opacity-70">{subtext}</div>}
    </div>
  );
};

const SectionHeader = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
    {Icon && <Icon className="w-4 h-4 text-primary" />}
    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
  </div>
);



const EmployeeCard = ({ employee, hrMetrics, onClose, viewerIsAdmin, onFireEmployee, employeeId }) => {
  const { t } = useTranslation(['organization', 'common']);
  const [showPublicProfile, setShowPublicProfile] = useState(false);
  const navigate = useNavigate();
  const { selectedWorkspace } = useDashboard();

  // -- Calculated States --
  const fullName = `${employee.firstName} ${employee.lastName}`.trim();
  const jobTitle = employee.contract?.jobTitle || "Pharmacist"; // Fallback
  // Mock status for demo
  const currentStatus = 'active';

  // -- Event Handlers --
  const handleDownloadReport = () => {
    // Mock download action
    console.log("Downloading performance report for:", fullName);
    alert(`Generating Performance Report for ${fullName}...`);
  };

  const handleMessage = () => {
    if (employeeId) {
      navigate(`/dashboard/${selectedWorkspace?.id || 'personal'}/messages?userId=${employeeId}`);
      onClose();
    }
  };

  const handleCalendar = () => {
    if (employeeId) {
      navigate(`/dashboard/${selectedWorkspace?.id || 'personal'}/calendar?userId=${employeeId}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border hover:shadow-md transition-shadow max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header Section (Identity) */}
        <div className="bg-muted/80 p-6 flex items-start gap-6 border-b border-border relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setShowPublicProfile(true)}
              className="p-2 rounded-full hover:bg-black/5 transition-colors text-blue-600"
              title={t('organization:employee.viewPublicProfile', 'View Public Marketplace Profile')}
            >
              <FiUser className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 transition-colors"
              title={t('common:close', 'Close')}
            >
              <FiX className="w-5 h-5 opacity-70" />
            </button>
          </div>

          <div className="relative">
            {employee.photoURL ? (
              <img src={employee.photoURL} alt={fullName} className="w-24 h-24 rounded-xl object-cover hover:shadow-md transition-shadow border-4 border-card" />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold hover:shadow-md transition-shadow border-4 border-card">
                {employee.firstName?.[0]}{employee.lastName?.[0]}
              </div>
            )}
            <div className="absolute -bottom-3 -right-3">
              {/* Could put a small badge here if needed */}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-semibold text-foreground">{fullName}</h1>
                <StatusBadge status={currentStatus} />
              </div>
              <p className="text-muted-foreground font-medium">
                {jobTitle}
                {!selectedWorkspace?.facilityId && ` • ${t('organization:employee.homeBranch', 'Plainpalais')}`}
              </p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button 
                  onClick={handleMessage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <FiMessageSquare className="w-3.5 h-3.5" /> {t('common:message', 'Message')}
                </button>
                <button 
                  onClick={handleCalendar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted transition-colors"
                >
                  <FiCalendar className="w-3.5 h-3.5" /> {t('common:calendar', 'Calendar')}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted transition-colors">
                  <FiPhone className="w-3.5 h-3.5" /> {t('common:call', 'Call')}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted transition-colors">
                  <FiMail className="w-3.5 h-3.5" /> {t('common:email', 'Email')}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-medium hover:bg-muted transition-colors text-green-600">
                  <FiMessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
                {viewerIsAdmin && onFireEmployee && (
                  <Button
                    onClick={onFireEmployee}
                    variant="danger"
                    size="sm"
                    className="ml-auto"
                  >
                    <FiUserX className="w-3.5 h-3.5 mr-1" /> {t('organization:employee.remove', 'Remove')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:block text-right">
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <FiDownload className="w-4 h-4" />
              Generate Performance Report
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 flex-1 bg-background custom-scrollbar">

          {/* 2. Balances Dashboard (Admin Only) */}
          {viewerIsAdmin && (
            <div className="mb-8">
              <SectionHeader title="Balances & Activity" icon={FiTrendingUp} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  label="Overtime Balance"
                  value={hrMetrics?.overtimeHours > 0 ? `+${hrMetrics.overtimeHours}h` : `${hrMetrics?.overtimeHours || 0}h`}
                  subtext="Current Month"
                  type={hrMetrics?.overtimeHours > 10 ? 'danger' : hrMetrics?.overtimeHours < 0 ? 'warning' : 'success'}
                  icon={FiClock}
                />
                <MetricCard
                  label="Vacation Remaining"
                  value={`${hrMetrics?.activeContract?.vacationRemaining || employee.contract?.vacationRemaining || 0} Days`}
                  subtext={`Out of ${employee.contract?.vacationBalance || 25} Days`}
                  type="neutral"
                  icon={FiCalendar}
                />
                <MetricCard
                  label="Sick Days (YTD)"
                  value="3 Days" // Mock data for now as requested in prompt "Displayed as: 3 Days"
                  subtext="No suspicious trends"
                  type="neutral"
                  icon={FiActivity}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 3. Professional & Compliance (Left Col - 2/3) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Compliance Card */}
              <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <SectionHeader title="Professional Compliance" icon={FiShield} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Qualification</span>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {employee.pharmacyLicense?.diploma || 'N/A'}
                      {employee.pharmacyLicense?.diploma && <FiCheckCircle className="text-green-500 w-4 h-4" />}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">GLN Number</span>
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      {employee.pharmacyLicense?.gln || 'Not Provided'}
                      {employee.pharmacyLicense?.gln && <FiCheckCircle className="text-green-500 w-4 h-4" />}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Permit Status</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{employee.identity?.permitType || 'N/A'}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                        {employee.identity?.permitExpiryDate ? `Valid until ${new Date(employee.identity.permitExpiryDate).toLocaleDateString()}` : 'No Expiry'}
                      </span>
                      {/* Logic for expiration warning could go here */}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <span className="text-xs text-muted-foreground block mb-2">Verified Skills</span>
                  <div className="flex flex-wrap gap-2">
                    {['Tactil', 'Vaccination ✅', 'NetCare', 'English Speaker', 'Injection'].map((skill) => ( // Mock skills based on prompt + operational
                      <span key={skill} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                        {skill}
                      </span>
                    ))}
                    {employee.operational?.additionalLanguages?.trim().split(',').map(lang => (
                      <span key={lang} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Internal Mobility Section (USP) - Admin Only */}
              {viewerIsAdmin && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-5">
                  <SectionHeader title="Internal Mobility (Interim)" icon={FiMapPin} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-xs text-indigo-800/60 block mb-1">Willingness to Travel</span>
                      <div className="font-medium text-indigo-900">
                        {employee.operational?.mobilityZone === 'all_geneva' ? "All Geneva" : "Zone A Only"}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-indigo-800/60 block mb-1">Mobility Rating</span>
                      <div className="flex text-yellow-500 text-sm">
                        <FiStar className="fill-current" />
                        <FiStar className="fill-current" />
                        <FiStar className="fill-current" />
                        <FiStar className="text-gray-300" />
                        <FiStar className="text-gray-300" />
                      </div>
                    </div>

                    <div className="md:col-span-2 pt-2 border-t border-indigo-200/50">
                      <span className="text-xs text-indigo-800/60 block mb-1">Recent Activity</span>
                      <div className="text-sm text-indigo-900 flex items-center gap-2">
                        <FiClock className="w-4 h-4 opacity-50" />
                        Last helped at <span className="font-semibold">Rive</span> on 12.02
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* 4. Contract & Payroll (Right Col - 1/3) - Admin Only */}
            {viewerIsAdmin && (
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm h-full">
                  <SectionHeader title="Contract Details" icon={FiFileText} />

                  <div className="space-y-5">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">FTE (Taux)</span>
                      <div className="font-semibold text-lg">{employee.contract?.fte || 0}%</div>
                      <div className="text-xs text-muted-foreground">Approx. {((employee.contract?.fte || 0) / 100 * 42).toFixed(1)}h / week</div>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Entry Date</span>
                      <div className="font-medium">
                        {employee.contract?.startDate ? new Date(employee.contract.startDate).toLocaleDateString() : '-'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">Seniority: 4 Years</div> {/* Mock seniority calc */}
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Contract Type</span>
                      <div className="inline-block px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-xs font-semibold">
                        {employee.contract?.contractType || 'CDI'}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border mt-4">
                      <span className="text-xs text-muted-foreground block mb-2">Allocated Pattern</span>
                      <div className="text-xs leading-relaxed opacity-80">
                        {/* Mock pattern */}
                        Mondays, Tuesdays<br />
                        Thursday Mornings
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Public Profile Popup */}
      <PublicEmployeeProfile
        isOpen={showPublicProfile}
        onClose={() => setShowPublicProfile(false)}
        employeeId={employee.uid || employee.id}
      />
    </div>
  );
};

EmployeeCard.propTypes = {
  employee: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onOpenPublicProfile: PropTypes.func,
  onSave: PropTypes.func,
  viewerIsAdmin: PropTypes.bool,
  hrMetrics: PropTypes.object,
  onFireEmployee: PropTypes.func,
  employeeId: PropTypes.string
};

export default EmployeeCard;







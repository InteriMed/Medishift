import React, { useState, useEffect } from 'react';
import { firebaseApp } from '../../../../services/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Search, Briefcase, MapPin, Calendar, ExternalLink, Play, Loader, CheckCircle, AlertCircle, Clock, Settings, Plus, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import { useAuth } from '../../../../contexts/AuthContext';
import { logAdminAction, ADMIN_AUDIT_EVENTS } from '../../../../utils/auditLogger';
import Button from '../../../../components/colorPicker/Button';
import PersonnalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';
import DropdownField from '../../../../components/boxedInputFields/dropdownField';
import '../../../../styles/variables.css';

const LinkedInJobScraper = () => {
  const { userProfile } = useAuth();
  const [keywords, setKeywords] = useState('pharmacist');
  const [location, setLocation] = useState('Switzerland');
  const [maxJobs, setMaxJobs] = useState(100);
  const [scraping, setScraping] = useState(false);
  const [scrapedJobs, setScrapedJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [lastScrapeResult, setLastScrapeResult] = useState(null);
  const [scraperStatus, setScraperStatus] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    keywords: 'pharmacist',
    location: 'Switzerland',
    maxJobs: 100,
    scheduleType: 'daily',
    hour: 9,
    minute: 0,
    dayOfWeek: 1,
    dayOfMonth: 1,
    enabled: true,
  });

  const medicalJobKeywords = [
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'pharmacy', label: 'Pharmacy' },
    { value: 'medical', label: 'Medical' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'physician', label: 'Physician' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'clinical', label: 'Clinical' },
    { value: 'pharmaceutical', label: 'Pharmaceutical' },
    { value: 'medication', label: 'Medication' },
  ];

  const swissLocations = [
    { value: 'Switzerland', label: 'Switzerland' },
    { value: 'Zurich', label: 'Zurich' },
    { value: 'Geneva', label: 'Geneva' },
    { value: 'Basel', label: 'Basel' },
    { value: 'Bern', label: 'Bern' },
    { value: 'Lausanne', label: 'Lausanne' },
    { value: 'Lucerne', label: 'Lucerne' },
    { value: 'St. Gallen', label: 'St. Gallen' },
  ];

  useEffect(() => {
    loadScrapedJobs();
    loadScraperStatus();
    loadSchedules();
  }, []);

  const loadScraperStatus = async () => {
    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const getScraperStatus = httpsCallable(functions, 'getScraperStatus');
      const result = await getScraperStatus();
      if (result.data.success) {
        setScraperStatus(result.data);
      }
    } catch (error) {
      console.error('Error loading scraper status:', error);
    }
  };

  const loadSchedules = async () => {
    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const getScraperSchedules = httpsCallable(functions, 'getScraperSchedules');
      const result = await getScraperSchedules();
      if (result.data.success) {
        setSchedules(result.data.schedules || []);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const createScraperSchedule = httpsCallable(functions, 'createScraperSchedule');
      const result = await createScraperSchedule(scheduleForm);
      if (result.data.success) {
        await loadSchedules();
        await loadScraperStatus();
        setShowScheduleModal(false);
        setScheduleForm({
          keywords: 'pharmacist',
          location: 'Switzerland',
          maxJobs: 100,
          scheduleType: 'daily',
          hour: 9,
          minute: 0,
          dayOfWeek: 1,
          dayOfMonth: 1,
          enabled: true,
        });
        alert('Schedule created successfully!');
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule: ' + error.message);
    }
  };

  const handleUpdateSchedule = async (scheduleId, updates) => {
    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const updateScraperSchedule = httpsCallable(functions, 'updateScraperSchedule');
      const result = await updateScraperSchedule({ scheduleId, ...updates });
      if (result.data.success) {
        await loadSchedules();
        await loadScraperStatus();
        setShowScheduleModal(false);
        setEditingSchedule(null);
        alert('Schedule updated successfully!');
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Error updating schedule: ' + error.message);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }
    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const deleteScraperSchedule = httpsCallable(functions, 'deleteScraperSchedule');
      const result = await deleteScraperSchedule({ scheduleId });
      if (result.data.success) {
        await loadSchedules();
        await loadScraperStatus();
        alert('Schedule deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error deleting schedule: ' + error.message);
    }
  };

  const handleToggleSchedule = async (schedule) => {
    await handleUpdateSchedule(schedule.id, { enabled: !schedule.enabled });
  };

  const openEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      keywords: schedule.keywords || 'pharmacist',
      location: schedule.location || 'Switzerland',
      maxJobs: schedule.maxJobs || 100,
      scheduleType: schedule.scheduleType || 'daily',
      hour: schedule.hour || 9,
      minute: schedule.minute || 0,
      dayOfWeek: schedule.dayOfWeek || 1,
      dayOfMonth: schedule.dayOfMonth || 1,
      enabled: schedule.enabled !== false,
    });
    setShowScheduleModal(true);
  };

  const loadScrapedJobs = async () => {
    setLoading(true);
    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const getLinkedInJobs = httpsCallable(functions, 'getLinkedInJobs');

      const result = await getLinkedInJobs({
        limit: 200,
      });

      if (result.data.success) {
        setScrapedJobs(result.data.jobs || []);
      }
    } catch (error) {
      console.error('Error loading scraped jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScrape = async () => {
    if (!keywords.trim()) {
      alert('Please enter keywords to search for');
      return;
    }

    setScraping(true);
    setLastScrapeResult(null);

    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const scrapeLinkedInJobs = httpsCallable(functions, 'scrapeLinkedInJobs');

      const result = await scrapeLinkedInJobs({
        keywords: keywords.trim(),
        location: location || '',
        maxJobs: parseInt(maxJobs) || 100,
        saveToFirestore: true,
      });

      if (result.data.success) {
        setLastScrapeResult({
          success: true,
          jobsFound: result.data.jobsFound,
          message: result.data.message,
        });

        await logAdminAction({
          eventType: ADMIN_AUDIT_EVENTS.EXPORT_DATA,
          action: `Scraped LinkedIn jobs: ${result.data.jobsFound} jobs found`,
          resource: {
            type: 'linkedin_jobs',
            keywords,
            location,
          },
          details: {
            keywords,
            location,
            maxJobs,
            jobsFound: result.data.jobsFound,
            scrapedBy: userProfile?.uid || 'admin',
          },
        });

        await loadScrapedJobs();
        await loadScraperStatus();
        alert(`Successfully scraped ${result.data.jobsFound} jobs!`);
      } else {
        throw new Error(result.data.message || 'Failed to scrape jobs');
      }
    } catch (error) {
      console.error('Error scraping LinkedIn jobs:', error);
      setLastScrapeResult({
        success: false,
        message: error.message || 'Failed to scrape jobs',
      });
      alert('Error scraping jobs. Please try again.');
    } finally {
      setScraping(false);
    }
  };

  const filteredJobs = scrapedJobs.filter(job => {
    const searchLower = searchQuery.toLowerCase();
    const locationMatch = !filterLocation || 
      (job.location && job.location.toLowerCase().includes(filterLocation.toLowerCase()));
    
    return (
      locationMatch &&
      (job.title?.toLowerCase().includes(searchLower) ||
       job.company?.toLowerCase().includes(searchLower) ||
       job.location?.toLowerCase().includes(searchLower))
    );
  });

  if (loading && scrapedJobs.length === 0) {
    return (
      <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_SYSTEM}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
          <div style={{ color: 'var(--text-light-color)' }}>Loading jobs...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_SYSTEM}>
      <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 0 }}>
            LinkedIn Job Scraper
          </h1>
          <p style={{ color: 'var(--text-light-color)', marginTop: 'var(--spacing-xs)' }}>
            Scrape medical and pharmacy jobs from LinkedIn
          </p>
        </div>

        {scraperStatus && (
          <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <Clock size={20} />
              Scraper Status
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
              <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--white)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)' }}>
                <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)', marginBottom: 'var(--spacing-xs)' }}>Active Schedules</div>
                <div style={{ fontSize: 'var(--font-size-xxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--primary-color)' }}>
                  {scraperStatus.activeSchedules || 0}
                </div>
              </div>
              <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--white)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)' }}>
                <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)', marginBottom: 'var(--spacing-xs)' }}>Total Jobs</div>
                <div style={{ fontSize: 'var(--font-size-xxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--primary-color)' }}>
                  {scraperStatus.totalJobs || 0}
                </div>
              </div>
              <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--white)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)' }}>
                <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)', marginBottom: 'var(--spacing-xs)' }}>Last Scrape</div>
                <div style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color)' }}>
                  {scraperStatus.lastScrapeTime ? new Date(scraperStatus.lastScrapeTime.toDate()).toLocaleString() : 'Never'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
            <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <Settings size={20} />
              Scheduled Scrapes
            </h2>
            <Button
              onClick={() => {
                setEditingSchedule(null);
                setScheduleForm({
                  keywords: 'pharmacist',
                  location: 'Switzerland',
                  maxJobs: 100,
                  scheduleType: 'daily',
                  hour: 9,
                  minute: 0,
                  dayOfWeek: 1,
                  dayOfMonth: 1,
                  enabled: true,
                });
                setShowScheduleModal(true);
              }}
              variant="confirmation"
            >
              <Plus size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
              New Schedule
            </Button>
          </div>

          {schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--text-light-color)', border: '1px dashed var(--grey-2)', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--grey-1-light)' }}>
              <Settings size={48} style={{ margin: '0 auto', marginBottom: 'var(--spacing-md)', opacity: 0.3 }} />
              <p style={{ fontWeight: 'var(--font-weight-medium)' }}>No schedules configured</p>
              <p style={{ fontSize: 'var(--font-size-small)', marginTop: 'var(--spacing-xs)' }}>Create a schedule to run the scraper automatically</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--grey-2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                      <h3 style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
                        {schedule.keywords} - {schedule.location}
                      </h3>
                      {schedule.enabled ? (
                        <span style={{ padding: '2px 8px', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--green-1)', color: 'var(--green-4)', fontSize: 'var(--font-size-small)' }}>
                          Active
                        </span>
                      ) : (
                        <span style={{ padding: '2px 8px', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--grey-2)', color: 'var(--text-light-color)', fontSize: 'var(--font-size-small)' }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap', fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                      <span>Schedule: {schedule.scheduleType}</span>
                      {schedule.nextRun && (
                        <span>Next: {new Date(schedule.nextRun.toDate()).toLocaleString()}</span>
                      )}
                      {schedule.lastRun && (
                        <span>Last: {new Date(schedule.lastRun.toDate()).toLocaleString()}</span>
                      )}
                      {schedule.lastRunStatus === 'success' && schedule.lastRunJobsFound !== null && (
                        <span style={{ color: 'var(--green-4)' }}>Found {schedule.lastRunJobsFound} jobs</span>
                      )}
                      {schedule.lastRunStatus === 'error' && (
                        <span style={{ color: 'var(--red-4)' }}>Error: {schedule.lastRunError || 'Unknown error'}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                      onClick={() => handleToggleSchedule(schedule)}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--grey-2)',
                        backgroundColor: 'var(--white)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={schedule.enabled ? 'Disable' : 'Enable'}
                    >
                      {schedule.enabled ? <PowerOff size={18} /> : <Power size={18} />}
                    </button>
                    <button
                      onClick={() => openEditSchedule(schedule)}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--grey-2)',
                        backgroundColor: 'var(--white)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      style={{
                        padding: '8px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--red-2)',
                        backgroundColor: 'var(--white)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--red-4)',
                      }}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showScheduleModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: 'var(--background-div-color)',
              borderRadius: 'var(--border-radius-md)',
              padding: 'var(--spacing-lg)',
              border: '1px solid var(--grey-2)',
              boxShadow: 'var(--shadow-lg)',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}>
              <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-md)' }}>
                {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <PersonnalizedInputField
                  label="Keywords"
                  type="text"
                  value={scheduleForm.keywords}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, keywords: e.target.value })}
                  placeholder="pharmacist, nurse, etc."
                />
                <DropdownField
                  label="Location"
                  options={swissLocations}
                  value={scheduleForm.location}
                  onChange={(value) => setScheduleForm({ ...scheduleForm, location: value })}
                />
                <PersonnalizedInputField
                  label="Max Jobs"
                  type="number"
                  value={scheduleForm.maxJobs}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, maxJobs: parseInt(e.target.value) || 100 })}
                />
                <DropdownField
                  label="Schedule Type"
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                  value={scheduleForm.scheduleType}
                  onChange={(value) => setScheduleForm({ ...scheduleForm, scheduleType: value })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                  <PersonnalizedInputField
                    label="Hour (0-23)"
                    type="number"
                    value={scheduleForm.hour}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, hour: parseInt(e.target.value) || 9 })}
                    min="0"
                    max="23"
                  />
                  <PersonnalizedInputField
                    label="Minute (0-59)"
                    type="number"
                    value={scheduleForm.minute}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, minute: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="59"
                  />
                </div>
                {scheduleForm.scheduleType === 'weekly' && (
                  <DropdownField
                    label="Day of Week"
                    options={[
                      { value: 0, label: 'Sunday' },
                      { value: 1, label: 'Monday' },
                      { value: 2, label: 'Tuesday' },
                      { value: 3, label: 'Wednesday' },
                      { value: 4, label: 'Thursday' },
                      { value: 5, label: 'Friday' },
                      { value: 6, label: 'Saturday' },
                    ]}
                    value={scheduleForm.dayOfWeek}
                    onChange={(value) => setScheduleForm({ ...scheduleForm, dayOfWeek: parseInt(value) })}
                  />
                )}
                {scheduleForm.scheduleType === 'monthly' && (
                  <PersonnalizedInputField
                    label="Day of Month (1-31)"
                    type="number"
                    value={scheduleForm.dayOfMonth}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfMonth: parseInt(e.target.value) || 1 })}
                    min="1"
                    max="31"
                  />
                )}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                  <Button
                    onClick={() => {
                      setShowScheduleModal(false);
                      setEditingSchedule(null);
                    }}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (editingSchedule) {
                        handleUpdateSchedule(editingSchedule.id, scheduleForm);
                      } else {
                        handleCreateSchedule();
                      }
                    }}
                    variant="confirmation"
                  >
                    {editingSchedule ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Briefcase size={20} />
            Scrape Jobs
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', alignItems: 'end' }}>
            <div>
              <PersonnalizedInputField
                label="Keywords"
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="pharmacist, nurse, etc."
                name="keywords"
              />
            </div>
            <div>
              <DropdownField
                label="Location"
                options={swissLocations}
                value={location}
                onChange={(value) => setLocation(value)}
              />
            </div>
            <div>
              <PersonnalizedInputField
                label="Max Jobs"
                type="number"
                value={maxJobs}
                onChange={(e) => setMaxJobs(e.target.value)}
                placeholder="100"
                name="maxJobs"
              />
            </div>
            <div>
              <Button 
                onClick={handleScrape} 
                disabled={scraping} 
                variant="confirmation" 
                style={{ height: 'var(--boxed-inputfield-height)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {scraping ? (
                  <>
                    <Loader size={18} style={{ marginRight: 'var(--spacing-xs)', animation: 'spin 1s linear infinite' }} />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Play size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                    Start Scraping
                  </>
                )}
              </Button>
            </div>
          </div>

          {lastScrapeResult && (
            <div style={{ 
              marginTop: 'var(--spacing-md)', 
              padding: 'var(--spacing-md)', 
              borderRadius: 'var(--border-radius-sm)',
              backgroundColor: lastScrapeResult.success ? 'var(--green-1)' : 'var(--red-1)',
              border: `1px solid ${lastScrapeResult.success ? 'var(--green-2)' : 'var(--red-2)'}`,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)'
            }}>
              {lastScrapeResult.success ? (
                <CheckCircle size={20} color="var(--green-4)" />
              ) : (
                <AlertCircle size={20} color="var(--red-4)" />
              )}
              <div>
                <strong>{lastScrapeResult.success ? 'Success:' : 'Error:'}</strong> {lastScrapeResult.message}
                {lastScrapeResult.jobsFound !== undefined && (
                  <span> ({lastScrapeResult.jobsFound} jobs found)</span>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
            <strong>Quick Keywords:</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
              {medicalJobKeywords.map(kw => (
                <button
                  key={kw.value}
                  onClick={() => setKeywords(kw.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--grey-2)',
                    backgroundColor: keywords === kw.value ? 'var(--primary-color-light)' : 'var(--white)',
                    color: keywords === kw.value ? 'var(--primary-color)' : 'var(--text-color)',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-small)',
                  }}
                >
                  {kw.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <Briefcase size={20} />
              Scraped Jobs ({filteredJobs.length})
            </h2>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '300px' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light-color)' }} />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', outline: 'none', fontSize: 'var(--font-size-small)' }}
                />
              </div>
              <PersonnalizedInputField
                label=""
                type="text"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                placeholder="Filter by location"
                name="filterLocation"
                style={{ width: '200px' }}
              />
            </div>
          </div>

          {filteredJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--text-light-color)', border: '1px dashed var(--grey-2)', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--grey-1-light)' }}>
              <Briefcase size={48} style={{ margin: '0 auto', marginBottom: 'var(--spacing-md)', opacity: 0.3 }} />
              <p style={{ fontWeight: 'var(--font-weight-medium)' }}>No jobs found</p>
              <p style={{ fontSize: 'var(--font-size-small)', marginTop: 'var(--spacing-xs)' }}>Start scraping to collect job listings</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {filteredJobs.map((job, index) => (
                <div
                  key={job.id || index}
                  style={{ 
                    backgroundColor: 'var(--white)', 
                    borderRadius: 'var(--border-radius-md)', 
                    padding: 'var(--spacing-md)', 
                    border: '1px solid var(--grey-2)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    transition: 'box-shadow var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                      <h3 style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
                        {job.title || 'N/A'}
                      </h3>
                      {job.jobLink && (
                        <a 
                          href={job.jobLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-color)' }}
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginTop: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--text-light-color)', fontSize: 'var(--font-size-small)' }}>
                        <Briefcase size={14} />
                        {job.company || 'N/A'}
                      </div>
                      {job.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--text-light-color)', fontSize: 'var(--font-size-small)' }}>
                          <MapPin size={14} />
                          {job.location}
                        </div>
                      )}
                      {job.postedDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--text-light-color)', fontSize: 'var(--font-size-small)' }}>
                          <Calendar size={14} />
                          {job.postedDate}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default LinkedInJobScraper;


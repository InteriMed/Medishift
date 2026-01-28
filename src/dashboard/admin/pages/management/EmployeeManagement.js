import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, firebaseApp } from '../../../../services/firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { UserPlus, Shield, Mail, Search, CheckCircle, XCircle, User, FileCheck, FileText } from 'lucide-react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { PERMISSIONS } from '../../utils/rbac';
import { useAuth } from '../../../../contexts/AuthContext';
import { logAdminAction, ADMIN_AUDIT_EVENTS } from '../../../../utils/auditLogger';
import Button from '../../../../components/colorPicker/button';
import PersonnalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';
import DropdownField from '../../../../components/boxedInputFields/dropdownField';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import '../../../../styles/variables.css';

const EmployeeManagement = () => {
  const { t } = useTranslation(['admin']);
  const { userProfile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ops_manager');
  const [inviting, setInviting] = useState(false);

  const roleLabels = {
    super_admin: 'Super Admin',
    ops_manager: 'Operations Manager',
    finance: 'Finance',
    recruiter: 'Recruiter',
    support: 'Support',
    external_payroll: 'External Payroll'
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const adminsRef = collection(db, FIRESTORE_COLLECTIONS.ADMINS);
      const snapshot = await getDocs(adminsRef);

      const employeesList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.isActive !== false) {
          employeesList.push({
            id: docSnap.id,
            email: data.email,
            displayName: data.displayName,
            roles: data.roles || [],
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            invitedBy: data.invitedBy,
            isActive: data.isActive !== false
          });
        }
      });

      setEmployees(employeesList);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitePreview, setInvitePreview] = useState({
    email: '',
    subject: 'Invitation to join MediShift Admin Team',
    role: 'ops_manager',
    customMessage: ''
  });

  const openInviteModal = () => {
    if (!inviteEmail.trim()) {
      alert(t('admin:management.enterEmail', 'Please enter an email address'));
      return;
    }
    setInvitePreview({
      email: inviteEmail,
      subject: 'Invitation to join MediShift Admin Team',
      role: inviteRole,
      customMessage: `You have been invited by ${userProfile?.firstName || 'an administrator'} to join the MediShift Admin Team as a ${roleLabels[inviteRole] || inviteRole}.`
    });
    setShowInviteModal(true);
  };

  const handleInvite = async () => {
    setInviting(true);
    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const inviteAdminEmployee = httpsCallable(functions, 'inviteAdminEmployee');

      const result = await inviteAdminEmployee({
        inviteEmail: invitePreview.email,
        inviteRole: invitePreview.role,
        invitedByName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email,
        customMessage: invitePreview.customMessage
      });

      if (result.data.success) {
        await logAdminAction({
          eventType: ADMIN_AUDIT_EVENTS.EMPLOYEE_INVITED,
          action: `Invited employee: ${invitePreview.email}`,
          resource: {
            type: 'employee',
            email: invitePreview.email
          },
          details: {
            inviteEmail: invitePreview.email,
            inviteRole: invitePreview.role,
            invitedBy: userProfile?.uid || 'admin',
            invitedByName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email
          }
        });

        alert(t('admin:management.inviteSent', 'Invitation sent successfully!'));
        setInviteEmail('');
        setShowInviteModal(false);
      } else {
        throw new Error(result.data.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting employee:', error);
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.EMPLOYEE_INVITED,
        action: `Failed to invite employee: ${invitePreview.email}`,
        resource: { type: 'employee', email: invitePreview.email },
        details: { error: error.message },
        success: false,
        errorMessage: error.message
      });
      alert('Error inviting employee. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateRole = async (userId, newRoles) => {
    try {
      const employee = employees.find(e => e.id === userId);
      const oldRoles = employee?.roles || [];

      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), {
        roles: newRoles,
        updatedAt: serverTimestamp(),
        roleUpdatedBy: userProfile?.uid || 'admin'
      });

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.EMPLOYEE_ROLE_UPDATED,
        action: `Updated roles for employee: ${employee?.email || userId}`,
        resource: {
          type: 'employee',
          id: userId,
          email: employee?.email
        },
        details: {
          employeeId: userId,
          employeeEmail: employee?.email,
          oldRoles,
          newRoles,
          updatedBy: userProfile?.uid || 'admin',
          updatedByName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email
        }
      });

      await loadEmployees();
    } catch (error) {
      console.error('Error updating role:', error);
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.EMPLOYEE_ROLE_UPDATED,
        action: `Failed to update roles for employee: ${userId}`,
        resource: { type: 'employee', id: userId },
        details: { error: error.message },
        success: false,
        errorMessage: error.message
      });
      alert('Error updating role. Please try again.');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.roles?.some(role => role.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_EMPLOYEES}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
          <div style={{ color: 'var(--text-light-color)' }}>Loading employees...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.MANAGE_EMPLOYEES}>
      <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 0 }}>
            {t('admin:management.title', 'Employee Management')}
          </h1>
        </div>

        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <UserPlus size={20} />
            {t('admin:management.inviteEmployee', 'Invite Employee')}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', alignItems: 'end' }}>
            <div style={{ gridColumn: 'span 2', marginTop: 'var(--spacing-md)' }}>
              <PersonnalizedInputField
                label={t('admin:management.email', 'Email')}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="employee@example.com"
                name="inviteEmail"
              />
            </div>
            <div>
              <DropdownField
                options={[
                  { value: 'ops_manager', label: 'Operations Manager' },
                  { value: 'finance', label: 'Finance' },
                  { value: 'recruiter', label: 'Recruiter' },
                  { value: 'support', label: 'Support' },
                  { value: 'external_payroll', label: 'External Payroll' }
                ]}
                value={inviteRole}
                onChange={(value) => setInviteRole(value)}
              />
            </div>
            <div>
              <Button onClick={openInviteModal} disabled={inviting} variant="confirmation" style={{ height: 'var(--boxed-inputfield-height)', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                {inviting ? t('admin:management.inviting', 'Sending...') : t('admin:management.sendInvite', 'Send Invite')}
              </Button>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)', alignItems: 'stretch', marginBottom: 'var(--spacing-lg)' }}>
            {/* Column 1: Interview Scorecards */}
            <div style={{ border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--grey-1-light)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-md)', color: 'var(--primary-color)' }}>
                <FileCheck size={24} />
              </div>
              <h3 style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-xs)', color: 'var(--text-color)' }}>
                Interview Scorecards
              </h3>
              <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)', margin: 0 }}>
                Create and manage standardized interview templates for all facilities to ensure consistent hiring quality.
              </p>
            </div>

            {/* Column 2: Search Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', margin: 0 }}>
                  <Shield size={20} />
                  {t('admin:management.employees', 'Administrators')} ({filteredEmployees.length})
                </h2>
              </div>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light-color)' }} />
                <input
                  type="text"
                  placeholder={t('admin:management.search', 'Search admins...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', outline: 'none', fontSize: 'var(--font-size-small)' }}
                />
              </div>
            </div>

            {/* Column 3: Automated Offer Letters */}
            <div style={{ border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'background-color var(--transition-fast)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--grey-1-light)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--spacing-md)', color: 'var(--primary-color)' }}>
                <FileText size={24} />
              </div>
              <h3 style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-xs)', color: 'var(--text-color)' }}>
                Automated Offer Letters
              </h3>
              <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)', margin: 0 }}>
                Configure offer letter templates with dynamic fields for instant generation and sending.
              </p>
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--text-light-color)', border: '1px dashed var(--grey-2)', borderRadius: 'var(--border-radius-sm)', backgroundColor: 'var(--grey-1-light)' }}>
              <User size={48} style={{ margin: '0 auto', marginBottom: 'var(--spacing-md)', opacity: 0.3 }} />
              <p style={{ fontWeight: 'var(--font-weight-medium)' }}>{t('admin:management.noEmployees', 'No administrators found')}</p>
              <p style={{ fontSize: 'var(--font-size-small)', marginTop: 'var(--spacing-xs)' }}>Try adjusting your search or invite a new administrator.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-md)', border: '1px solid var(--grey-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'box-shadow var(--transition-fast)' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                >
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                      {emp.firstName?.[0] || emp.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <strong style={{ fontSize: 'var(--font-size-medium)' }}>
                          {emp.firstName} {emp.lastName}
                        </strong>
                        {emp.id === userProfile?.uid && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--green-1)', color: 'var(--green-4)', borderRadius: '10px', fontWeight: 'bold' }}>YOU</span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                        {emp.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                      {emp.roles?.map((role) => (
                        <span
                          key={role}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: 'var(--font-size-small)',
                            backgroundColor: role === 'super_admin' ? 'var(--purple-1)' : 'var(--blue-1)',
                            color: role === 'super_admin' ? 'var(--purple-4)' : 'var(--blue-4)',
                            fontWeight: '500',
                            border: `1px solid ${role === 'super_admin' ? 'var(--purple-2)' : 'var(--blue-2)'}`
                          }}
                        >
                          {roleLabels[role] || role}
                        </span>
                      ))}
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '120px' }}>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>Last Login</div>
                      <div style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)' }}>
                        {emp.lastLoginAt ? new Date(emp.lastLoginAt).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Preview Modal */}
      {showInviteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-lg)', padding: 'var(--spacing-xl)', width: '100%', maxWidth: '500px', minHeight: '450px', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--grey-2)' }}>
            <h3 style={{ fontSize: 'var(--font-size-xlarge)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--spacing-lg)', color: 'var(--text-color)' }}>
              Confirm Invitation
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <PersonnalizedInputField
                  label="Recipient Email"
                  value={invitePreview.email}
                  onChange={(e) => setInvitePreview({ ...invitePreview, email: e.target.value })}
                />
              </div>

              <PersonnalizedInputField
                label="Email Subject"
                value={invitePreview.subject}
                onChange={(e) => setInvitePreview({ ...invitePreview, subject: e.target.value })}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-color)' }}>
                  Custom Message (HTML supported)
                </label>
                <textarea
                  value={invitePreview.customMessage}
                  onChange={(e) => setInvitePreview({ ...invitePreview, customMessage: e.target.value })}
                  style={{
                    width: '100%',
                    height: '120px',
                    padding: '12px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid var(--grey-2)',
                    fontSize: 'var(--font-size-small)',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  placeholder="Enter custom invitation message..."
                />
              </div>

              <DropdownField
                label="Assigned Role"
                options={[
                  { value: 'ops_manager', label: 'Operations Manager' },
                  { value: 'finance', label: 'Finance' },
                  { value: 'recruiter', label: 'Recruiter' },
                  { value: 'support', label: 'Support' },
                  { value: 'external_payroll', label: 'External Payroll' }
                ]}
                value={invitePreview.role}
                onChange={(value) => setInvitePreview({ ...invitePreview, role: value })}
              />

            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-xl)' }}>
              <Button onClick={() => setShowInviteModal(false)} variant="ghost" style={{ minWidth: '100px' }}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviting} variant="confirmation" style={{ minWidth: '120px' }}>
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
};

export default EmployeeManagement;

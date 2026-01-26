import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, firebaseApp } from '../../../../services/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { UserPlus, Shield, Mail, Search, Edit2, Save, X, Plus, Trash2, CheckCircle } from 'lucide-react';
import { useAdminPermission } from '../../hooks/useAdminPermission';
import { RIGHTS, ADMIN_ROLES } from '../../utils/rbac';
import { useAuth } from '../../../../contexts/AuthContext';
import { logAdminAction, ADMIN_AUDIT_EVENTS } from '../../../../utils/auditLogger';
import Button from '../../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import DropdownField from '../../../../components/BoxedInputFields/Dropdown-Field';
import Dialog from '../../../../components/Dialog/Dialog';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import '../../../../styles/variables.css';

const AdminManagement = () => {
  const { t } = useTranslation(['admin']);
  const { userProfile } = useAuth();
  const { hasRight: checkRight, isSuperAdmin } = useAdminPermission();
  const [admins, setAdmins] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('admins');
  
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [editingRights, setEditingRights] = useState([]);
  
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ops_manager');
  const [inviting, setInviting] = useState(false);
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleRights, setRoleRights] = useState([]);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadAdmins(), loadRoles()]);
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const snapshot = await getDocs(usersRef);
      
      const adminsList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const roles = Array.isArray(data.roles) ? data.roles : [];
        
        if (roles.includes(ADMIN_ROLES.SUPER_ADMIN) || roles.includes(ADMIN_ROLES.ADMIN)) {
          const userDoc = docSnap.data();
          const adminData = userDoc.adminData || {};
          
          adminsList.push({
            id: docSnap.id,
            email: userDoc.email,
            displayName: userDoc.displayName || `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || userDoc.email,
            firstName: userDoc.firstName,
            lastName: userDoc.lastName,
            role: roles.includes(ADMIN_ROLES.SUPER_ADMIN) ? ADMIN_ROLES.SUPER_ADMIN : ADMIN_ROLES.ADMIN,
            rights: adminData.rights || [],
            createdAt: adminData.createdAt?.toDate?.() || adminData.createdAt || userDoc.createdAt?.toDate?.() || userDoc.createdAt,
            isActive: adminData.isActive !== false
          });
        }
      });
      
      setAdmins(adminsList);
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const rolesRef = collection(db, 'adminRoles');
      const snapshot = await getDocs(rolesRef);
      
      const rolesList = [];
      snapshot.forEach((docSnap) => {
        rolesList.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      
      setRoles(rolesList);
    } catch (error) {
      console.error('Error loading roles:', error);
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('User does not have permission to read adminRoles collection. This is expected if Firestore rules are not configured.');
        setRoles([]);
      }
    }
  };

  const handleEditAdmin = (admin) => {
    if (admin.role === ADMIN_ROLES.SUPER_ADMIN) {
      alert('Super Admin has all rights by default and cannot be edited.');
      return;
    }
    setEditingAdminId(admin.id);
    setEditingRights([...admin.rights]);
  };

  const handleSaveAdminRights = async () => {
    if (!editingAdminId) return;
    
    try {
      const admin = admins.find(a => a.id === editingAdminId);
      const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, editingAdminId);
      const userDocSnap = await getDoc(userRef);
      
      const currentData = userDocSnap.data() || {};
      const currentAdminData = currentData.adminData || {};
      
      await updateDoc(userRef, {
        adminData: {
          ...currentAdminData,
          rights: editingRights,
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.EMPLOYEE_ROLE_UPDATED,
        action: `Updated rights for admin: ${admin?.email || editingAdminId}`,
        resource: { type: 'admin', id: editingAdminId, email: admin?.email },
        details: {
          oldRights: admin?.rights || [],
          newRights: editingRights,
          updatedBy: userProfile?.uid
        }
      });

      setEditingAdminId(null);
      setEditingRights([]);
      await loadAdmins();
      alert('Rights updated successfully');
    } catch (error) {
      console.error('Error saving admin rights:', error);
      alert('Failed to update rights: ' + error.message);
    }
  };

  const handleToggleRight = (right) => {
    if (editingRights.includes(right)) {
      setEditingRights(editingRights.filter(r => r !== right));
    } else {
      setEditingRights([...editingRights, right]);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    if (!inviteRole) {
      alert('Please select a role');
      return;
    }

    setInviting(true);
    try {
      const functions = getFunctions(firebaseApp, 'europe-west6');
      const inviteAdminEmployee = httpsCallable(functions, 'inviteAdminEmployee');

      const result = await inviteAdminEmployee({
        inviteEmail: inviteEmail.trim(),
        inviteRole: inviteRole,
        invitedByName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email
      });

      if (result.data.success) {
        await logAdminAction({
          eventType: ADMIN_AUDIT_EVENTS.EMPLOYEE_INVITED,
          action: `Invited admin: ${inviteEmail}`,
          resource: { type: 'admin', email: inviteEmail },
          details: {
            inviteEmail,
            inviteRole: inviteRole
          }
        });

        alert('Invitation sent successfully!');
        setInviteEmail('');
        setInviteRole('ops_manager');
        setShowInviteModal(false);
      } else {
        throw new Error(result.data.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting admin:', error);
      alert('Error sending invitation: ' + error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      alert('Please enter a role name');
      return;
    }

    if (roleRights.length === 0) {
      alert('Please select at least one right');
      return;
    }

    setSavingRole(true);
    try {
      const roleData = {
        name: roleName.trim(),
        rights: roleRights,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userProfile?.uid
      };

      if (editingRole) {
        await updateDoc(doc(db, 'adminRoles', editingRole.id), {
          ...roleData,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(doc(db, 'adminRoles'), roleData);
      }

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.EMPLOYEE_ROLE_UPDATED,
        action: `${editingRole ? 'Updated' : 'Created'} role: ${roleName}`,
        resource: { type: 'role', name: roleName },
        details: { rights: roleRights }
      });

      setShowRoleModal(false);
      setRoleName('');
      setRoleRights([]);
      setEditingRole(null);
      await loadRoles();
      alert(`Role ${editingRole ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving role:', error);
      alert('Failed to save role: ' + error.message);
    } finally {
      setSavingRole(false);
    }
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleRights([...role.rights]);
    setShowRoleModal(true);
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      await deleteDoc(doc(db, 'adminRoles', roleId));
      await loadRoles();
      alert('Role deleted successfully');
    } catch (error) {
      console.error('Error deleting role:', error);
      alert('Failed to delete role: ' + error.message);
    }
  };

  const filteredAdmins = admins.filter(admin => {
    const searchLower = searchQuery.toLowerCase();
    return (
      admin.email?.toLowerCase().includes(searchLower) ||
      admin.displayName?.toLowerCase().includes(searchLower) ||
      admin.rights?.some(right => right.toLowerCase().includes(searchLower))
    );
  });

  const rightLabels = Object.entries(RIGHTS).reduce((acc, [key, value]) => {
    acc[value] = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return acc;
  }, {});

  if (!checkRight(RIGHTS.MANAGE_ADMINS)) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        <Shield size={64} style={{ color: 'var(--red-4)', opacity: 0.7, margin: '0 auto 20px' }} />
        <h2>Access Denied</h2>
        <p>You do not have permission to manage administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 0 }}>
          Admin Management
        </h1>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Button onClick={() => setShowInviteModal(true)} variant="primary">
            <UserPlus size={18} style={{ marginRight: '8px' }} />
            Invite Admin
          </Button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-md)', borderBottom: '1px solid var(--grey-2)' }}>
        <button
          onClick={() => setActiveTab('admins')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'admins' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'admins' ? 'var(--primary-color)' : 'var(--text-light-color)',
            cursor: 'pointer',
            fontWeight: activeTab === 'admins' ? 'bold' : 'normal'
          }}
        >
          Administrators ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'roles' ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: activeTab === 'roles' ? 'var(--primary-color)' : 'var(--text-light-color)',
            cursor: 'pointer',
            fontWeight: activeTab === 'roles' ? 'bold' : 'normal'
          }}
        >
          Roles ({roles.length})
        </button>
      </div>

      {activeTab === 'admins' && (
        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)' }}>
              Administrators
            </h2>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light-color)' }} />
              <input
                type="text"
                placeholder="Search admins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--grey-2)', outline: 'none' }}
              />
            </div>
          </div>

          {filteredAdmins.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--text-light-color)' }}>
              <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>No administrators found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {filteredAdmins.map((admin) => (
                <div
                  key={admin.id}
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--grey-2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flex: 1 }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: admin.role === ADMIN_ROLES.SUPER_ADMIN ? 'var(--purple-1)' : 'var(--blue-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: admin.role === ADMIN_ROLES.SUPER_ADMIN ? 'var(--purple-4)' : 'var(--blue-4)', fontWeight: 'bold' }}>
                      {admin.displayName[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <strong>{admin.displayName}</strong>
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', backgroundColor: admin.role === ADMIN_ROLES.SUPER_ADMIN ? 'var(--purple-1)' : 'var(--blue-1)', color: admin.role === ADMIN_ROLES.SUPER_ADMIN ? 'var(--purple-4)' : 'var(--blue-4)' }}>
                          {admin.role === ADMIN_ROLES.SUPER_ADMIN ? 'Super Admin' : 'Admin'}
                        </span>
                        {admin.id === userProfile?.uid && (
                          <span style={{ fontSize: '10px', padding: '2px 6px', backgroundColor: 'var(--green-1)', color: 'var(--green-4)', borderRadius: '10px' }}>YOU</span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                        {admin.email}
                      </div>
                      {admin.role === ADMIN_ROLES.ADMIN && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                          {editingAdminId === admin.id ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', width: '100%' }}>
                              {Object.values(RIGHTS).map(right => (
                                <label key={right} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={editingRights.includes(right)}
                                    onChange={() => handleToggleRight(right)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <span style={{ fontSize: '11px' }}>{rightLabels[right] || right}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            admin.rights.length > 0 ? (
                              admin.rights.map(right => (
                                <span key={right} style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: 'var(--grey-1-light)', borderRadius: '4px' }}>
                                  {rightLabels[right] || right}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--text-light-color)', fontStyle: 'italic' }}>No rights assigned</span>
                            )
                          )}
                        </div>
                      )}
                      {admin.role === ADMIN_ROLES.SUPER_ADMIN && (
                        <div style={{ fontSize: '11px', color: 'var(--text-light-color)', marginTop: '4px', fontStyle: 'italic' }}>
                          Has all rights by default
                        </div>
                      )}
                    </div>
                  </div>
                  {admin.role === ADMIN_ROLES.ADMIN && (
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                      {editingAdminId === admin.id ? (
                        <>
                          <Button onClick={handleSaveAdminRights} variant="primary" size="sm">
                            <Save size={14} style={{ marginRight: '4px' }} />
                            Save
                          </Button>
                          <Button onClick={() => { setEditingAdminId(null); setEditingRights([]); }} variant="secondary" size="sm">
                            <X size={14} style={{ marginRight: '4px' }} />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => handleEditAdmin(admin)} variant="secondary" size="sm">
                          <Edit2 size={14} style={{ marginRight: '4px' }} />
                          Edit Rights
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'roles' && (
        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)' }}>
              Role Templates
            </h2>
            <Button onClick={() => { setEditingRole(null); setRoleName(''); setRoleRights([]); setShowRoleModal(true); }} variant="primary">
              <Plus size={18} style={{ marginRight: '8px' }} />
              Create Role
            </Button>
          </div>

          {roles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xxl)', color: 'var(--text-light-color)' }}>
              <Shield size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p>No roles created yet</p>
              <p style={{ fontSize: 'var(--font-size-small)', marginTop: '8px' }}>Create a role template to quickly assign rights to new admins</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
              {roles.map((role) => (
                <div
                  key={role.id}
                  style={{
                    backgroundColor: 'var(--white)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--grey-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'bold', margin: 0 }}>
                      {role.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button onClick={() => handleEditRole(role)} variant="secondary" size="sm">
                        <Edit2 size={14} />
                      </Button>
                      <Button onClick={() => handleDeleteRole(role.id)} variant="danger" size="sm">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
                    {role.rights.length} right{role.rights.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                    {role.rights.map(right => (
                      <span key={right} style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: 'var(--grey-1-light)', borderRadius: '4px' }}>
                        {rightLabels[right] || right}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <Dialog
          isOpen={showInviteModal}
          onClose={() => { setShowInviteModal(false); setInviteEmail(''); setInviteRole('ops_manager'); }}
          title="Invite Administrator"
          size="medium"
          style={{ minHeight: '400px' }}
          actions={
            <>
              <Button onClick={() => { setShowInviteModal(false); setInviteEmail(''); setInviteRole('ops_manager'); }} variant="secondary" disabled={inviting}>
                Cancel
              </Button>
              <Button onClick={handleInvite} variant="primary" disabled={inviting}>
                {inviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', minHeight: '300px' }}>
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <PersonnalizedInputField
                label="Email Address"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>

            <DropdownField
              label="Role"
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
        </Dialog>
      )}

      {showRoleModal && (
        <Dialog
          isOpen={showRoleModal}
          onClose={() => { setShowRoleModal(false); setEditingRole(null); setRoleName(''); setRoleRights([]); }}
          title={editingRole ? 'Edit Role' : 'Create Role'}
          size="large"
          actions={
            <>
              <Button onClick={() => { setShowRoleModal(false); setEditingRole(null); setRoleName(''); setRoleRights([]); }} variant="secondary" disabled={savingRole}>
                Cancel
              </Button>
              <Button onClick={handleSaveRole} variant="primary" disabled={savingRole}>
                {savingRole ? 'Saving...' : (editingRole ? 'Update Role' : 'Create Role')}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <PersonnalizedInputField
              label="Role Name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g., Operations Manager, Finance Admin"
            />

            <div>
              <label style={{ fontSize: 'var(--font-size-small)', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                Select Rights for this Role
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', padding: '12px', border: '1px solid var(--grey-2)', borderRadius: 'var(--border-radius-sm)' }}>
                {Object.values(RIGHTS).map(right => (
                  <label key={right} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={roleRights.includes(right)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoleRights([...roleRights, right]);
                        } else {
                          setRoleRights(roleRights.filter(r => r !== right));
                        }
                      }}
                    />
                    <span>{rightLabels[right] || right}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default AdminManagement;


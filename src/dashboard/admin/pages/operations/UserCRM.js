import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Search, User, Building2, Eye, X, Filter, Check, Edit2, Save, Calendar, Users, FileText, Plus, ArrowLeft, ShieldCheck, Stethoscope, Trash2, LogOut, UserPlus, BarChart3 } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useAdminPermission } from '../../hooks/useAdminPermission';
import { PERMISSIONS } from '../../utils/rbac';
import { logAdminAction, ADMIN_AUDIT_EVENTS } from '../../../../utils/auditLogger';
import { useNavigate } from 'react-router-dom';
import Button from '../../../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../../../components/BoxedInputFields/Personnalized-InputField';
import DropdownField from '../../../../components/BoxedInputFields/Dropdown-Field';
import Dialog from '../../../../components/Dialog/Dialog';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import '../../../../styles/variables.css';

const UserCRM = () => {
  const { t } = useTranslation(['admin']);
  const { userProfile, startImpersonation } = useAuth();
  const navigate = useNavigate();

  // Filter State (Inputs)
  const [filters, setFilters] = useState({
    accountType: 'professional', // professional, facility
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    birthDate: ''
  });

  // Active Filters (Applied on Search)
  const [activeFilters, setActiveFilters] = useState({
    accountType: 'professional',
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    birthDate: ''
  });

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);

  // Cockpit State
  const [activeTab, setActiveTab] = useState('overview'); // overview, professional_profile, facility_profiles, shifts, notes
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Profile Data States
  const [professionalProfile, setProfessionalProfile] = useState(null);
  const [linkedFacilityProfiles, setLinkedFacilityProfiles] = useState([]);

  // Specific states for sub-edits
  const [isEditingProfessional, setIsEditingProfessional] = useState(false);
  const [profFormData, setProfFormData] = useState({});

  const [selectedFacilityId, setSelectedFacilityId] = useState(null); // For Master-Detail view in Facility Tab
  const [facilityFormData, setFacilityFormData] = useState({});
  const [isEditingFacility, setIsEditingFacility] = useState(false);

  // New Profile Creation State
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newFacilityName, setNewFacilityName] = useState('');

  // Facility Employees (for facility account type)
  const [facilityEmployees, setFacilityEmployees] = useState([]);
  const [facilityAdmins, setFacilityAdmins] = useState([]);

  // Add User to Facility State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Facility Stats State
  const [facilityStats, setFacilityStats] = useState({
    totalEmployees: 0,
    totalAdmins: 0,
    totalShifts: 0,
    activeShifts: 0,
    completedShifts: 0,
    cancelledShifts: 0
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // Facility Management Dialogs
  const [showDeleteFacilityDialog, setShowDeleteFacilityDialog] = useState(false);
  const [showLeaveFacilityDialog, setShowLeaveFacilityDialog] = useState(false);
  const [facilityActionConfirmText, setFacilityActionConfirmText] = useState('');
  const [facilityActionProcessing, setFacilityActionProcessing] = useState(false);
  const [targetFacilityForAction, setTargetFacilityForAction] = useState(null);

  const { hasRight, isSuperAdmin, canImpersonate, canViewUsers, adminRights } = useAdminPermission();

  const loadUsers = async (accountTypeOverride = null) => {
    if (!canViewUsers) {
      setError('You do not have permission to view users. Please contact an administrator.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const accountType = accountTypeOverride || activeFilters.accountType;
      let usersList = [];

      if (accountType === 'professional') {
        // CENTRALIZED QUERY: Get users who have a professionalProfile document
        const profilesSnapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES));
        
        for (const profileDoc of profilesSnapshot.docs) {
          const userId = profileDoc.id;
          const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId));
          
          if (userDoc.exists()) {
            usersList.push({
              id: userId,
              ...userDoc.data(),
              hasProfessionalProfile: true,
              professionalProfile: profileDoc.data(),
            });
          }
        }
      } else {
        // Facility query - get all facility profiles
        const facilitySnapshot = await getDocs(collection(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES));
        facilitySnapshot.forEach((docSnap) => {
          usersList.push({
            id: docSnap.id,
            ...docSnap.data()
          });
        });
      }

      setUsers(usersList);
      setSelectedUser(null);
      setError(null);

      if (usersList.length === 0) {
        setError(`No ${accountType}s found in the database.`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      console.error('Admin rights:', adminRights);
      console.error('Can view users:', canViewUsers);
      
      if (error.code === 'permission-denied' || error.message?.includes('permissions') || error.message?.includes('Permission')) {
        setError(`You do not have permission to view users. Please contact an administrator. (Error: ${error.code || error.message})`);
      } else {
        setError('Failed to load users: ' + (error.message || 'Unknown error'));
      }
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId, accountTypeOverride = null) => {
    try {
      const accountType = accountTypeOverride || activeFilters.accountType;
      const collectionName = accountType === 'professional' ? 'users' : 'facilityProfiles';
      const userDoc = await getDoc(doc(db, collectionName, userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Load shifts
        const shiftsRef = collection(db, 'shifts');
        const fieldToQuery = accountType === 'professional' ? 'assignedUserId' : 'facilityId';
        const shiftsQuery = query(shiftsRef, where(fieldToQuery, '==', userId));
        const shiftsSnapshot = await getDocs(shiftsQuery);

        const shifts = [];
        shiftsSnapshot.forEach((docSnap) => {
          shifts.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Load Professional Profile (if exists)
        let profProfile = null;
        if (activeFilters.accountType === 'professional') {
          const profProfileDoc = await getDoc(doc(db, 'professionalProfiles', userId));
          if (profProfileDoc.exists()) {
            profProfile = profProfileDoc.data();
          }
        }
        setProfessionalProfile(profProfile);
        setProfFormData(profProfile || {});

        // Load Linked Facility Profiles (for professional accounts)
        if (userData.facilityMemberships && userData.facilityMemberships.length > 0) {
          setLinkedFacilityProfiles(userData.facilityMemberships);
        } else {
          setLinkedFacilityProfiles([]);
        }

        // Load Facility Employees (for facility accounts)
        if (activeFilters.accountType === 'facility') {
          const employees = userData.employees || [];
          const admins = userData.admins || [];
          
          const employeesWithUserData = await Promise.all(
            employees.map(async (emp) => {
              try {
                const empUserDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, emp.uid));
                if (empUserDoc.exists()) {
                  const empUserData = empUserDoc.data();
                  return {
                    ...emp,
                    email: empUserData.email,
                    firstName: empUserData.firstName,
                    lastName: empUserData.lastName,
                    displayName: `${empUserData.firstName || ''} ${empUserData.lastName || ''}`.trim() || empUserData.email || emp.uid
                  };
                }
              } catch (error) {
                console.error(`Error loading user data for ${emp.uid}:`, error);
              }
              return { ...emp, displayName: emp.uid, email: '' };
            })
          );
          
          setFacilityEmployees(employeesWithUserData);
          setFacilityAdmins(admins);
          loadFacilityStats(userId, shifts);
        } else {
          setFacilityEmployees([]);
          setFacilityAdmins([]);
          setFacilityStats({
            totalEmployees: 0,
            totalAdmins: 0,
            totalShifts: 0,
            activeShifts: 0,
            completedShifts: 0,
            cancelledShifts: 0
          });
        }

        const fullUserData = {
          ...userData,
          id: userId,
          shifts,
          reliabilityScore: calculateReliabilityScore(shifts)
        };

        setSelectedUser(fullUserData);
        setFormData(userData);
        setIsEditing(false);
        setIsEditingProfessional(false);
        setIsEditingFacility(false);
        setSelectedFacilityId(null);
        setActiveTab('overview');
        setNewFacilityName('');
      }
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  // --- General User Edit ---
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const collectionName = activeFilters.accountType === 'professional' ? 'users' : 'facilityProfiles';
      const userRef = doc(db, collectionName, selectedUser.id);
      await updateDoc(userRef, { ...formData, updatedAt: serverTimestamp() });

      setSelectedUser(prev => ({ ...prev, ...formData }));
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...formData } : u));
      setIsEditing(false);
      logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_UPDATED,
        action: `Updated user details: ${selectedUser.id}`,
        resource: { type: 'user', id: selectedUser.id },
        details: { changes: formData }
      });
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Professional Profile Edit ---
  const handleProfInputChange = (section, field, value) => {
    setProfFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveProfessionalProfile = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'professionalProfiles', selectedUser.id), {
        ...profFormData,
        updatedAt: serverTimestamp()
      });
      setProfessionalProfile(profFormData);
      setIsEditingProfessional(false);
      logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_UPDATED, // Reuse event or create new
        action: `Updated professional profile: ${selectedUser.id}`,
        resource: { type: 'professionalProfile', id: selectedUser.id },
        details: { changes: profFormData }
      });
    } catch (error) {
      console.error("Error saving professional profile:", error);
      alert("Failed to save professional profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Facility Profile Edit (Master-Detail) ---
  const handleLoadFacilityDetails = async (facilityId) => {
    try {
      const docRef = doc(db, 'facilityProfiles', facilityId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setFacilityFormData({ id: facilityId, ...data });
        setSelectedFacilityId(facilityId);
        setIsEditingFacility(false);
      }
    } catch (error) {
      console.error("Error loading facility:", error);
    }
  };

  const handleFacilityInputChange = (section, field, value) => {
    setFacilityFormData(prev => {
      // Handle flat fields or nested
      if (section) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
      } else {
        return {
          ...prev,
          [field]: value
        };
      }
    });
  };

  const handleSaveFacilityProfile = async () => {
    if (!selectedFacilityId) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'facilityProfiles', selectedFacilityId), {
        ...facilityFormData,
        updatedAt: serverTimestamp()
      });
      // Update local list name if changed
      if (facilityFormData?.facilityDetails?.name) {
        setLinkedFacilityProfiles(prev => prev.map(f => f.facilityProfileId === selectedFacilityId || f.facilityId === selectedFacilityId ? { ...f, facilityName: facilityFormData.facilityDetails.name } : f));
      }
      setIsEditingFacility(false);
      logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_UPDATED,
        action: `Updated facility profile: ${selectedFacilityId}`,
        resource: { type: 'facilityProfile', id: selectedFacilityId },
        details: { changes: facilityFormData }
      });
    } catch (error) {
      console.error("Error saving facility profile:", error);
      alert("Failed to save facility profile.");
    } finally {
      setIsSaving(false);
    }
  };


  const calculateReliabilityScore = (shifts) => {
    if (shifts.length === 0) return 100;
    const completed = shifts.filter(s => s.status === 'completed').length;
    const noShows = shifts.filter(s => s.status === 'cancelled' && s.cancelledBy === 'user').length;
    return Math.max(0, ((completed / shifts.length) * 100) - (noShows * 10));
  };

  const handleImpersonate = async (userId) => {
    if (!canImpersonate) return;
    
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      alert('User not found');
      return;
    }

    const confirmMessage = `You are about to enter Ghost Mode and view the platform as ${targetUser.firstName || ''} ${targetUser.lastName || ''} (${targetUser.email || userId}).\n\nAll actions will be logged and attributed to you as the admin.\n\nDo you want to continue?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await startImpersonation(userId);
      
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_IMPERSONATED,
        action: `Started impersonation session for user ${targetUser.email || userId}`,
        resource: { type: 'user', id: userId, name: targetUser.displayName || targetUser.email },
        details: { 
          impersonatedUserId: userId,
          impersonatedUserEmail: targetUser.email,
          sessionStarted: new Date().toISOString()
        }
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error starting impersonation:', error);
      alert('Error starting impersonation: ' + (error.message || 'Unknown error'));
    }
  };

  const handleCreateProfessionalProfile = async () => {
    if (!selectedUser) return;
    if (!window.confirm("Bypass GLN and create Professional Profile?")) return;
    setIsCreatingProfile(true);
    try {
      const userId = selectedUser.id;
      const profileData = {
        userId: userId,
        role: 'professional',
        profileType: 'doctor', // Default
        identity: {
          firstName: selectedUser.firstName || '',
          lastName: selectedUser.lastName || '',
          legalFirstName: selectedUser.firstName || '',
          legalLastName: selectedUser.lastName || '',
          email: selectedUser.email || '',
        },
        contact: {
          primaryEmail: selectedUser.email || '',
          primaryPhone: selectedUser.phoneNumber || '',
          residentialAddress: selectedUser.address ? {
            street: selectedUser.address.street || '',
            city: selectedUser.address.city || '',
            postalCode: selectedUser.address.zipCode || '',
            canton: selectedUser.address.canton || '',
            country: 'CH'
          } : {}
        },
        professionalDetails: { qualifications: [], workExperience: [], education: [] },
        verification: {
          identityStatus: 'verified', overallVerificationStatus: 'verified',
          verificationDocuments: [{ documentId: `admin_override_${Date.now()}`, type: 'admin_override', fileName: 'Created by Admin', uploadedAt: new Date().toISOString(), status: 'verified', verificationStatus: 'verified' }]
        },
        GLN_certified: 'ADMIN_OVERRIDE',
        verificationStatus: 'verified',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'professionalProfiles', userId), profileData);
      await updateDoc(doc(db, 'users', userId), { 
        hasProfessionalProfile: true,
        role: 'professional',
        roles: arrayUnion('professional'), 
        professionalProfileId: userId, 
        updatedAt: serverTimestamp() 
      });
      await loadUserDetails(userId);
      alert('Professional Profile created.');
    } catch (error) {
      console.error(error);
      alert("Failed to create: " + error.message);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleCreateFacilityProfile = async () => {
    if (!selectedUser || !newFacilityName.trim()) { alert("Enter name"); return; }
    setIsCreatingProfile(true);
    try {
      const userId = selectedUser.id;
      const newFacilityId = `facility_${Date.now()}`;
      const facilityData = {
        role: 'facility',
        profileType: 'pharmacy',
        facilityDetails: {
          name: newFacilityName,
          additionalName: null,
          operatingAddress: {
            street: selectedUser.address?.street || '',
            city: selectedUser.address?.city || '',
            postalCode: selectedUser.address?.zipCode || '',
            canton: selectedUser.address?.canton || '',
            country: 'CH'
          },
          glnCompany: 'ADMIN_OVERRIDE',
          responsiblePersons: []
        },

        responsiblePersonIdentity: {
          firstName: selectedUser.firstName || '',
          lastName: selectedUser.lastName || '',
          dateOfBirth: selectedUser.birthDate || null,
          nationality: null,
          gender: null,
          documentType: null,
          documentNumber: null,
          documentExpiry: null,
          residentialAddress: selectedUser.address ? {
            street: selectedUser.address.street || '',
            city: selectedUser.address.city || '',
            postalCode: selectedUser.address.zipCode || '',
            canton: selectedUser.address.canton || '',
            country: 'CH'
          } : null
        },

        identityLegal: {
          legalCompanyName: newFacilityName,
          uidNumber: null
        },

        billingInformation: {
          legalName: newFacilityName,
          uidNumber: null,
          billingAddress: {
            street: selectedUser.address?.street || '',
            city: selectedUser.address?.city || '',
            postalCode: selectedUser.address?.zipCode || '',
            canton: selectedUser.address?.canton || '',
            country: selectedUser.address?.country || 'CH'
          },
          invoiceEmail: selectedUser.email || '',
          internalRef: '',
          verificationStatus: 'verified'
        },

        contact: {
          primaryEmail: selectedUser.email || '',
          primaryPhone: selectedUser.phoneNumber || '',
          primaryPhonePrefix: '' // Could parse if needed but empty is safe
        },

        verification: {
          identityStatus: 'verified',
          billingStatus: 'verified',
          overallVerificationStatus: 'verified',
          overallStatus: 'verified',
          verificationDocumentsProvided: [{
            documentId: `admin_override_${Date.now()}`,
            type: 'admin_override',
            fileName: 'Created by Admin CRM',
            uploadedAt: new Date().toISOString(),
            status: 'verified',
            verificationStatus: 'verified'
          }]
        },

        admins: [userId],
        employees: [{
          user_uid: userId,
          uid: userId,
          roles: ['admin'],
          rights: []
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Legacy/Flat fields for backward compat or easy search
        facilityName: newFacilityName,
        facilityProfileId: newFacilityId,
        glnNumber: 'ADMIN_OVERRIDE',
        GLN_certified: 'ADMIN_OVERRIDE',
        verificationStatus: 'verified'
      };
      await setDoc(doc(db, 'facilityProfiles', newFacilityId), facilityData);
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      const existingRoles = userData.roles || [];
      const updatedRoles = existingRoles.filter(r => r.facility_uid !== newFacilityId);
      updatedRoles.push({
        facility_uid: newFacilityId,
        roles: ['admin']
      });
      
      await updateDoc(userRef, {
        roles: updatedRoles,
        facilityMemberships: arrayUnion({ 
          facilityId: newFacilityId, 
          facilityProfileId: newFacilityId,
          facilityName: newFacilityName, 
          role: 'admin',
          joinedAt: new Date().toISOString()
        }),
        updatedAt: serverTimestamp()
      });
      await loadUserDetails(userId);
      setNewFacilityName('');
      alert('Facility Profile created.');
    } catch (error) {
      console.error(error);
      alert("Failed to create: " + error.message);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const handleDeleteFacility = async () => {
    if (facilityActionConfirmText !== 'DELETE FACILITY') return;
    if (!targetFacilityForAction || !selectedUser) return;

    setFacilityActionProcessing(true);
    try {
      const facilityId = targetFacilityForAction.facilityId || targetFacilityForAction.facilityProfileId || selectedUser?.id;

      const facilityRef = doc(db, 'facilityProfiles', facilityId);
      const facilitySnap = await getDoc(facilityRef);

      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const employees = facilityData.employees || [];
        const admins = facilityData.admins || [];

        const allUserIds = new Set();
        employees.forEach(emp => emp.uid && allUserIds.add(emp.uid));
        admins.forEach(adminId => adminId && allUserIds.add(adminId));
        if (facilityData.createdBy) allUserIds.add(facilityData.createdBy);

        for (const uid of allUserIds) {
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const updatedMemberships = (userData.facilityMemberships || []).filter(
              m => m.facilityId !== facilityId && m.facilityProfileId !== facilityId
            );
            await updateDoc(userRef, {
              facilityMemberships: updatedMemberships,
              updatedAt: serverTimestamp()
            });
          }
        }

        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();
          const memberships = userData.facilityMemberships || [];
          const hasFacility = memberships.some(m => m.facilityId === facilityId || m.facilityProfileId === facilityId);
          if (hasFacility) {
            const updatedMemberships = memberships.filter(
              m => m.facilityId !== facilityId && m.facilityProfileId !== facilityId
            );
            await updateDoc(doc(db, 'users', userDoc.id), {
              facilityMemberships: updatedMemberships,
              updatedAt: serverTimestamp()
            });
          }
        }

        await deleteDoc(facilityRef);

        await logAdminAction({
          eventType: ADMIN_AUDIT_EVENTS.USER_PROFILE_UPDATED,
          targetUserId: selectedUser.id,
          details: { action: 'delete_facility', facilityId, facilityName: targetFacilityForAction.facilityName }
        });
      }

      await loadUserDetails(selectedUser.id);
      setShowDeleteFacilityDialog(false);
      setFacilityActionConfirmText('');
      setTargetFacilityForAction(null);
      alert('Facility deleted successfully.');
    } catch (error) {
      console.error('Error deleting facility:', error);
      alert('Failed to delete facility: ' + error.message);
    } finally {
      setFacilityActionProcessing(false);
    }
  };

  const loadFacilityStats = async (facilityId, shifts = []) => {
    setLoadingStats(true);
    try {
      const facilityRef = doc(db, 'facilityProfiles', facilityId);
      const facilitySnap = await getDoc(facilityRef);
      
      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const employees = facilityData.employees || [];
        const admins = facilityData.admins || [];
        
        const now = new Date();
        const activeShifts = shifts.filter(s => {
          const start = s.startTime?.toDate ? s.startTime.toDate() : new Date(s.startTime);
          const end = s.endTime?.toDate ? s.endTime.toDate() : new Date(s.endTime);
          return start <= now && end >= now && s.status !== 'cancelled';
        });
        const completedShifts = shifts.filter(s => s.status === 'completed');
        const cancelledShifts = shifts.filter(s => s.status === 'cancelled');
        
        setFacilityStats({
          totalEmployees: employees.length,
          totalAdmins: admins.length,
          totalShifts: shifts.length,
          activeShifts: activeShifts.length,
          completedShifts: completedShifts.length,
          cancelledShifts: cancelledShifts.length
        });
      }
    } catch (error) {
      console.error('Error loading facility stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSearchUsers = async () => {
    if (!userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    
    setIsSearchingUsers(true);
    try {
      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const searchLower = userSearchQuery.toLowerCase();
      const allUsersSnapshot = await getDocs(usersRef);
      
      const results = [];
      allUsersSnapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const email = userData.email || '';
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';
        
        if (
          email.toLowerCase().includes(searchLower) ||
          firstName.toLowerCase().includes(searchLower) ||
          lastName.toLowerCase().includes(searchLower) ||
          `${firstName} ${lastName}`.toLowerCase().includes(searchLower)
        ) {
          results.push({
            id: docSnap.id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            displayName: `${firstName} ${lastName}`.trim() || email
          });
        }
      });
      
      setUserSearchResults(results.slice(0, 10));
    } catch (error) {
      console.error('Error searching users:', error);
      alert('Failed to search users: ' + error.message);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAddUserToFacility = async () => {
    if (!selectedUserToAdd || !selectedUser) {
      alert('Please select a user to add');
      return;
    }
    
    setIsAddingUser(true);
    try {
      const facilityId = selectedUser.id;
      const userId = selectedUserToAdd.id;
      
      const facilityRef = doc(db, 'facilityProfiles', facilityId);
      const facilitySnap = await getDoc(facilityRef);
      
      if (!facilitySnap.exists()) {
        alert('Facility not found');
        return;
      }
      
      const facilityData = facilitySnap.data();
      const existingEmployees = facilityData.employees || [];
      const existingAdmins = facilityData.admins || [];
      
      if (existingEmployees.some(e => e.uid === userId) || existingAdmins.includes(userId)) {
        alert('User is already a member of this facility');
        setIsAddingUser(false);
        return;
      }
      
      const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        alert('User not found');
        return;
      }
      
      const userData = userSnap.data();
      const facilityName = facilityData.facilityDetails?.name || facilityData.legalCompanyName || facilityData.facilityName || 'Facility';
      
      const newEmployee = {
        uid: userId,
        rights: 'employee'
      };
      
      await updateDoc(facilityRef, {
        employees: arrayUnion(newEmployee),
        updatedAt: serverTimestamp()
      });
      
      const existingMemberships = userData.facilityMemberships || [];
      const newMembership = {
        facilityId: facilityId,
        facilityProfileId: facilityId,
        facilityName: facilityName,
        role: 'employee',
        joinedAt: new Date().toISOString()
      };
      
      await updateDoc(userRef, {
        facilityMemberships: arrayUnion(newMembership),
        updatedAt: serverTimestamp()
      });
      
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_PROFILE_UPDATED,
        targetUserId: userId,
        details: { action: 'add_user_to_facility', facilityId, facilityName, addedBy: userProfile?.uid }
      });
      
      await loadUserDetails(facilityId, 'facility');
      setShowAddUserDialog(false);
      setUserSearchQuery('');
      setUserSearchResults([]);
      setSelectedUserToAdd(null);
      alert('User added to facility successfully');
    } catch (error) {
      console.error('Error adding user to facility:', error);
      alert('Failed to add user: ' + error.message);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleLeaveFacility = async () => {
    if (facilityActionConfirmText !== 'LEAVE FACILITY' && facilityActionConfirmText !== 'REMOVE EMPLOYEE') return;
    if (!targetFacilityForAction) return;

    setFacilityActionProcessing(true);
    try {
      const facilityId = targetFacilityForAction.facilityId || targetFacilityForAction.facilityProfileId || selectedUser?.id;
      const userId = targetFacilityForAction.employeeUid || selectedUser?.id;

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedMemberships = (userData.facilityMemberships || []).filter(
          m => m.facilityId !== facilityId && m.facilityProfileId !== facilityId
        );
        await updateDoc(userRef, {
          facilityMemberships: updatedMemberships,
          updatedAt: serverTimestamp()
        });
      }

      const facilityRef = doc(db, 'facilityProfiles', facilityId);
      const facilitySnap = await getDoc(facilityRef);
      if (facilitySnap.exists()) {
        const facilityData = facilitySnap.data();
        const updatedEmployees = (facilityData.employees || []).filter(e => e.uid !== userId);
        const updatedAdmins = (facilityData.admins || []).filter(a => a !== userId);
        await updateDoc(facilityRef, {
          employees: updatedEmployees,
          admins: updatedAdmins,
          updatedAt: serverTimestamp()
        });
      }

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_PROFILE_UPDATED,
        targetUserId: userId,
        details: { action: 'leave_facility', facilityId, facilityName: targetFacilityForAction.facilityName }
      });

      if (activeFilters.accountType === 'facility' && selectedUser?.id) {
        await loadUserDetails(selectedUser.id);
      } else {
        await loadUserDetails(userId);
      }
      setShowLeaveFacilityDialog(false);
      setFacilityActionConfirmText('');
      setTargetFacilityForAction(null);
      alert('User removed from facility successfully.');
    } catch (error) {
      console.error('Error leaving facility:', error);
      alert('Failed to leave facility: ' + error.message);
    } finally {
      setFacilityActionProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    // Basic filtering logic (same as before)
    if (activeFilters.email && !user.email?.toLowerCase().includes(activeFilters.email.toLowerCase())) return false;
    if (activeFilters.accountType === 'professional') {
      if (activeFilters.firstName && !user.firstName?.toLowerCase().includes(activeFilters.firstName.toLowerCase())) return false;
      if (activeFilters.lastName && !user.lastName?.toLowerCase().includes(activeFilters.lastName.toLowerCase())) return false;
      // Date filter logic omitted for brevity in this replace, assume keeping existing logic
      if (activeFilters.birthDate) {
        let userBirthDate = '';
        if (user.birthDate) {
          if (user.birthDate.toDate) userBirthDate = user.birthDate.toDate().toISOString().split('T')[0];
          else if (typeof user.birthDate === 'string') userBirthDate = user.birthDate.split('T')[0];
        }
        if (userBirthDate !== activeFilters.birthDate) return false;
      }
    } else {
      if (activeFilters.companyName && !user.legalCompanyName?.toLowerCase().includes(activeFilters.companyName.toLowerCase())) return false;
    }
    return true;
  });

  const handleSearch = async () => {
    setHasSearched(true);
    setActiveFilters(filters);
    await loadUsers(filters.accountType);
  };

  const resetFilters = () => {
    const defaultFilters = { accountType: 'professional', firstName: '', lastName: '', email: '', companyName: '', birthDate: '' };
    setFilters(defaultFilters); setActiveFilters(defaultFilters); setHasSearched(false);
  };

  if (!canViewUsers) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 'var(--spacing-md)' }}>
        <ShieldCheck size={64} style={{ color: 'var(--red-4)', opacity: 0.7 }} />
        <h2 style={{ fontSize: 'var(--font-size-xxlarge)', color: 'var(--text-color)', margin: 0 }}>
          Access Denied
        </h2>
        <p style={{ fontSize: 'var(--font-size-medium)', color: 'var(--grey-4)', textAlign: 'center', maxWidth: '500px' }}>
          You do not have permission to view users. Please contact an administrator.
        </p>
        <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--grey-3)', textAlign: 'center', maxWidth: '500px', marginTop: 'var(--spacing-sm)' }}>
          Your rights: {adminRights.length > 0 ? adminRights.join(', ') : 'None'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Title & Filter Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-large)', color: 'var(--text-color)', marginBottom: 0 }}>
          {t('admin:users.crm', 'User CRM')}
        </h1>
      </div>

      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
          <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Filter size={20} /> Search Criteria
          </h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button onClick={resetFilters} style={{ padding: '8px', border: '1px solid var(--grey-2)', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}><X size={14} /></button>
            <button onClick={handleSearch} style={{ padding: '8px 16px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={14} /> Search</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
          <DropdownField options={[{ value: 'professional', label: 'Professional' }, { value: 'facility', label: 'Facility' }]} value={filters.accountType} onChange={v => setFilters(p => ({ ...p, accountType: v }))} />
          {filters.accountType === 'professional' ? (
            <>
              <PersonnalizedInputField label="First Name" value={filters.firstName} onChange={e => setFilters(p => ({ ...p, firstName: e.target.value }))} placeholder="John" />
              <PersonnalizedInputField label="Last Name" value={filters.lastName} onChange={e => setFilters(p => ({ ...p, lastName: e.target.value }))} placeholder="Doe" />
            </>
          ) : (
            <div style={{ gridColumn: 'span 2' }}>
              <PersonnalizedInputField label="Company Name" value={filters.companyName} onChange={e => setFilters(p => ({ ...p, companyName: e.target.value }))} placeholder="Medical Center" />
            </div>
          )}
          <PersonnalizedInputField label="Email" value={filters.email} onChange={e => setFilters(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
          {filters.accountType === 'professional' && <PersonnalizedInputField label="Birthdate" type="date" value={filters.birthDate} onChange={e => setFilters(p => ({ ...p, birthDate: e.target.value }))} />}
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: 'var(--spacing-lg)' }}>
        {/* Left: User List */}
        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', height: '650px' }}>
          <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--grey-2)', backgroundColor: 'var(--grey-1-light)' }}>
            {filteredUsers.length} results
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div> :
              error ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--red-4)' }}>
                  <ShieldCheck size={40} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
                  {error}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                  <Search size={40} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.5 }} />
                  No users match your filters.
                </div>
              ) :
                filteredUsers.map(user => (
                  <button key={user.id} onClick={() => loadUserDetails(user.id)} style={{ width: '100%', textAlign: 'left', padding: '12px', borderBottom: '1px solid var(--grey-2)', background: selectedUser?.id === user.id ? 'rgba(37, 99, 235, 0.05)' : 'transparent', borderLeft: selectedUser?.id === user.id ? '4px solid var(--primary-color)' : 'none', cursor: 'pointer' }}>
                    <div style={{ fontWeight: 'bold' }}>{filters.accountType === 'professional' ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.displayName || 'No Name' : (user.facilityName || user.facilityDetails?.name || user.legalCompanyName || user.identityLegal?.legalCompanyName || 'Unnamed Facility')}</div>
                    <div style={{ fontSize: '0.85em', color: 'gray' }}>{user.mainEmail || user.contactPoints?.generalEmail || user.email}</div>
                  </button>
                ))}
          </div>
        </div>

        {/* Right: Cockpit details */}
        <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)', height: '650px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedUser ? (
            <>
              {/* Header */}
              <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--grey-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.5em' }}>
                      {filters.accountType === 'professional' ? `${selectedUser.firstName} ${selectedUser.lastName}` : (selectedUser.facilityName || selectedUser.facilityDetails?.name || selectedUser.legalCompanyName || selectedUser.identityLegal?.legalCompanyName || 'Unnamed Facility')}
                      <span style={{ marginLeft: '10px', fontSize: '0.6em', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px', verticalAlign: 'middle' }}>{activeFilters.accountType}</span>
                    </h2>
                    <div style={{ color: 'gray' }}>{selectedUser.mainEmail || selectedUser.contactPoints?.generalEmail || selectedUser.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {canImpersonate && <Button onClick={() => handleImpersonate(selectedUser.id)} variant="secondary" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Eye size={16} /> Impersonate</Button>}
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e5e7eb' }}>
                  {(activeFilters.accountType === 'facility' ? [
                    { id: 'overview', label: 'Facility Info', icon: Building2 },
                    { id: 'employees', label: 'Employees', icon: Users },
                    { id: 'stats', label: 'Stats', icon: BarChart3 },
                    { id: 'shifts', label: 'Shifts', icon: Calendar },
                    { id: 'admin_rights', label: 'Admin Rights', icon: ShieldCheck },
                    { id: 'notes', label: 'Internal Notes', icon: FileText }
                  ] : [
                    { id: 'overview', label: 'Overview', icon: User },
                    { id: 'professional_profile', label: 'Professional Profile', icon: Stethoscope },
                    { id: 'facility_profiles', label: 'Facility Profiles', icon: Building2 },
                    { id: 'shifts', label: 'Shifts', icon: Calendar },
                    { id: 'notes', label: 'Internal Notes', icon: FileText }
                  ]).map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setSelectedFacilityId(null); }}
                      style={{
                        padding: '8px 4px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
                        color: activeTab === tab.id ? 'var(--primary-color)' : 'gray',
                        fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <tab.icon size={16} /> {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>

                {/* OVERVIEW TAB (User/Facility Object) */}
                {activeTab === 'overview' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2em', color: '#111827' }}>
                        {activeFilters.accountType === 'facility' ? 'Facility Information' : 'Personal Information'}
                      </h3>
                      <div style={{ justifySelf: 'end', display: 'flex', justifyContent: 'flex-end', width: '100%', gap: '8px' }}>
                        {!isEditing ? (
                          <Button onClick={() => setIsEditing(true)} variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Edit2 size={14} /> Edit
                          </Button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <Button onClick={() => { setIsEditing(false); setFormData(selectedUser); }} variant="secondary">Cancel</Button>
                            <Button onClick={handleSaveUser} variant="primary" disabled={isSaving}>Save Changes</Button>
                          </div>
                        )}
                        {activeFilters.accountType === 'facility' && isSuperAdmin && (
                          <Button
                            onClick={() => { setTargetFacilityForAction({ facilityId: selectedUser.id, facilityName: selectedUser.facilityDetails?.name || selectedUser.legalCompanyName }); setShowDeleteFacilityDialog(true); }}
                            variant="danger"
                            size="sm"
                          >
                            <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete Facility
                          </Button>
                        )}
                      </div>
                    </div>
                    {activeFilters.accountType === 'facility' ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                          <PersonnalizedInputField label="Facility Name" value={isEditing ? (formData.facilityDetails?.name || formData.legalCompanyName) : (selectedUser.facilityDetails?.name || selectedUser.legalCompanyName)} onChange={e => setFormData(p => ({ ...p, facilityDetails: { ...p.facilityDetails, name: e.target.value }, legalCompanyName: e.target.value }))} readOnly={!isEditing} />
                          <PersonnalizedInputField label="Legal Company Name" value={isEditing ? formData.identityLegal?.legalCompanyName : selectedUser.identityLegal?.legalCompanyName} onChange={e => setFormData(p => ({ ...p, identityLegal: { ...p.identityLegal, legalCompanyName: e.target.value } }))} readOnly={!isEditing} />
                          <PersonnalizedInputField label="GLN Number" value={isEditing ? formData.glnNumber : selectedUser.glnNumber} onChange={e => handleInputChange('glnNumber', e.target.value)} readOnly={!isEditing} />
                          <PersonnalizedInputField label="Profile Type" value={isEditing ? formData.profileType : selectedUser.profileType} onChange={e => handleInputChange('profileType', e.target.value)} readOnly={!isEditing} />
                        </div>
                        <h4 style={{ marginTop: '24px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Contact Information</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                          <PersonnalizedInputField label="Email" value={isEditing ? formData.contactPoints?.generalEmail : selectedUser.contactPoints?.generalEmail} onChange={e => setFormData(p => ({ ...p, contactPoints: { ...p.contactPoints, generalEmail: e.target.value } }))} readOnly={!isEditing} />
                          <PersonnalizedInputField label="Phone" value={isEditing ? formData.contactPoints?.generalPhone : selectedUser.contactPoints?.generalPhone} onChange={e => setFormData(p => ({ ...p, contactPoints: { ...p.contactPoints, generalPhone: e.target.value } }))} readOnly={!isEditing} />
                        </div>
                        <h4 style={{ marginTop: '24px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Verification Status</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                          <div style={{ padding: '12px', background: selectedUser.verification?.overallStatus === 'verified' ? '#f0fdf4' : '#fef3c7', borderRadius: '8px', border: `1px solid ${selectedUser.verification?.overallStatus === 'verified' ? '#bbf7d0' : '#fcd34d'}` }}>
                            <div style={{ fontSize: '0.85em', color: 'gray' }}>Overall Status</div>
                            <div style={{ fontWeight: 'bold', color: selectedUser.verification?.overallStatus === 'verified' ? '#166534' : '#92400e' }}>{selectedUser.verification?.overallStatus || 'Pending'}</div>
                          </div>
                          <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '0.85em', color: 'gray' }}>Identity Status</div>
                            <div style={{ fontWeight: 'bold' }}>{selectedUser.verification?.identityStatus || 'N/A'}</div>
                          </div>
                          <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '0.85em', color: 'gray' }}>Billing Status</div>
                            <div style={{ fontWeight: 'bold' }}>{selectedUser.verification?.billingStatus || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        <PersonnalizedInputField label="First Name" value={isEditing ? formData.firstName : selectedUser.firstName} onChange={e => handleInputChange('firstName', e.target.value)} readOnly={!isEditing} />
                        <PersonnalizedInputField label="Last Name" value={isEditing ? formData.lastName : selectedUser.lastName} onChange={e => handleInputChange('lastName', e.target.value)} readOnly={!isEditing} />
                        <PersonnalizedInputField label="Email" value={isEditing ? formData.email : selectedUser.email} onChange={e => handleInputChange('email', e.target.value)} readOnly={!isEditing} />
                        <PersonnalizedInputField label="Phone" value={isEditing ? formData.phoneNumber : selectedUser.phoneNumber} onChange={e => handleInputChange('phoneNumber', e.target.value)} readOnly={!isEditing} />
                      </div>
                    )}
                  </div>
                )}

                {/* PROFESSIONAL PROFILE TAB */}
                {activeTab === 'professional_profile' && (
                  <div>
                    {professionalProfile ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', alignItems: 'center', marginBottom: '24px', padding: '16px 20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', background: '#dcfce7', borderRadius: '50%' }}>
                              <ShieldCheck size={20} color="#16a34a" />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, color: '#166534', fontSize: '1em', fontWeight: '600' }}>Professional Profile Active</h3>
                              <div style={{ fontSize: '0.85em', color: '#15803d', marginTop: '2px' }}>
                                Verified • {professionalProfile.GLN_certified === 'ADMIN_OVERRIDE' && 'Admin Override'}
                              </div>
                            </div>
                          </div>
                          <div style={{ justifySelf: 'end', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                            {!isEditingProfessional ? (
                              <Button onClick={() => setIsEditingProfessional(true)} variant="secondary" style={{ background: 'white', border: '1px solid #bbf7d0', color: '#166534' }}>
                                <Edit2 size={14} style={{ marginRight: 6 }} /> Edit Profile
                              </Button>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <Button onClick={() => { setIsEditingProfessional(false); setProfFormData(professionalProfile); }} variant="secondary" style={{ background: 'white' }}>Cancel</Button>
                                <Button onClick={handleSaveProfessionalProfile} variant="primary" disabled={isSaving}>Save Changes</Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <h4 style={{ marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginTop: '24px' }}>Identity & Contact</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                          <PersonnalizedInputField label="Legal First Name" value={isEditingProfessional ? profFormData.identity?.legalFirstName : professionalProfile.identity?.legalFirstName} onChange={e => handleProfInputChange('identity', 'legalFirstName', e.target.value)} readOnly={!isEditingProfessional} />
                          <PersonnalizedInputField label="Legal Last Name" value={isEditingProfessional ? profFormData.identity?.legalLastName : professionalProfile.identity?.legalLastName} onChange={e => handleProfInputChange('identity', 'legalLastName', e.target.value)} readOnly={!isEditingProfessional} />
                          <PersonnalizedInputField label="Contact Email" value={isEditingProfessional ? profFormData.contact?.primaryEmail : professionalProfile.contact?.primaryEmail} onChange={e => handleProfInputChange('contact', 'primaryEmail', e.target.value)} readOnly={!isEditingProfessional} />
                          <PersonnalizedInputField label="Contact Phone" value={isEditingProfessional ? profFormData.contact?.primaryPhone : professionalProfile.contact?.primaryPhone} onChange={e => handleProfInputChange('contact', 'primaryPhone', e.target.value)} readOnly={!isEditingProfessional} />
                        </div>

                        <h4 style={{ marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginTop: '24px' }}>Address</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <PersonnalizedInputField label="Street" value={isEditingProfessional ? profFormData.contact?.residentialAddress?.street : professionalProfile.contact?.residentialAddress?.street} onChange={e => setProfFormData(p => ({ ...p, contact: { ...p.contact, residentialAddress: { ...p.contact.residentialAddress, street: e.target.value } } }))} readOnly={!isEditingProfessional} />
                          <PersonnalizedInputField label="City" value={isEditingProfessional ? profFormData.contact?.residentialAddress?.city : professionalProfile.contact?.residentialAddress?.city} onChange={e => setProfFormData(p => ({ ...p, contact: { ...p.contact, residentialAddress: { ...p.contact.residentialAddress, city: e.target.value } } }))} readOnly={!isEditingProfessional} />
                          <PersonnalizedInputField label="Zip Code" value={isEditingProfessional ? profFormData.contact?.residentialAddress?.postalCode : professionalProfile.contact?.residentialAddress?.postalCode} onChange={e => setProfFormData(p => ({ ...p, contact: { ...p.contact, residentialAddress: { ...p.contact.residentialAddress, postalCode: e.target.value } } }))} readOnly={!isEditingProfessional} />
                        </div>

                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <p>{t('admin:crm.noProfileExists', 'No professional profile exists for this user.')}</p>
                        <Button onClick={handleCreateProfessionalProfile} variant="primary" disabled={isCreatingProfile}>
                          {isCreatingProfile ? t('admin:crm.creating', 'Creating...') : t('admin:crm.createProfile', 'Create Professional Profile (Bypass GLN)')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* FACILITY PROFILES TAB (Master-Detail) */}
                {activeTab === 'facility_profiles' && (
                  <div>
                    {!selectedFacilityId ? (
                      // List View
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2em' }}>Linked Facilities</h3>
                          <span style={{ fontSize: '0.9em', color: 'gray', background: '#f3f4f6', padding: '4px 12px', borderRadius: '12px' }}>{linkedFacilityProfiles.length} Total</span>
                        </div>
                        {linkedFacilityProfiles.length > 0 ? (
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {linkedFacilityProfiles.map((f, i) => (
                              <div key={i} style={{ padding: '16px', border: '1px solid #eee', borderRadius: '8px', background: 'white' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <strong style={{ fontSize: '1.1em' }}>{f.facilityName}</strong>
                                    <div style={{ fontSize: '0.9em', color: 'gray' }}>Role: {f.role} | ID: {f.facilityId}</div>
                                  </div>
                                  <Button onClick={async () => {
                                    const fid = f.facilityId || f.facilityProfileId;
                                    setActiveFilters(prev => ({ ...prev, accountType: 'facility' }));
                                    setFilters(prev => ({ ...prev, accountType: 'facility' }));
                                    await loadUsers('facility');
                                    await loadUserDetails(fid, 'facility');
                                  }} variant="secondary" style={{ fontSize: '0.9em', maxWidth: '150px' }}>
                                    View Details & Edit
                                  </Button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
                                  <Button
                                    onClick={() => { setTargetFacilityForAction(f); setShowLeaveFacilityDialog(true); }}
                                    variant="secondary"
                                    size="sm"
                                    style={{ fontSize: '0.85em' }}
                                  >
                                    <LogOut size={14} style={{ marginRight: '4px' }} /> Leave Facility
                                  </Button>
                                  {isSuperAdmin && (
                                    <Button
                                      onClick={() => { setTargetFacilityForAction(f); setShowDeleteFacilityDialog(true); }}
                                      variant="danger"
                                      size="sm"
                                      style={{ fontSize: '0.85em' }}
                                    >
                                      <Trash2 size={14} style={{ marginRight: '4px' }} /> Delete Facility
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: 'gray', fontStyle: 'italic' }}>No facilities linked.</p>
                        )}

                        <div style={{ marginTop: '30px', padding: '24px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                          <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1em', color: '#111827' }}>Create New Facility</h4>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                              <PersonnalizedInputField
                                label="Facility Name"
                                value={newFacilityName}
                                onChange={e => setNewFacilityName(e.target.value)}
                                placeholder="e.g. Pharmacy Plus"
                                marginBottom="0"
                              />
                            </div>
                            <div style={{ marginBottom: '2px' }}>
                              <Button
                                onClick={handleCreateFacilityProfile}
                                variant="primary"
                                disabled={isCreatingProfile || !newFacilityName}
                                style={{ height: '42px', whiteSpace: 'nowrap', maxWidth: '200px' }}
                              >
                                {isCreatingProfile ? 'Creating...' : 'Create Facility'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Detail View
                      <div>
                        <button onClick={() => setSelectedFacilityId(null)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'gray', marginBottom: '16px' }}>
                          <ArrowLeft size={16} /> Back to List
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '70% 30%', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
                          <h3 style={{ margin: 0 }}>Facility Details</h3>
                          <div style={{ justifySelf: 'end', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                            {!isEditingFacility ? (
                              <Button onClick={() => setIsEditingFacility(true)} variant="primary" style={{ maxWidth: '180px' }}><Edit2 size={16} /> Edit Facility</Button>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <Button onClick={() => { setIsEditingFacility(false); setSelectedFacilityId(null); }} variant="secondary" style={{ marginRight: 0, maxWidth: '120px' }}>Cancel</Button>
                                <Button onClick={handleSaveFacilityProfile} variant="primary" disabled={isSaving} style={{ maxWidth: '180px' }}>Save</Button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <h4 style={{ marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginTop: '12px' }}>Basic Info</h4>
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                              <PersonnalizedInputField label="Facility Name" value={isEditingFacility ? facilityFormData.facilityDetails?.name : facilityFormData.facilityDetails?.name} onChange={e => handleFacilityInputChange('facilityDetails', 'name', e.target.value)} readOnly={!isEditingFacility} />
                            </div>
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                              <PersonnalizedInputField label="Legal Name" value={isEditingFacility ? facilityFormData.identityLegal?.legalCompanyName : facilityFormData.identityLegal?.legalCompanyName} onChange={e => handleFacilityInputChange('identityLegal', 'legalCompanyName', e.target.value)} readOnly={!isEditingFacility} />
                            </div>
                          </div>
                          <div>
                            <h4 style={{ marginBottom: '24px', borderBottom: '1px solid #eee', paddingBottom: '8px', marginTop: '12px' }}>Contact</h4>
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                              <PersonnalizedInputField label="Email" value={isEditingFacility ? facilityFormData.contact?.primaryEmail : facilityFormData.contact?.primaryEmail} onChange={e => handleFacilityInputChange('contact', 'primaryEmail', e.target.value)} readOnly={!isEditingFacility} />
                            </div>
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                              <PersonnalizedInputField label="Phone" value={isEditingFacility ? facilityFormData.contact?.primaryPhone : facilityFormData.contact?.primaryPhone} onChange={e => handleFacilityInputChange('contact', 'primaryPhone', e.target.value)} readOnly={!isEditingFacility} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* EMPLOYEES TAB (Facility only) */}
                {activeTab === 'employees' && activeFilters.accountType === 'facility' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2em' }}>Facility Employees</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.9em', color: 'gray', background: '#f3f4f6', padding: '4px 12px', borderRadius: '12px' }}>{facilityEmployees.length} Total</span>
                        <Button
                          onClick={() => setShowAddUserDialog(true)}
                          variant="primary"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <UserPlus size={16} /> Add User to Facility
                        </Button>
                      </div>
                    </div>
                    {facilityEmployees.length > 0 ? (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {facilityEmployees.map((emp, i) => (
                          <div key={i} style={{ padding: '16px', border: '1px solid #eee', borderRadius: '8px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <strong>{emp.displayName || emp.uid}</strong>
                              {emp.email && <div style={{ fontSize: '0.85em', color: 'gray' }}>{emp.email}</div>}
                              <div style={{ fontSize: '0.9em', color: 'gray', marginTop: '4px' }}>Rights: {emp.rights || 'employee'} {facilityAdmins.includes(emp.uid) && '• Admin'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <Button
                                onClick={() => { setTargetFacilityForAction({ facilityId: selectedUser.id, facilityName: selectedUser.facilityDetails?.name, employeeUid: emp.uid }); setShowLeaveFacilityDialog(true); }}
                                variant="secondary"
                                size="sm"
                              >
                                <LogOut size={14} style={{ marginRight: '4px' }} /> Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'gray', fontStyle: 'italic' }}>No employees in this facility.</p>
                    )}
                  </div>
                )}

                {/* STATS TAB (Facility only) */}
                {activeTab === 'stats' && activeFilters.accountType === 'facility' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2em' }}>Facility Statistics</h3>
                    </div>
                    {loadingStats ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'gray' }}>Loading statistics...</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        <div style={{ padding: '20px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                          <div style={{ fontSize: '0.85em', color: '#0369a1', marginBottom: '8px' }}>Total Employees</div>
                          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#0c4a6e' }}>{facilityStats.totalEmployees}</div>
                        </div>
                        <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '0.85em', color: '#166534', marginBottom: '8px' }}>Administrators</div>
                          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#14532d' }}>{facilityStats.totalAdmins}</div>
                        </div>
                        <div style={{ padding: '20px', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                          <div style={{ fontSize: '0.85em', color: '#92400e', marginBottom: '8px' }}>Total Shifts</div>
                          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#78350f' }}>{facilityStats.totalShifts}</div>
                        </div>
                        <div style={{ padding: '20px', background: '#dbeafe', borderRadius: '12px', border: '1px solid #93c5fd' }}>
                          <div style={{ fontSize: '0.85em', color: '#1e40af', marginBottom: '8px' }}>Active Shifts</div>
                          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#1e3a8a' }}>{facilityStats.activeShifts}</div>
                        </div>
                        <div style={{ padding: '20px', background: '#dcfce7', borderRadius: '12px', border: '1px solid #86efac' }}>
                          <div style={{ fontSize: '0.85em', color: '#166534', marginBottom: '8px' }}>Completed Shifts</div>
                          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#14532d' }}>{facilityStats.completedShifts}</div>
                        </div>
                        <div style={{ padding: '20px', background: '#fee2e2', borderRadius: '12px', border: '1px solid #fca5a5' }}>
                          <div style={{ fontSize: '0.85em', color: '#991b1b', marginBottom: '8px' }}>Cancelled Shifts</div>
                          <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#7f1d1d' }}>{facilityStats.cancelledShifts}</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ADMIN RIGHTS TAB (Facility only) */}
                {activeTab === 'admin_rights' && activeFilters.accountType === 'facility' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2em' }}>Facility Administrators</h3>
                      <span style={{ fontSize: '0.9em', color: 'gray', background: '#f3f4f6', padding: '4px 12px', borderRadius: '12px' }}>{facilityAdmins.length} Admins</span>
                    </div>
                    <p style={{ fontSize: '0.9em', color: 'gray', marginBottom: '16px' }}>Administrators have full access to manage this facility, including employees, schedules, and settings.</p>
                    {facilityAdmins.length > 0 ? (
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {facilityAdmins.map((adminUid, i) => (
                          <div key={i} style={{ padding: '16px', border: '1px solid #bbf7d0', borderRadius: '8px', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ padding: '8px', background: '#dcfce7', borderRadius: '50%' }}>
                                <ShieldCheck size={16} color="#16a34a" />
                              </div>
                              <div>
                                <strong>{adminUid}</strong>
                                <div style={{ fontSize: '0.85em', color: '#166534' }}>Administrator</div>
                              </div>
                            </div>
                            {facilityAdmins.length > 1 && (
                              <Button
                                onClick={async () => {
                                  if (!window.confirm('Remove admin rights for this user?')) return;
                                  try {
                                    const facilityRef = doc(db, 'facilityProfiles', selectedUser.id);
                                    const newAdmins = facilityAdmins.filter(a => a !== adminUid);
                                    const newEmployees = facilityEmployees.map(e => e.uid === adminUid ? { ...e, rights: 'employee' } : e);
                                    await updateDoc(facilityRef, { admins: newAdmins, employees: newEmployees, updatedAt: serverTimestamp() });
                                    setFacilityAdmins(newAdmins);
                                    setFacilityEmployees(newEmployees);
                                    alert('Admin rights removed.');
                                  } catch (error) {
                                    alert('Failed: ' + error.message);
                                  }
                                }}
                                variant="secondary"
                                size="sm"
                              >
                                Demote to Employee
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'gray', fontStyle: 'italic' }}>No administrators found.</p>
                    )}

                    <h4 style={{ marginTop: '24px', marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Promote Employee to Admin</h4>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {facilityEmployees.filter(e => !facilityAdmins.includes(e.uid)).map((emp, i) => (
                        <div key={i} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '8px', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{emp.uid}</span>
                          <Button
                            onClick={async () => {
                              try {
                                const facilityRef = doc(db, 'facilityProfiles', selectedUser.id);
                                const newAdmins = [...facilityAdmins, emp.uid];
                                const newEmployees = facilityEmployees.map(e => e.uid === emp.uid ? { ...e, rights: 'admin' } : e);
                                await updateDoc(facilityRef, { admins: newAdmins, employees: newEmployees, updatedAt: serverTimestamp() });
                                setFacilityAdmins(newAdmins);
                                setFacilityEmployees(newEmployees);
                                alert('Admin rights granted.');
                              } catch (error) {
                                alert('Failed: ' + error.message);
                              }
                            }}
                            variant="primary"
                            size="sm"
                          >
                            <ShieldCheck size={14} style={{ marginRight: '4px' }} /> Make Admin
                          </Button>
                        </div>
                      ))}
                      {facilityEmployees.filter(e => !facilityAdmins.includes(e.uid)).length === 0 && (
                        <p style={{ color: 'gray', fontStyle: 'italic' }}>All employees are already administrators.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* SHIFTS TAB */}
                {activeTab === 'shifts' && (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                      <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', flex: 1, border: '1px solid #eee' }}>
                        <div style={{ fontSize: '0.85em', color: 'gray' }}>Total Shifts</div>
                        <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{selectedUser.shifts?.length || 0}</div>
                      </div>
                      {activeFilters.accountType === 'professional' && (
                        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', flex: 1, border: '1px solid #eee' }}>
                          <div style={{ fontSize: '0.85em', color: 'gray' }}>Reliability</div>
                          <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{selectedUser.reliabilityScore?.toFixed(0)}%</div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedUser.shifts?.length > 0 ? selectedUser.shifts.map(shift => (
                        <div key={shift.id} style={{ padding: '12px', border: '1px solid #eee', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                          <div><strong>{shift.role || shift.title || 'Shift'}</strong> <span style={{ color: 'gray' }}>{shift.date?.toDate?.()?.toLocaleDateString() || shift.startTime?.toDate?.()?.toLocaleDateString() || 'N/A'}</span></div>
                          <span style={{ fontWeight: 'bold', color: shift.status === 'completed' ? 'green' : 'orange' }}>{shift.status}</span>
                        </div>
                      )) : (
                        <p style={{ color: 'gray', fontStyle: 'italic' }}>No shifts found.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                  <div>
                    <textarea style={{ width: '100%', height: '200px', padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} placeholder="Admin notes..." />
                    <div style={{ marginTop: '10px', textAlign: 'right' }}><Button variant="primary">Save Notes</Button></div>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'gray' }}>Select a user</div>
          )}
        </div>
      </div>

      {/* Delete Facility Dialog */}
      <Dialog
        isOpen={showDeleteFacilityDialog}
        onClose={() => { setShowDeleteFacilityDialog(false); setFacilityActionConfirmText(''); setTargetFacilityForAction(null); }}
        title="Delete Facility"
        size="small"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => { setShowDeleteFacilityDialog(false); setFacilityActionConfirmText(''); }} variant="secondary" disabled={facilityActionProcessing}>
              Cancel
            </Button>
            <Button onClick={handleDeleteFacility} variant="danger" disabled={facilityActionProcessing || facilityActionConfirmText !== 'DELETE FACILITY'}>
              {facilityActionProcessing ? 'Deleting...' : 'Delete Facility'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="font-bold text-red-600">This action cannot be undone!</p>
          <p>This will permanently delete the facility <strong>{targetFacilityForAction?.facilityName}</strong> and remove all user associations.</p>
          <p className="text-sm text-muted-foreground">Type <strong>DELETE FACILITY</strong> to confirm:</p>
          <PersonnalizedInputField
            value={facilityActionConfirmText}
            onChange={e => setFacilityActionConfirmText(e.target.value)}
            placeholder="DELETE FACILITY"
          />
        </div>
      </Dialog>

      {/* Leave/Remove Facility Dialog */}
      <Dialog
        isOpen={showLeaveFacilityDialog}
        onClose={() => { setShowLeaveFacilityDialog(false); setFacilityActionConfirmText(''); setTargetFacilityForAction(null); }}
        title={targetFacilityForAction?.employeeUid ? "Remove Employee" : "Leave Facility"}
        size="small"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => { setShowLeaveFacilityDialog(false); setFacilityActionConfirmText(''); }} variant="secondary" disabled={facilityActionProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleLeaveFacility}
              variant="warning"
              disabled={facilityActionProcessing || (targetFacilityForAction?.employeeUid ? facilityActionConfirmText !== 'REMOVE EMPLOYEE' : facilityActionConfirmText !== 'LEAVE FACILITY')}
            >
              {facilityActionProcessing ? 'Processing...' : (targetFacilityForAction?.employeeUid ? 'Remove Employee' : 'Leave Facility')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {targetFacilityForAction?.employeeUid ? (
            <>
              <p>This will remove employee <strong>{targetFacilityForAction.employeeUid}</strong> from <strong>{targetFacilityForAction?.facilityName || 'this facility'}</strong>.</p>
              <p className="text-sm text-muted-foreground">The employee will lose access to this facility.</p>
              <p className="text-sm text-muted-foreground">Type <strong>REMOVE EMPLOYEE</strong> to confirm:</p>
              <PersonnalizedInputField
                value={facilityActionConfirmText}
                onChange={e => setFacilityActionConfirmText(e.target.value)}
                placeholder="REMOVE EMPLOYEE"
              />
            </>
          ) : (
            <>
              <p>This will remove <strong>{selectedUser?.firstName} {selectedUser?.lastName}</strong> from <strong>{targetFacilityForAction?.facilityName}</strong>.</p>
              <p className="text-sm text-muted-foreground">The user's membership will be removed and they will no longer have access to this facility.</p>
              <p className="text-sm text-muted-foreground">Type <strong>LEAVE FACILITY</strong> to confirm:</p>
              <PersonnalizedInputField
                value={facilityActionConfirmText}
                onChange={e => setFacilityActionConfirmText(e.target.value)}
                placeholder="LEAVE FACILITY"
              />
            </>
          )}
        </div>
      </Dialog>

      {/* Add User to Facility Dialog */}
      <Dialog
        isOpen={showAddUserDialog}
        onClose={() => { setShowAddUserDialog(false); setUserSearchQuery(''); setUserSearchResults([]); setSelectedUserToAdd(null); }}
        title="Add User to Facility"
        size="medium"
        actions={
          <>
            <Button onClick={() => { setShowAddUserDialog(false); setUserSearchQuery(''); setUserSearchResults([]); setSelectedUserToAdd(null); }} variant="secondary" disabled={isAddingUser}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUserToFacility}
              variant="primary"
              disabled={isAddingUser || !selectedUserToAdd}
            >
              {isAddingUser ? 'Adding...' : 'Add User'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', fontWeight: '500' }}>Search by Email or Name</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <PersonnalizedInputField
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                placeholder="Enter email or name..."
                onKeyPress={e => e.key === 'Enter' && handleSearchUsers()}
                style={{ flex: 1 }}
              />
              <Button onClick={handleSearchUsers} variant="secondary" disabled={isSearchingUsers || !userSearchQuery.trim()}>
                <Search size={16} style={{ marginRight: '4px' }} /> {isSearchingUsers ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
          
          {userSearchResults.length > 0 && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', fontWeight: '500' }}>Select User</label>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                {userSearchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserToAdd(user)}
                    style={{
                      padding: '12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                      backgroundColor: selectedUserToAdd?.id === user.id ? '#eff6ff' : 'white',
                      borderLeft: selectedUserToAdd?.id === user.id ? '4px solid var(--primary-color)' : 'none'
                    }}
                  >
                    <div style={{ fontWeight: '500' }}>{user.displayName}</div>
                    <div style={{ fontSize: '0.85em', color: 'gray' }}>{user.email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {selectedUserToAdd && (
            <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.85em', color: '#166534', marginBottom: '4px' }}>Selected User:</div>
              <div style={{ fontWeight: '500' }}>{selectedUserToAdd.displayName}</div>
              <div style={{ fontSize: '0.85em', color: '#15803d' }}>{selectedUserToAdd.email}</div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default UserCRM;

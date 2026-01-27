import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../../config/keysDatabase';
import { User, Building2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/rbac';
import { logAdminAction, ADMIN_AUDIT_EVENTS } from '../../../../utils/auditLogger';

const AccountCreationTool = () => {
  const { t } = useTranslation(['admin']);
  const { userProfile } = useAuth();
  const [accountType, setAccountType] = useState('professional');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const canCreateAccounts = hasPermission(userProfile?.roles || [], PERMISSIONS.MANAGE_EMPLOYEES) ||
    userProfile?.roles?.includes('admin') ||
    userProfile?.roles?.includes('super_admin');

  const handleCreateAccount = async () => {
    if (!userId.trim() || !email.trim()) {
      setError('User ID and Email are required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const userDocRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        setError('User does not exist in Firebase Auth. Please create the user first.');
        setLoading(false);
        return;
      }

      if (accountType === 'professional') {
        await createProfessionalAccount(userId, email, firstName, lastName);
      } else {
        await createFacilityAccount(userId, email, firstName, lastName);
      }

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.ACCOUNT_CREATED,
        action: `Created ${accountType} account: ${email}`,
        resource: {
          type: accountType,
          id: userId,
          email
        },
        details: {
          accountType,
          userId,
          email,
          firstName,
          lastName,
          createdBy: userProfile?.uid || 'admin',
          createdByName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || userProfile?.email,
          bypassedVerification: true
        }
      });

      setResult({
        success: true,
        message: `${accountType === 'professional' ? 'Professional' : 'Facility'} account created successfully for ${email}`,
        userId
      });
    } catch (err) {
      console.error('Error creating account:', err);
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.ACCOUNT_CREATED,
        action: `Failed to create ${accountType} account: ${email}`,
        resource: { type: accountType, email },
        details: { error: err.message },
        success: false,
        errorMessage: err.message || 'Failed to create account'
      });
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const createProfessionalAccount = async (userId, email, firstName, lastName) => {
    const now = serverTimestamp();
    const timestamp = new Date();

    const userData = {
      uid: userId,
      email: email,
      firstName: firstName || email.split('@')[0],
      lastName: lastName || '',
      displayName: `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
      emailVerified: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      adminCreated: true,
      adminCreatedAt: now
    };

    await setDoc(doc(db, 'users', userId), userData, { merge: true });

    const professionalProfileData = {
      userId: userId,
      email: email,
      firstName: firstName || email.split('@')[0],
      lastName: lastName || '',
      legalFirstName: firstName || email.split('@')[0],
      legalLastName: lastName || '',
      profileType: 'doctor',
      tutorialAccessMode: 'disabled',
      profileVisibility: 'public',
      verification: {
        status: 'approved',
        verifiedAt: now,
        verifiedBy: 'admin',
        bypassed: true
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await setDoc(doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userId), professionalProfileData, { merge: true });
  };

  const createFacilityAccount = async (userId, email, firstName, lastName) => {
    const now = serverTimestamp();
    const timestamp = new Date();

    const userData = {
      uid: userId,
      email: email,
      firstName: firstName || email.split('@')[0],
      lastName: lastName || '',
      displayName: `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
      emailVerified: true,
      roles: [
        { facility_uid: userId, roles: ['admin'] }
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
      adminCreated: true,
      adminCreatedAt: now
    };

    await setDoc(doc(db, 'users', userId), userData, { merge: true });

    const facilityProfileData = {
      userId: userId,
      email: email,
      facilityProfileId: userId,
      legalCompanyName: firstName || email.split('@')[0],
      profileType: 'pharmacy',
      tutorialAccessMode: 'disabled',

      facilityDetails: {
        name: firstName || email.split('@')[0],
        additionalName: null,
        operatingAddress: {
          street: '',
          city: '',
          postalCode: '',
          canton: '',
          country: 'CH'
        },
        glnCompany: 'ADMIN_OVERRIDE',
        responsiblePersons: []
      },

      responsiblePersonIdentity: {
        firstName: 'Admin',
        lastName: 'Created',
        dateOfBirth: null,
        nationality: null,
        gender: null,
        documentType: null,
        documentNumber: null,
        documentExpiry: null,
        residentialAddress: null
      },

      identityLegal: {
        legalCompanyName: firstName || email.split('@')[0],
        uidNumber: null
      },

      billingInformation: {
        legalName: firstName || email.split('@')[0],
        uidNumber: null,
        billingAddress: {
          street: '',
          city: '',
          postalCode: '',
          canton: '',
          country: 'CH'
        },
        invoiceEmail: email,
        internalRef: '',
        verificationStatus: 'verified' // Auto-verify for admin created
      },

      contact: {
        primaryEmail: email,
        primaryPhone: '',
        primaryPhonePrefix: ''
      },

      verification: {
        identityStatus: 'verified', // Auto-verify
        billingStatus: 'verified', // Auto-verify
        overallVerificationStatus: 'verified',
        overallStatus: 'verified',
        verificationDocumentsProvided: [
          {
            documentId: `admin_override_${Date.now()}`,
            type: 'admin_override',
            fileName: 'Created by Admin Debug Tool',
            uploadedAt: new Date().toISOString(),
            status: 'verified',
            verificationStatus: 'verified'
          }
        ]
      },

      admin: [userId],
      employees: [{
        user_uid: userId,
        uid: userId,
        roles: ['admin'],
        rights: []
      }],
      createdAt: timestamp,
      updatedAt: timestamp,

      // Flags
      GLN_certified: 'ADMIN_OVERRIDE',
      verificationStatus: 'verified'
    };

    await setDoc(doc(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES, userId), facilityProfileData, { merge: true });

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    const existingRoles = userData.roles || [];
    const updatedRoles = existingRoles.filter(r => r.facility_uid !== userId);
    updatedRoles.push({
      facility_uid: userId,
      roles: ['admin']
    });

    await setDoc(userRef, {
      roles: updatedRoles,
      facilityMemberships: [{
        facilityId: userId,
        facilityProfileId: userId,
        facilityName: firstName || email.split('@')[0],
        role: 'admin',
        joinedAt: new Date().toISOString()
      }],
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const handleSearchUser = async () => {
    if (!email.trim()) {
      setError('Please enter an email to search');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError('No user found with this email. Make sure the user exists in Firebase Auth first.');
        setLoading(false);
        return;
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      setUserId(userDoc.id);
      setFirstName(userData.firstName || '');
      setLastName(userData.lastName || '');
      setResult({
        success: true,
        message: `Found user: ${userData.email}`,
        userId: userDoc.id
      });
    } catch (err) {
      console.error('Error searching user:', err);
      setError(err.message || 'Failed to search user');
    } finally {
      setLoading(false);
    }
  };

  if (!canCreateAccounts) {
    return (
      <div className="p-6">
        <div className="bg-red-1 border border-red-3 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-4" size={24} />
          <div>
            <h3 className="font-semibold text-red-4">Access Denied</h3>
            <p className="text-sm text-red-3">You don't have permission to use this tool.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="text-yellow-4" size={32} />
          <h1 className="text-3xl font-bold text-foreground">
            {t('admin:debug.accountCreation', 'Account Creation Tool')}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {t('admin:debug.accountCreationDesc', 'Create professional or facility accounts bypassing verification (Debug/Testing only)')}
        </p>
      </div>

      <div className="bg-yellow-1 border border-yellow-3 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-yellow-4 mt-0.5" size={20} />
          <div className="text-sm text-yellow-4">
            <strong>Warning:</strong> This tool bypasses all verification steps. Only use for testing or debugging purposes.
            Accounts created this way will be marked as verified and complete.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-border shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin:debug.accountType', 'Account Type')}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setAccountType('professional')}
                className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${accountType === 'professional'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-border hover:bg-grey-1'
                  }`}
              >
                <User size={20} className="inline mr-2" />
                {t('admin:debug.professional', 'Professional')}
              </button>
              <button
                onClick={() => setAccountType('facility')}
                className={`flex-1 px-4 py-3 rounded-lg border transition-colors ${accountType === 'facility'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-border hover:bg-grey-1'
                  }`}
              >
                <Building2 size={20} className="inline mr-2" />
                {t('admin:debug.facility', 'Facility')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin:debug.email', 'Email Address')} *
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSearchUser}
                disabled={loading || !email.trim()}
                className="px-4 py-2 bg-grey-2 text-foreground rounded-lg hover:bg-grey-3 transition-colors disabled:opacity-50"
              >
                {t('admin:debug.search', 'Search')}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin:debug.emailHint', 'User must exist in Firebase Auth first')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin:debug.userId', 'User ID (Firebase Auth UID)')} *
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter Firebase Auth UID"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin:debug.userIdHint', 'Will be auto-filled if you search by email')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                {accountType === 'professional'
                  ? t('admin:debug.firstName', 'First Name')
                  : t('admin:debug.companyName', 'Company Name')}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={accountType === 'professional' ? 'John' : 'Company Name'}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            {accountType === 'professional' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t('admin:debug.lastName', 'Last Name')}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-1 border border-red-3 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="text-red-4 mt-0.5" size={20} />
              <div className="text-sm text-red-4">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {result && result.success && (
            <div className="bg-green-1 border border-green-3 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="text-green-4 mt-0.5" size={20} />
              <div className="text-sm text-green-4">
                <strong>Success:</strong> {result.message}
                {result.userId && (
                  <div className="mt-1 font-mono text-xs">
                    User ID: {result.userId}
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleCreateAccount}
            disabled={loading || !userId.trim() || !email.trim()}
            className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading
              ? t('admin:debug.creating', 'Creating...')
              : t('admin:debug.createAccount', `Create ${accountType === 'professional' ? 'Professional' : 'Facility'} Account`)}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 border border-border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          {t('admin:debug.howToUse', 'How to Use')}
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          <li>{t('admin:debug.step1', 'Create the user in Firebase Auth first (via Firebase Console or Auth API)')}</li>
          <li>{t('admin:debug.step2', 'Enter the user\'s email and click "Search" to find their User ID')}</li>
          <li>{t('admin:debug.step3', 'Or manually enter the Firebase Auth UID')}</li>
          <li>{t('admin:debug.step4', 'Fill in the required information (Name/Company Name)')}</li>
          <li>{t('admin:debug.step5', 'Click "Create Account" to create the profile with verification bypassed')}</li>
        </ol>
      </div>
    </div>
  );
};

export default AccountCreationTool;


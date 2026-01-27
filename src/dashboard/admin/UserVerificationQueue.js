import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { XCircle, Eye, FileText, Image as ImageIcon, RotateCw, User, Building, History, Globe, Shield, Ban, Mail, Search } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Document, Page, pdfjs } from 'react-pdf';
import Button from '../../components/BoxedInputFields/Button';
import TextareaField from '../../components/BoxedInputFields/TextareaField';
import Dialog from '../../components/Dialog/Dialog';
import { logAdminAction, ADMIN_AUDIT_EVENTS } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import { FIRESTORE_COLLECTIONS } from '../../config/keysDatabase';
import '../../styles/variables.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UserVerificationQueue = () => {
  const { t } = useTranslation(['admin']);
  const { userProfile } = useAuth();

  // Data State
  const [users, setUsers] = useState([]);
  const [historyUsers, setHistoryUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState('professionals'); // 'professionals', 'facilities', 'history'
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Lightbox/PDF State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);

  // Filters & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState('date_asc');

  useEffect(() => {
    let result = [...users];

    // Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.professionalProfile?.identity?.legalFirstName?.toLowerCase().includes(q) ||
        user.professionalProfile?.identity?.legalLastName?.toLowerCase().includes(q) ||
        user.facilityProfile?.companyName?.toLowerCase().includes(q)
      );
    }

    // Filter by Tab
    if (activeTab === 'professionals') {
      result = result.filter(user => user.professionalProfile && user.verificationStatus !== 'verified');
    } else if (activeTab === 'facilities') {
      result = result.filter(user => user.facilityProfile && user.verificationStatus !== 'verified');
    } else if (activeTab === 'history') {
      result = [...historyUsers];
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(user =>
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
          user.email?.toLowerCase().includes(q) ||
          user.facilityProfile?.companyName?.toLowerCase().includes(q)
        );
      }
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        const nameA = (a.firstName + ' ' + a.lastName).toLowerCase();
        const nameB = (b.firstName + ' ' + b.lastName).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return sortBy === 'date_asc' ? dateA - dateB : dateB - dateA;
    });

    setFilteredUsers(result);
  }, [users, historyUsers, searchQuery, activeTab, sortBy]);

  useEffect(() => {
    loadPendingUsers();
    loadHistoryUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const usersList = [];
      
      const professionalProfilesRef = collection(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES);
      const professionalProfilesSnapshot = await getDocs(professionalProfilesRef);
      
      for (const profDoc of professionalProfilesSnapshot.docs) {
        const profData = profDoc.data();
        const userId = profDoc.id;
        
        const verification = profData.verification || {};
        const manualVerification = verification.manualVerification === true;
        const verificationStatus = verification.overallVerificationStatus || verification.verificationStatus || verification.status;
        
        if (manualVerification || verificationStatus === 'verified') continue;
        
        const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId));
        if (!userDoc.exists()) continue;
        
        const userData = userDoc.data();
        if (userData.accountStatus === 'disabled') continue;
        
        usersList.push({
          id: userId,
          ...userData,
          professionalProfile: profData
        });
      }
      
      const facilityProfilesRef = collection(db, FIRESTORE_COLLECTIONS.FACILITY_PROFILES);
      const facilityProfilesSnapshot = await getDocs(facilityProfilesRef);
      
      for (const facDoc of facilityProfilesSnapshot.docs) {
        const facData = facDoc.data();
        const facilityId = facDoc.id;
        
        const verification = facData.verification || {};
        const manualVerification = verification.manualVerification === true;
        const verificationStatus = verification.overallVerificationStatus || verification.overallStatus || verification.verificationStatus || verification.status;
        
        if (manualVerification || verificationStatus === 'verified') continue;
        
        const admins = facData.admins || [];
        if (admins.length === 0) continue;
        
        const userId = admins[0];
        const userDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId));
        if (!userDoc.exists()) continue;
        
        const userData = userDoc.data();
        if (userData.accountStatus === 'disabled') continue;
        
        if (!usersList.find(u => u.id === userId)) {
          usersList.push({
            id: userId,
            ...userData,
            facilityProfile: facData,
            facilityProfileId: facilityId
          });
        } else {
          const existingUser = usersList.find(u => u.id === userId);
          existingUser.facilityProfile = facData;
          existingUser.facilityProfileId = facilityId;
        }
      }

      setUsers(usersList);
      if (usersList.length > 0 && !selectedUserId) {
        const first = usersList.find(u => activeTab === 'facilities' ? u.facilityProfile : u.professionalProfile);
        if (first) setSelectedUserId(first.id);
      }
    } catch (error) {
      console.error('Error loading pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoryUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('verificationStatus', '==', 'verified'));
      const snapshot = await getDocs(q);

      // Also fetch rejected/banned users
      const q2 = query(usersRef, where('accountStatus', '==', 'disabled'));
      const snapshot2 = await getDocs(q2);

      const historyList = [];
      const allDocs = [...snapshot.docs, ...snapshot2.docs];

      for (const docSnap of allDocs) {
        const userData = docSnap.data();
        const userId = docSnap.id;

        let professionalProfile = null;
        const profDoc = await getDoc(doc(db, 'professionalProfiles', userData.professionalProfileId || userId));
        if (profDoc.exists()) professionalProfile = profDoc.data();

        let facilityProfile = null;
        const facDoc = await getDoc(doc(db, 'facilityProfiles', userData.facilityProfileId || userId));
        if (facDoc.exists()) facilityProfile = facDoc.data();

        historyList.push({
          id: userId,
          ...userData,
          professionalProfile,
          facilityProfile
        });
      }

      setHistoryUsers(historyList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
    } catch (error) {
      console.error('Error loading history users:', error);
    }
  };


  const handleApprove = async (userId) => {
    setIsApproving(true);
    try {
      const user = [...users, ...historyUsers].find(u => u.id === userId);
      const userEmail = user?.email || 'Unknown';
      const userName = user?.professionalProfile ? `${user.firstName} ${user.lastName}` : user?.facilityProfile?.companyName || userEmail;

      await updateDoc(doc(db, 'users', userId), {
        onboardingStatus: 'completed',
        verificationStatus: 'verified',
        verifiedAt: serverTimestamp(),
        verifiedBy: userProfile?.uid || 'admin'
      });

      if (user?.professionalProfileId || user?.professionalProfile) {
        await updateDoc(doc(db, 'professionalProfiles', user.professionalProfileId || userId), {
          'verification.status': 'approved',
          'verification.verifiedAt': serverTimestamp(),
          'verification.manualVerification': true
        });
      }

      if (user?.facilityProfileId || user?.facilityProfile) {
        await updateDoc(doc(db, 'facilityProfiles', user.facilityProfileId || userId), {
          'verification.status': 'approved',
          'verification.verifiedAt': serverTimestamp(),
          'verification.manualVerification': true
        });
      }

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_APPROVED,
        action: `User approved: ${userName}`,
        resource: { type: 'user', id: userId, name: userName },
        details: { userEmail, accountType: user?.professionalProfile ? 'professional' : 'facility' }
      });

      setSelectedUserId(null);
      await loadPendingUsers();
      await loadHistoryUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Error approving user.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (userId) => {
    if (!rejectReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setIsRejecting(true);
    try {
      const user = [...users, ...historyUsers].find(u => u.id === userId);
      const userName = user?.professionalProfile ? `${user.firstName} ${user.lastName}` : user?.facilityProfile?.companyName || user?.email;

      const functions = getFunctions(undefined, 'europe-west6');
      const disableUser = httpsCallable(functions, 'disableUser');

      const banInfo = 'Your account has been disabled because your information did not match our verification requirements. Please contact our support team if you believe this is a mistake.';

      const result = await disableUser({
        userId,
        reason: rejectReason,
        banInfo: banInfo
      });

      if (result.data.success) {
        await updateDoc(doc(db, 'users', userId), {
          onboardingStatus: 'rejected',
          verificationStatus: 'rejected',
          rejectionReason: rejectReason,
          rejectedAt: serverTimestamp(),
          rejectedBy: userProfile?.uid || 'admin'
        });

        await logAdminAction({
          eventType: ADMIN_AUDIT_EVENTS.USER_REJECTED,
          action: `User rejected and banned: ${userName}`,
          resource: { type: 'user', id: userId, name: userName },
          details: { rejectionReason: rejectReason }
        });

        setSelectedUserId(null);
        setShowRejectDialog(false);
        setRejectReason('');
        await loadPendingUsers();
        await loadHistoryUsers();
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Error rejecting user: ' + (error.message || 'Unknown error'));
    } finally {
      setIsRejecting(false);
    }
  };

  const handleBan = async (userId) => {
    const reason = prompt('Reason for disabling this account:');
    if (!reason) return;

    try {
      const functions = getFunctions(undefined, 'europe-west6');
      const disableUser = httpsCallable(functions, 'disableUser');

      const result = await disableUser({
        userId,
        reason,
        banInfo: 'Your account has been disabled by an administrator for violation of terms.'
      });

      if (result.data.success) {
        alert('User account has been disabled.');
        setSelectedUserId(null);
        await loadPendingUsers();
        await loadHistoryUsers();
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Error disabling user: ' + error.message);
    }
  };

  const openImageLightbox = async (imagePath) => {
    try {
      let url = imagePath;
      if (!imagePath.startsWith('http') && !imagePath.startsWith('data:')) {
        const imageRef = ref(storage, imagePath);
        url = await getDownloadURL(imageRef);
      }
      setLightboxImages([{ src: url }]);
      setLightboxOpen(true);
    } catch (error) {
      console.error('Error loading image:', error);
      alert('Error loading image');
    }
  };

  const openPdfViewer = async (pdfPath) => {
    try {
      const pdfRef = ref(storage, pdfPath);
      const url = await getDownloadURL(pdfRef);
      setPdfUrl(url);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
        <div style={{ color: 'var(--text-light-color)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <RotateCw size={24} className="animate-spin" />
          Loading verification queue...
        </div>
      </div>
    );
  }

  const selectedUser = filteredUsers.find(u => u.id === selectedUserId) || historyUsers.find(u => u.id === selectedUserId);

  return (
    <div style={{ padding: 'var(--spacing-lg)', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Header & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 'var(--font-size-xxlarge)', fontWeight: 'var(--font-weight-bold)' }}>
          {t('admin:verification.title', 'Verification Management')}
        </h1>
        <div style={{ display: 'flex', backgroundColor: 'var(--grey-1)', padding: '4px', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--grey-2)' }}>
          {[
            { id: 'professionals', label: 'Professionals', icon: <User size={16} /> },
            { id: 'facilities', label: 'Facilities', icon: <Building size={16} /> },
            { id: 'history', label: 'History', icon: <History size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedUserId(null);
                setSearchQuery('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--border-radius-sm)',
                border: 'none',
                backgroundColor: activeTab === tab.id ? 'var(--white)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-light-color)',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                boxShadow: activeTab === tab.id ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Split Area */}
      <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flex: 1, overflow: 'hidden' }}>

        {/* Left Side: Users List */}
        <div style={{
          width: '350px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          backgroundColor: 'var(--background-div-color)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--grey-2)',
          padding: 'var(--spacing-md)',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light-color)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--grey-2)',
                outline: 'none',
                fontSize: 'var(--font-size-small)'
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-light-color)', fontSize: '13px' }}>
                No users found.
              </div>
            ) : (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--border-radius-md)',
                    border: '1px solid',
                    borderColor: selectedUserId === user.id ? 'var(--primary-color)' : 'var(--grey-2)',
                    backgroundColor: selectedUserId === user.id ? 'rgba(var(--primary-color-rgb), 0.05)' : 'var(--white)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: 'var(--font-size-medium)', color: 'var(--text-color)', marginBottom: '4px' }}>
                    {user.facilityProfile ? user.facilityProfile.companyName : `${user.firstName} ${user.lastName}`}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{user.email}</span>
                    {activeTab === 'history' && (
                      <span style={{
                        color: user.verificationStatus === 'verified' ? 'var(--green-4)' : 'var(--red-4)',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        {user.accountStatus === 'disabled' ? 'BANNED' : user.verificationStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Preview Panel */}
        <div style={{
          flex: 1,
          backgroundColor: 'var(--background-div-color)',
          borderRadius: 'var(--border-radius-lg)',
          border: '1px solid var(--grey-2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {!selectedUser ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-md)', color: 'var(--text-light-color)' }}>
              <Eye size={48} style={{ opacity: 0.2 }} />
              <p style={{ textAlign: 'center' }}>Select a user to view details</p>
            </div>
          ) : (
            <>
              {/* Preview Header */}
              <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--grey-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(var(--primary-color-rgb), 0.02)' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    backgroundColor: selectedUser.facilityProfile ? 'var(--blue-1)' : 'var(--purple-1)',
                    color: selectedUser.facilityProfile ? 'var(--blue-5)' : 'var(--purple-5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold'
                  }}>
                    {((selectedUser.facilityProfile ? selectedUser.facilityProfile.companyName : selectedUser.firstName) || '?').charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 'var(--font-size-xlarge)', fontWeight: 'bold', marginBottom: '2px' }}>
                      {selectedUser.facilityProfile ? selectedUser.facilityProfile.companyName : `${selectedUser.firstName} ${selectedUser.lastName}`}
                    </h2>
                    <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>{selectedUser.email} • ID: {selectedUser.id}</p>
                  </div>
                </div>
                {activeTab !== 'history' ? (
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <Button variant="danger" onClick={() => setShowRejectDialog(true)} style={{ padding: '8px 16px' }} disabled={isApproving || isRejecting}>Reject</Button>
                    <Button variant="confirmation" onClick={() => handleApprove(selectedUser.id)} style={{ padding: '8px 24px' }} disabled={isApproving || isRejecting}>
                      {isApproving ? 'Approving...' : 'Approve'}
                    </Button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    {selectedUser.accountStatus !== 'disabled' && (
                      <Button variant="danger" onClick={() => handleBan(selectedUser.id)} style={{ padding: '8px 16px' }}>
                        <Ban size={16} style={{ marginRight: '8px' }} /> Disable Account
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)', maxWidth: '100%' }}>

                {/* Profile Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', borderBottom: '1px solid var(--grey-2)', paddingBottom: '8px' }}>
                    <Shield size={18} className="text-primary" /> Profile Verification
                  </h3>

                  {/* GLN Information Card */}
                  <div style={{ backgroundColor: 'var(--grey-1)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-md)', border: '1px solid var(--grey-2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Globe size={14} /> GLN Registry Information
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <InfoRow label="GLN Certified" value={selectedUser.GLN_certified !== undefined ? (selectedUser.GLN_certified === true || selectedUser.GLN_certified === 'true' ? 'Yes' : 'No') : 'N/A'} bold />
                      <InfoRow label="GLN Number" value={selectedUser.professionalProfile?.verification?.glnNumber || selectedUser.facilityProfile?.glnNumber || 'N/A'} />
                    </div>
                  </div>

                  {/* Identity Detail Card */}
                  <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-md)', border: '1px solid var(--grey-2)' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <User size={14} /> Identity Details
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <InfoRow label="First Name" value={selectedUser.professionalProfile?.identity?.legalFirstName || selectedUser.firstName || 'N/A'} />
                      <InfoRow label="Last Name" value={selectedUser.professionalProfile?.identity?.legalLastName || selectedUser.lastName || 'N/A'} />
                    </div>
                  </div>

                  {/* Contact Detail Card */}
                  <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-md)', border: '1px solid var(--grey-2)' }}>
                    <span style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <Mail size={14} /> Contact Information
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                      <InfoRow label="Email" value={selectedUser.email || 'N/A'} />
                      <InfoRow label="Phone" value={selectedUser.primaryPhonePrefix && selectedUser.primaryPhone ? `${selectedUser.primaryPhonePrefix} ${selectedUser.primaryPhone}` : selectedUser.primaryPhone || selectedUser.professionalProfile?.contact?.primaryPhone || selectedUser.facilityProfile?.contact?.primaryPhone || 'N/A'} />
                    </div>
                  </div>
                </div>

                {/* Documents & History Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: '600', borderBottom: '1px solid var(--grey-2)', paddingBottom: '8px' }}>
                    <FileText size={18} className="text-primary" /> Submitted Verification
                  </h3>

                  {/* Documents List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {getVerificationDocuments(selectedUser).length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--grey-1)', borderRadius: '8px', border: '1px dashed var(--grey-3)', color: 'var(--text-light-color)' }}>
                        No documents submitted
                      </div>
                    ) : (
                      getVerificationDocuments(selectedUser).map((doc, idx) => {
                        const isImage = doc.storageUrl && !doc.storageUrl.includes('.pdf') && (doc.storageUrl.includes('.jpg') || doc.storageUrl.includes('.jpeg') || doc.storageUrl.includes('.png') || doc.storageUrl.includes('.gif') || doc.fileType?.includes('image') || doc.mimeType?.includes('image'));
                        return (
                          <DocumentImageItem key={idx} doc={doc} isImage={isImage} openImageLightbox={openImageLightbox} openPdfViewer={openPdfViewer} />
                        );
                      })
                    )}
                  </div>
                </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxImages}
      />

      {pdfUrl && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: '9999', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)' }} onClick={() => setPdfUrl(null)}>
          <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', maxWidth: '1000px', width: '100%', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-xl)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--grey-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background-color)' }}>
              <h3 style={{ fontWeight: 'var(--font-weight-medium)', fontSize: 'var(--font-size-large)' }}>{t('admin:verification.pdfViewer', 'Document Viewer')}</h3>
              <Button onClick={() => setPdfUrl(null)} variant="ghost" style={{ color: 'var(--text-color)', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={24} />
              </Button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)', backgroundColor: '#333', display: 'flex', justifyContent: 'center' }}>
              <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={<div style={{ color: 'white' }}>Loading PDF...</div>}>
                {Array.from(new Array(numPages), (el, index) => (
                  <Page key={`page_${index + 1}`} pageNumber={index + 1} width={800} renderTextLayer={false} renderAnnotationLayer={false} className="mb-4 shadow-lg" />
                ))}
              </Document>
            </div>
          </div>
        </div>
      )}

      <Dialog
        isOpen={showRejectDialog}
        onClose={() => { setShowRejectDialog(false); setRejectReason(''); }}
        title="Reject User Verification"
        size="medium"
        messageType="warning"
        actions={
          <>
            <Button onClick={() => { setShowRejectDialog(false); setRejectReason(''); }} variant="secondary" disabled={isRejecting}>
              Cancel
            </Button>
            <Button
              onClick={() => handleReject(selectedUserId)}
              variant="danger"
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? 'Rejecting...' : 'Reject & Ban Account'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--text-color)', fontSize: '14px' }}>
            This will reject the user's verification and permanently disable their account. The user will not be able to log in and will see a message to contact support.
          </p>
          <TextareaField
            label="Rejection Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter the reason for rejection (e.g., Information did not match verification requirements)"
            required
            rows={4}
          />
        </div>
      </Dialog>
    </div>
  );
};

// Helper Components
const InfoRow = ({ label, value, bold = false }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
    <span style={{ color: 'var(--text-light-color)', flexShrink: 0 }}>{label}:</span>
    <span style={{ fontWeight: bold ? '700' : '500', textAlign: 'right', wordBreak: 'break-word' }}>{value || 'N/A'}</span>
  </div>
);

const DocumentImageItem = ({ doc, isImage, openImageLightbox, openPdfViewer }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadImage = async () => {
      if (!isImage || !doc.storageUrl) {
        setLoading(false);
        return;
      }
      
      try {
        if (doc.storageUrl.startsWith('http') || doc.storageUrl.startsWith('data:')) {
          setImageUrl(doc.storageUrl);
        } else {
          const imageRef = ref(storage, doc.storageUrl);
          const url = await getDownloadURL(imageRef);
          setImageUrl(url);
        }
      } catch (error) {
        console.error('Error loading image:', error);
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadImage();
  }, [doc.storageUrl, isImage]);
  
  return (
    <div style={{
      padding: '12px', backgroundColor: 'var(--white)', borderRadius: '10px',
      border: '1px solid var(--grey-2)', display: 'flex', flexDirection: 'column', gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ padding: '8px', backgroundColor: 'var(--primary-color-light)', borderRadius: '8px', color: 'var(--primary-color)' }}>
            {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
          </div>
          <div>
            <div style={{ fontWeight: '600', fontSize: '13px' }}>{doc.type}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-light-color)' }}>{doc.fileName || 'Verification Document'}</div>
          </div>
        </div>
        <Button variant="ghost" onClick={() => doc.storageUrl?.includes('.pdf') ? openPdfViewer(doc.storageUrl) : openImageLightbox(doc.storageUrl)} style={{ fontSize: '12px', padding: '4px 12px' }}>
          View
        </Button>
      </div>
      {isImage && (
        <div style={{ width: '100%', maxHeight: '300px', overflow: 'hidden', borderRadius: '8px', border: '1px solid var(--grey-2)', backgroundColor: 'var(--grey-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
          {loading ? (
            <div style={{ padding: '20px', color: 'var(--text-light-color)', fontSize: '12px' }}>Loading image...</div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt={doc.fileName || 'Verification Document'}
              style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain', cursor: 'pointer' }}
              onClick={() => openImageLightbox(doc.storageUrl)}
              onError={(e) => {
                e.target.style.display = 'none';
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'padding: 20px; color: var(--text-light-color); font-size: 12px;';
                errorDiv.textContent = 'Failed to load image';
                e.target.parentElement.appendChild(errorDiv);
              }}
            />
          ) : (
            <div style={{ padding: '20px', color: 'var(--text-light-color)', fontSize: '12px' }}>Failed to load image</div>
          )}
        </div>
      )}
    </div>
  );
};

const getVerificationDocuments = (user) => {
  const profile = user.professionalProfile || user.facilityProfile || {};
  const verification = profile.verification || {};

  if (Array.isArray(verification.verificationDocuments)) return verification.verificationDocuments;
  if (verification.documents) return Object.entries(verification.documents).map(([k, v]) => ({ id: k, ...v, type: v.type || k }));
  if (user.documents) return Object.entries(user.documents).map(([k, v]) => ({ id: k, ...v, type: v.type || k }));
  return [];
};

export default UserVerificationQueue;

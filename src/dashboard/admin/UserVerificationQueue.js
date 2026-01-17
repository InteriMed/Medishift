import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { CheckCircle, XCircle, Eye, FileText, Image as ImageIcon, Search, RotateCw, Filter, ArrowUpDown } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Document, Page, pdfjs } from 'react-pdf';
import Button from '../../components/BoxedInputFields/Button';
import PersonnalizedInputField from '../../components/BoxedInputFields/Personnalized-InputField';
import DropdownField from '../../components/BoxedInputFields/Dropdown-Field';
import { logAdminAction, ADMIN_AUDIT_EVENTS } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/variables.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UserVerificationQueue = () => {
  const { t } = useTranslation(['admin']);
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);

  // Filters & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('date_asc');

  useEffect(() => {
    let result = [...users];

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(user =>
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q) ||
        user.professionalProfile?.identity?.legalFirstName?.toLowerCase().includes(q) ||
        user.professionalProfile?.identity?.legalLastName?.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'all') {
      result = result.filter(user => {
        const type = user.professionalProfile?.profileType?.toLowerCase() || 'professional';
        return type === filterType;
      });
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'name_asc') {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      // Date Sort
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return sortBy === 'date_asc' ? dateA - dateB : dateB - dateA;
    });

    setFilteredUsers(result);
  }, [users, searchQuery, filterType, sortBy]);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('onboardingStatus', '==', 'pending_verification'));
      const snapshot = await getDocs(q);

      const usersList = [];
      for (const docSnap of snapshot.docs) {
        const userData = docSnap.data();
        const userId = docSnap.id;

        let professionalProfile = null;
        if (userData.professionalProfileId) {
          const profDoc = await getDoc(doc(db, 'professionalProfiles', userData.professionalProfileId));
          if (profDoc.exists()) {
            professionalProfile = profDoc.data();
          }
        }

        let facilityProfile = null;
        if (userData.facilityProfileId) {
          const facDoc = await getDoc(doc(db, 'facilityProfiles', userData.facilityProfileId));
          if (facDoc.exists()) {
            facilityProfile = facDoc.data();
          }
        }

        usersList.push({
          id: userId,
          ...userData,
          professionalProfile,
          facilityProfile
        });
      }

      setUsers(usersList);
    } catch (error) {
      console.error('Error loading pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      const userEmail = user?.email || 'Unknown';
      const userName = user?.professionalProfile ? `${user.firstName} ${user.lastName}` : user?.facilityProfile?.companyName || userEmail;

      await updateDoc(doc(db, 'users', userId), {
        onboardingStatus: 'completed',
        verifiedAt: serverTimestamp(),
        verifiedBy: userProfile?.uid || 'admin'
      });

      if (user?.professionalProfileId) {
        await updateDoc(doc(db, 'professionalProfiles', user.professionalProfileId), {
          'verification.status': 'approved',
          'verification.verifiedAt': serverTimestamp()
        });
      }

      if (user?.facilityProfileId) {
        await updateDoc(doc(db, 'facilityProfiles', user.facilityProfileId), {
          'verification.status': 'approved',
          'verification.verifiedAt': serverTimestamp()
        });
      }

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_APPROVED,
        action: `User approved: ${userName}`,
        resource: {
          type: 'user',
          id: userId,
          name: userName
        },
        details: {
          userEmail,
          accountType: user?.professionalProfile ? 'professional' : 'facility',
          verifiedBy: userProfile?.uid || 'admin'
        }
      });

      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error approving user:', error);
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_APPROVED,
        action: `Failed to approve user: ${userId}`,
        resource: { type: 'user', id: userId },
        details: { error: error.message },
        success: false,
        errorMessage: error.message
      });
      alert('Error approving user. Please try again.');
    }
  };

  const handleReject = async (userId, reason) => {
    const rejectionReason = reason || prompt('Rejection reason:');
    if (!rejectionReason) return;

    try {
      const user = users.find(u => u.id === userId);
      const userEmail = user?.email || 'Unknown';
      const userName = user?.professionalProfile ? `${user.firstName} ${user.lastName}` : user?.facilityProfile?.companyName || userEmail;

      await updateDoc(doc(db, 'users', userId), {
        onboardingStatus: 'rejected',
        rejectionReason,
        rejectedAt: serverTimestamp(),
        rejectedBy: userProfile?.uid || 'admin'
      });

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_REJECTED,
        action: `User rejected: ${userName}`,
        resource: {
          type: 'user',
          id: userId,
          name: userName
        },
        details: {
          userEmail,
          rejectionReason,
          accountType: user?.professionalProfile ? 'professional' : 'facility',
          rejectedBy: userProfile?.uid || 'admin'
        }
      });

      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error rejecting user:', error);
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.USER_REJECTED,
        action: `Failed to reject user: ${userId}`,
        resource: { type: 'user', id: userId },
        details: { error: error.message },
        success: false,
        errorMessage: error.message
      });
      alert('Error rejecting user. Please try again.');
    }
  };

  const openImageLightbox = async (imagePath) => {
    try {
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
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
           <div className="spinner-border text-primary" role="status" style={{ width: '1.5rem', height: '1.5rem', border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%' }}></div>
           Loading verification queue...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--spacing-xl)', maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      
      {/* Header Section */}
      <div>
        <h1 style={{ fontSize: 'var(--font-size-xxxlarge)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-color)' }}>
          {t('admin:verification.title', 'User Verification Queue')}
        </h1>
      </div>

      {/* Filters Section */}
      <div style={{ 
        backgroundColor: 'var(--background-div-color)', 
        borderRadius: 'var(--border-radius-lg)', 
        padding: 'var(--spacing-lg)', 
        border: '1px solid var(--grey-2)', 
        boxShadow: 'var(--shadow-sm)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-semibold)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Filter size={20} className="text-primary" style={{ color: 'var(--primary-color)' }} />
            {t('admin:shifts.searchCriteria', 'Search & Filter')}
          </h2>
          <Button 
            onClick={loadPendingUsers} 
            variant="ghost" 
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--primary-color)' }}
          >
            <RotateCw size={16} />
            Refresh
          </Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--spacing-md)', alignItems: 'end' }}>
          <PersonnalizedInputField
            label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            name="search"
            placeholder={t('admin:verification.search', 'Search by name, email...')}
            icon={<Search size={18} />}
          />
          <DropdownField
            label={t('admin:verification.filterType', 'Account Type')}
            options={[
              { value: 'all', label: t('admin:verification.allTypes', 'All Types') },
              { value: 'professional', label: t('admin:verification.professional', 'Professionals') },
              { value: 'facility', label: t('admin:verification.facility', 'Facilities') }
            ]}
            value={filterType}
            onChange={(value) => setFilterType(value)}
            placeholder={t('admin:verification.allTypes', 'All Types')}
          />
          <DropdownField
            label={t('admin:verification.sortBy', 'Sort By')}
            options={[
              { value: 'date_asc', label: t('admin:verification.oldestFirst', 'Oldest First') },
              { value: 'date_desc', label: t('admin:verification.newestFirst', 'Newest First') },
              { value: 'name_asc', label: t('admin:verification.nameAsc', 'Name (A-Z)') }
            ]}
            value={sortBy}
            onChange={(value) => setSortBy(value)}
            placeholder={t('admin:verification.oldestFirst', 'Oldest First')}
            icon={<ArrowUpDown size={18} />}
          />
        </div>
      </div>

      {/* Content Section */}
      {filteredUsers.length === 0 ? (
        <div style={{ 
          backgroundColor: 'var(--background-div-color)', 
          borderRadius: 'var(--border-radius-lg)', 
          padding: 'var(--spacing-xxxl) var(--spacing-xl)', 
          textAlign: 'center', 
          border: '1px solid var(--grey-2)', 
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-md)'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(var(--green-4-rgb), 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 'var(--spacing-sm)'
          }}>
            <CheckCircle size={40} style={{ color: 'var(--green-4)' }} />
          </div>
          <h3 style={{ fontSize: 'var(--font-size-xlarge)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-color)' }}>
            {t('admin:verification.noPending', 'All Caught Up!')}
          </h3>
          <p style={{ color: 'var(--text-light-color)', maxWidth: '400px' }}>
            {t('admin:verification.noPendingDesc', 'There are no users pending verification at the moment.')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-lg)' }}>
          {filteredUsers.map((user) => {
            const prof = user.professionalProfile;
            const fac = user.facilityProfile;
            const profile = prof || fac || {};
            const verification = profile.verification || {};
            const documents = verification.documents || {};

            const displayName = fac ? fac.companyName : `${user.firstName} ${user.lastName}`;
            const displayType = fac ? 'Facility' : (prof?.profileType || 'Professional');

            return (
              <div
                key={user.id}
                style={{ 
                  backgroundColor: 'var(--background-div-color)', 
                  borderRadius: 'var(--border-radius-lg)', 
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)', 
                  border: '1px solid var(--grey-2)' 
                }}
              >
                {/* Card Header */}
                <div style={{ 
                  padding: 'var(--spacing-lg)', 
                  borderBottom: '1px solid var(--grey-2)', 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  justifyContent: 'space-between',
                  backgroundColor: 'rgba(var(--primary-color-rgb), 0.02)'
                }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <div style={{
                       width: '48px',
                       height: '48px',
                       borderRadius: '50%',
                       backgroundColor: displayType === 'Facility' ? 'var(--blue-1)' : 'var(--purple-1)',
                       color: displayType === 'Facility' ? 'var(--blue-5)' : 'var(--purple-5)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       textTransform: 'uppercase',
                       fontWeight: 'bold',
                       fontSize: '1.2rem'
                    }}>
                      {displayName.charAt(0)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-color)' }}>
                        {displayName}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginTop: '4px' }}>
                         <span style={{ 
                           fontSize: 'var(--font-size-xsmall)', 
                           padding: '2px 8px', 
                           borderRadius: '12px', 
                           backgroundColor: 'var(--grey-2)', 
                           color: 'var(--text-color)' 
                         }}>
                           {displayType}
                         </span>
                         <span style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>• {user.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: 'var(--spacing-lg)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-xl)' }}>
                    {/* User Details Column */}
                    <div>
                      <h4 style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <Eye size={18} /> {t('admin:verification.userData', 'User Details')}
                      </h4>
                      <div style={{ 
                        backgroundColor: 'var(--grey-1)', 
                        borderRadius: 'var(--border-radius-md)', 
                        padding: 'var(--spacing-md)', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 'var(--spacing-sm)', 
                        fontSize: 'var(--font-size-small)' 
                      }}>
                        {prof?.identity && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-light-color)' }}>Legal Name:</span>
                              <span style={{ fontWeight: '500' }}>{prof.identity.legalFirstName} {prof.identity.legalLastName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-light-color)' }}>Date of Birth:</span>
                              <span style={{ fontWeight: '500' }}>{prof.identity.dateOfBirth?.toDate?.()?.toLocaleDateString() || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-light-color)' }}>Nationality:</span>
                              <span style={{ fontWeight: '500' }}>{prof.identity.nationality || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-light-color)' }}>AVS Number:</span>
                              <span style={{ fontWeight: '500' }}>{prof.identity.ahvNumber || 'N/A'}</span>
                            </div>
                          </>
                        )}
                        {fac && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-light-color)' }}>Company:</span>
                              <span style={{ fontWeight: '500' }}>{fac.companyName}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-light-color)' }}>Type:</span>
                              <span style={{ fontWeight: '500' }}>{fac.institutionType}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-light-color)' }}>UID/IDE:</span>
                              <span style={{ fontWeight: '500' }}>{fac.uidNumber || 'N/A'}</span>
                            </div>
                          </>
                        )}
                        {profile.contact && (
                          <>
                             <div style={{ margin: 'var(--spacing-xs) 0', borderTop: '1px solid var(--grey-3)' }}></div>
                             <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-light-color)' }}>Phone:</span>
                                <span style={{ fontWeight: '500' }}>{profile.contact.primaryPhone || 'N/A'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-light-color)' }}>Address:</span>
                                <span style={{ fontWeight: '500', textAlign: 'right', maxWidth: '60%' }}>
                                  {profile.contact.residentialAddress?.street || profile.contact.address?.street || 'N/A'}
                                </span>
                              </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Documents Column */}
                    <div>
                      <h4 style={{ fontSize: 'var(--font-size-medium)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <FileText size={18} /> {t('admin:verification.documents', 'Submitted Documents')}
                      </h4>
                      {Object.keys(documents).length > 0 ? (
                         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--spacing-md)' }}>
                            {documents.idCard && (
                              <DocumentButton 
                                onClick={() => openImageLightbox(documents.idCard)}
                                label={t('admin:verification.idCard', 'ID Card')}
                                icon={<ImageIcon size={20} />}
                              />
                            )}
                            {documents.diploma && (
                              <DocumentButton 
                                onClick={() => openImageLightbox(documents.diploma)}
                                label={t('admin:verification.diploma', 'Diploma')}
                                icon={<ImageIcon size={20} />}
                              />
                            )}
                            {documents.cv && (
                              <DocumentButton 
                                onClick={() => openPdfViewer(documents.cv)}
                                label={t('admin:verification.cv', 'CV')}
                                icon={<FileText size={20} />}
                              />
                            )}
                             {documents.workPermit && (
                              <DocumentButton 
                                onClick={() => openPdfViewer(documents.workPermit)}
                                label={t('admin:verification.workPermit', 'Work Permit')}
                                icon={<FileText size={20} />}
                              />
                            )}
                         </div>
                      ) : (
                        <div style={{ 
                          padding: 'var(--spacing-lg)', 
                          textAlign: 'center', 
                          color: 'var(--text-light-color)',
                          border: '1px dashed var(--grey-3)',
                          borderRadius: 'var(--border-radius-md)'
                        }}>
                          No documents uploaded.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div style={{ 
                    marginTop: 'var(--spacing-xl)', 
                    paddingTop: 'var(--spacing-lg)', 
                    borderTop: '1px solid var(--grey-2)',
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: 'var(--spacing-md)' 
                  }}>
                     <Button
                      onClick={() => handleReject(user.id)}
                      variant="danger"
                      style={{ minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-sm)' }}
                    >
                      <XCircle size={18} />
                      {t('admin:verification.reject', 'Reject')}
                    </Button>
                    <Button
                      onClick={() => handleApprove(user.id)}
                      variant="confirmation"
                      style={{ minWidth: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-sm)' }}
                    >
                      <CheckCircle size={18} />
                      {t('admin:verification.approve', 'Approve User')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
              <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)} loading={<div style={{color: 'white'}}>Loading PDF...</div>}>
                {Array.from(new Array(numPages), (el, index) => (
                  <Page key={`page_${index + 1}`} pageNumber={index + 1} width={800} renderTextLayer={false} renderAnnotationLayer={false} className="mb-4 shadow-lg" />
                ))}
              </Document>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DocumentButton = ({ onClick, label, icon }) => (
  <button 
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid var(--grey-3)',
      backgroundColor: 'var(--background-color)',
      borderRadius: 'var(--border-radius-md)',
      padding: 'var(--spacing-md)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      gap: 'var(--spacing-xs)',
      width: '100%',
      height: '100px'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--primary-color)';
      e.currentTarget.style.backgroundColor = 'rgba(var(--primary-color-rgb), 0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--grey-3)';
      e.currentTarget.style.backgroundColor = 'var(--background-color)';
    }}
  >
    <div style={{ color: 'var(--primary-color)' }}>{icon}</div>
    <span style={{ fontSize: 'var(--font-size-small)', fontWeight: '500', color: 'var(--text-color)' }}>{label}</span>
  </button>
);

export default UserVerificationQueue;


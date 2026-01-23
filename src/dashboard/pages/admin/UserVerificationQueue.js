import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';
import { ref, getDownloadURL } from 'firebase/storage';
import { CheckCircle, XCircle, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const UserVerificationQueue = () => {
  const { t } = useTranslation(['admin']);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const q = query(usersRef, where('onboardingStatus', '==', 'pending_verification'));
      const snapshot = await getDocs(q);
      
      const usersList = [];
      for (const docSnap of snapshot.docs) {
        const userData = docSnap.data();
        const userId = docSnap.id;
        
        let professionalProfile = null;
        if (userData.professionalProfileId) {
          const profDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, userData.professionalProfileId));
          if (profDoc.exists()) {
            professionalProfile = profDoc.data();
          }
        }
        
        usersList.push({
          id: userId,
          ...userData,
          professionalProfile
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
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), {
        onboardingStatus: 'completed',
        verifiedAt: serverTimestamp(),
        verifiedBy: 'admin'
      });
      
      if (users.find(u => u.id === userId)?.professionalProfileId) {
        await updateDoc(doc(db, FIRESTORE_COLLECTIONS.PROFESSIONAL_PROFILES, users.find(u => u.id === userId).professionalProfileId), {
          'verification.status': 'approved',
          'verification.verifiedAt': serverTimestamp()
        });
      }
      
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Error approving user. Please try again.');
    }
  };

  const handleReject = async (userId, reason) => {
    const rejectionReason = reason || prompt('Rejection reason:');
    if (!rejectionReason) return;
    
    try {
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, userId), {
        onboardingStatus: 'rejected',
        rejectionReason,
        rejectedAt: serverTimestamp()
      });
      
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error rejecting user:', error);
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

  const getDocumentUrl = (docPath) => {
    if (!docPath) return null;
    return docPath;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('admin:verification.loading', 'Loading verification queue...')}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {t('admin:verification.title', 'User Verification Queue')}
        </h1>
        <p className="text-muted-foreground">
          {t('admin:verification.subtitle', 'Review and verify pending user registrations')}
        </p>
      </div>

      {users.length === 0 ? (
        <div className="bg-background-div-color rounded-lg p-12 text-center border border-border">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-4" />
          <h3 className="text-xl font-semibold mb-2">
            {t('admin:verification.noPending', 'No Pending Verifications')}
          </h3>
          <p className="text-muted-foreground">
            {t('admin:verification.noPendingDesc', 'All users have been verified.')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {users.map((user) => {
            const prof = user.professionalProfile;
            const verification = prof?.verification || {};
            const documents = verification.documents || {};
            
            return (
              <div
                key={user.id}
                style={{
                  backgroundColor: 'var(--background-div-color)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: 'var(--spacing-lg)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--grey-2)'
                }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {user.firstName} {user.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {prof && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {prof.profileType || 'Professional'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      {t('admin:verification.userData', 'User Data')}
                    </h4>
                    <div className="bg-grey-1 rounded p-3 space-y-1 text-sm">
                      {prof?.identity && (
                        <>
                          <p><strong>Legal Name:</strong> {prof.identity.legalFirstName} {prof.identity.legalLastName}</p>
                          <p><strong>Date of Birth:</strong> {prof.identity.dateOfBirth?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
                          <p><strong>Nationality:</strong> {prof.identity.nationality || 'N/A'}</p>
                          <p><strong>AVS Number:</strong> {prof.identity.ahvNumber || 'N/A'}</p>
                        </>
                      )}
                      {prof?.contact && (
                        <>
                          <p><strong>Phone:</strong> {prof.contact.primaryPhone || 'N/A'}</p>
                          <p><strong>Address:</strong> {prof.contact.residentialAddress?.street || 'N/A'}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      {t('admin:verification.documents', 'Documents')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {documents.idCard && (
                        <button
                          onClick={() => openImageLightbox(documents.idCard)}
                          className="flex items-center gap-2 p-2 bg-grey-1 rounded hover:bg-grey-2 transition-colors text-sm"
                        >
                          <ImageIcon size={16} />
                          {t('admin:verification.idCard', 'ID Card')}
                        </button>
                      )}
                      {documents.diploma && (
                        <button
                          onClick={() => openImageLightbox(documents.diploma)}
                          className="flex items-center gap-2 p-2 bg-grey-1 rounded hover:bg-grey-2 transition-colors text-sm"
                        >
                          <ImageIcon size={16} />
                          {t('admin:verification.diploma', 'Diploma')}
                        </button>
                      )}
                      {documents.cv && (
                        <button
                          onClick={() => openPdfViewer(documents.cv)}
                          className="flex items-center gap-2 p-2 bg-grey-1 rounded hover:bg-grey-2 transition-colors text-sm"
                        >
                          <FileText size={16} />
                          {t('admin:verification.cv', 'CV')}
                        </button>
                      )}
                      {documents.workPermit && (
                        <button
                          onClick={() => openPdfViewer(documents.workPermit)}
                          className="flex items-center gap-2 p-2 bg-grey-1 rounded hover:bg-grey-2 transition-colors text-sm"
                        >
                          <FileText size={16} />
                          {t('admin:verification.workPermit', 'Work Permit')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-4 text-white rounded-lg hover:bg-green-3 transition-colors"
                    >
                      <CheckCircle size={18} />
                      {t('admin:verification.approve', 'Approve')}
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-3 text-white rounded-lg hover:bg-red-4 transition-colors"
                    >
                      <XCircle size={18} />
                      {t('admin:verification.reject', 'Reject')}
                    </button>
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPdfUrl(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">{t('admin:verification.pdfViewer', 'PDF Viewer')}</h3>
              <button onClick={() => setPdfUrl(null)} className="text-muted-foreground hover:text-foreground">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-4">
              <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                {Array.from(new Array(numPages), (el, index) => (
                  <Page key={`page_${index + 1}`} pageNumber={index + 1} width={800} />
                ))}
              </Document>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVerificationQueue;


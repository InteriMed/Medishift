import { db, auth, storage, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

const contractsService = {
  /**
   * Get all contracts
   * @param {object} filters - Optional filters to apply
   */
  getContracts: async (filters = {}) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const contractsRef = collection(db, 'contracts');

      // Create base query - get contracts where user is either professional or employer
      // Query for professional contracts
      const professionalQuery = query(
        contractsRef,
        where('parties.professional.profileId', '==', currentUser.uid),
        orderBy('statusLifecycle.timestamps.createdAt', 'desc')
      );

      // Query for employer contracts
      const employerQuery = query(
        contractsRef,
        where('parties.employer.profileId', '==', currentUser.uid),
        orderBy('statusLifecycle.timestamps.createdAt', 'desc')
      );

      // Execute both queries and combine results
      const [professionalSnapshot, employerSnapshot] = await Promise.all([
        getDocs(professionalQuery).catch(() => ({ forEach: () => { } })),
        getDocs(employerQuery).catch(() => ({ forEach: () => { } }))
      ]);

      const contractMap = new Map();

      [professionalSnapshot, employerSnapshot].forEach(snapshot => {
        snapshot.forEach(doc => {
          if (!contractMap.has(doc.id)) {
            contractMap.set(doc.id, doc);
          }
        });
      });

      const contracts = [];
      contractMap.forEach((doc) => {
        const data = doc.data();
        contracts.push({
          id: doc.id,
          ...data,
          createdAt: data.statusLifecycle?.timestamps?.createdAt?.toDate() || data.createdAt?.toDate() || null,
          startDate: data.terms?.startDate?.toDate() || data.startDate?.toDate() || null,
          endDate: data.terms?.endDate?.toDate() || data.endDate?.toDate() || null
        });
      });

      return contracts;
    } catch (error) {
      console.error('Error fetching contracts:', error);
      throw error;
    }
  },

  /**
   * Get a single contract by ID
   * @param {string} contractId - Contract ID
   */
  getContract: async (contractId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      const contractRef = doc(db, 'contracts', contractId);
      const contractDoc = await getDoc(contractRef);

      if (!contractDoc.exists()) {
        throw new Error('Contract not found');
      }

      const contractData = contractDoc.data();

      // SECURITY CHECK: Verify user has permission to view this contract
      const isProfessional = contractData.parties?.professional?.profileId === currentUser.uid;
      const isEmployer = contractData.parties?.employer?.profileId === currentUser.uid;
      const isParticipant = contractData.participants?.includes(currentUser.uid);

      // Backward compatibility
      const isOldWorker = contractData.workerId === currentUser.uid;
      const isOldCompany = contractData.companyId === currentUser.uid;

      if (!isProfessional && !isEmployer && !isParticipant && !isOldWorker && !isOldCompany) {
        throw new Error('Not authorized to view this contract');
      }

      // Format dates
      return {
        id: contractDoc.id,
        ...contractData,
        createdAt: contractData.statusLifecycle?.timestamps?.createdAt?.toDate() || contractData.createdAt?.toDate() || null,
        startDate: contractData.terms?.startDate?.toDate() || contractData.startDate?.toDate() || null,
        endDate: contractData.terms?.endDate?.toDate() || contractData.endDate?.toDate() || null
      };
    } catch (error) {
      console.error(`Error fetching contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new contract
   * @param {Object} contractData - Contract data
   */
  createContract: async (contractData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // SECURITY CHECK: Ensure user is part of the contract
      const professionalId = contractData.parties?.professional?.profileId;
      const employerId = contractData.parties?.employer?.profileId;

      if (professionalId !== currentUser.uid && employerId !== currentUser.uid) {
        throw new Error('You must be either the professional or employer in the contract');
      }

      // Convert any Date objects to Firestore Timestamps
      const processedData = { ...contractData };
      if (processedData.terms?.startDate) {
        processedData.terms.startDate = Timestamp.fromDate(new Date(processedData.terms.startDate));
      }
      if (processedData.terms?.endDate) {
        processedData.terms.endDate = Timestamp.fromDate(new Date(processedData.terms.endDate));
      }
      // Backward compatibility
      if (processedData.startDate) {
        processedData.startDate = Timestamp.fromDate(new Date(processedData.startDate));
      }
      if (processedData.endDate) {
        processedData.endDate = Timestamp.fromDate(new Date(processedData.endDate));
      }

      // Add metadata with new structure
      const contractRef = collection(db, 'contracts');
      const docRef = await addDoc(contractRef, {
        ...processedData,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        statusLifecycle: {
          currentStatus: processedData.statusLifecycle?.currentStatus || 'draft',
          timestamps: {
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
        },
        // Ensure participants array includes both parties
        participants: [
          ...new Set([
            ...(processedData.participants || []),
            professionalId,
            employerId,
            currentUser.uid
          ].filter(Boolean))
        ]
      });

      // Get the newly created contract
      const newContractDoc = await getDoc(docRef);
      const newContract = newContractDoc.data();

      return {
        id: docRef.id,
        ...newContract,
        createdAt: newContract.createdAt?.toDate() || null,
        startDate: newContract.startDate?.toDate() || null,
        endDate: newContract.endDate?.toDate() || null
      };
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  },

  /**
   * Update an existing contract
   * @param {string} contractId - Contract ID
   * @param {Object} contractData - Updated contract data
   */
  updateContract: async (contractId, contractData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Check if contract exists and current user has permission
      const contractRef = doc(db, 'contracts', contractId);
      const contractDoc = await getDoc(contractRef);

      if (!contractDoc.exists()) {
        throw new Error('Contract not found');
      }

      const existingData = contractDoc.data();

      // SECURITY CHECK: Verify user has permission to update
      const isProfessional = existingData.parties?.professional?.profileId === currentUser.uid;
      const isEmployer = existingData.parties?.employer?.profileId === currentUser.uid;
      const isParticipant = existingData.participants?.includes(currentUser.uid);

      // Backward compatibility
      const isOldWorker = existingData.workerId === currentUser.uid;
      const isOldCompany = existingData.companyId === currentUser.uid;

      if (!isProfessional && !isEmployer && !isParticipant && !isOldWorker && !isOldCompany) {
        throw new Error('Not authorized to update this contract');
      }

      // Convert any Date objects to Firestore Timestamps
      const processedData = { ...contractData };
      if (processedData.terms?.startDate) {
        processedData.terms.startDate = Timestamp.fromDate(new Date(processedData.terms.startDate));
      }
      if (processedData.terms?.endDate) {
        processedData.terms.endDate = Timestamp.fromDate(new Date(processedData.terms.endDate));
      }
      // Backward compatibility
      if (processedData.startDate) {
        processedData.startDate = Timestamp.fromDate(new Date(processedData.startDate));
      }
      if (processedData.endDate) {
        processedData.endDate = Timestamp.fromDate(new Date(processedData.endDate));
      }

      // Remove fields that shouldn't be updated
      const { id, createdAt, createdBy, ...updatableData } = processedData;

      // Prepare update data with status lifecycle handling
      const updateData = {
        ...updatableData,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      // Update status lifecycle if status is being changed
      if (processedData.statusLifecycle?.currentStatus) {
        updateData['statusLifecycle.currentStatus'] = processedData.statusLifecycle.currentStatus;
        updateData['statusLifecycle.timestamps.updatedAt'] = serverTimestamp();
        if (processedData.statusLifecycle.notes) {
          updateData['statusLifecycle.notes'] = processedData.statusLifecycle.notes;
        }
      }

      // Update the contract
      await updateDoc(contractRef, updateData);

      // Get the updated contract
      const updatedContractDoc = await getDoc(contractRef);
      const updatedContract = updatedContractDoc.data();

      return {
        id: contractId,
        ...updatedContract,
        createdAt: updatedContract.createdAt?.toDate() || null,
        startDate: updatedContract.startDate?.toDate() || null,
        endDate: updatedContract.endDate?.toDate() || null
      };
    } catch (error) {
      console.error(`Error updating contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a contract
   * @param {string} contractId - Contract ID
   */
  deleteContract: async (contractId) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Check if contract exists and current user has permission
      const contractRef = doc(db, 'contracts', contractId);
      const contractDoc = await getDoc(contractRef);

      if (!contractDoc.exists()) {
        throw new Error('Contract not found');
      }

      const existingData = contractDoc.data();

      // SECURITY CHECK: Verify user has permission to delete
      const isProfessional = existingData.parties?.professional?.profileId === currentUser.uid;
      const isEmployer = existingData.parties?.employer?.profileId === currentUser.uid;
      const isParticipant = existingData.participants?.includes(currentUser.uid);

      // Backward compatibility
      const isOldWorker = existingData.workerId === currentUser.uid;
      const isOldCompany = existingData.companyId === currentUser.uid;

      if (!isProfessional && !isEmployer && !isParticipant && !isOldWorker && !isOldCompany) {
        throw new Error('Not authorized to delete this contract');
      }

      // Delete the contract
      await deleteDoc(contractRef);
      return true;
    } catch (error) {
      console.error(`Error deleting contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Generate a PDF for a contract
   * @param {string} contractId - Contract ID
   */
  generatePdf: async (contractId) => {
    try {
      // Use a Cloud Function to generate the PDF
      const generatePdfFn = httpsCallable(functions, 'generateContractPdf');
      const result = await generatePdfFn({ contractId });

      // The Cloud Function should return a path to the generated PDF in storage
      const pdfPath = result.data.pdfPath;

      // Get download URL for the generated PDF
      const pdfRef = ref(storage, pdfPath);
      const downloadUrl = await getDownloadURL(pdfRef);

      return { downloadUrl };
    } catch (error) {
      console.error(`Error generating PDF for contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Get contract activity history
   * @param {string} contractId - Contract ID
   */
  getContractHistory: async (contractId) => {
    try {
      const historyRef = collection(db, 'contracts', contractId, 'history');
      const q = query(historyRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);

      const history = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        history.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || null
        });
      });

      return history;
    } catch (error) {
      console.error(`Error fetching history for contract ${contractId}:`, error);
      throw error;
    }
  },

  /**
   * Apply to a job/contract
   * @param {string} jobId - Job ID
   * @param {object} applicationData - Application data
   * @returns {Promise} Application result
   */
  applyToJob: async (jobId, applicationData) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user');
      }

      // Create an application in Firestore
      const applicationsRef = collection(db, 'job_applications');
      const docRef = await addDoc(applicationsRef, {
        jobId,
        applicantId: currentUser.uid,
        ...applicationData,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Get the job listing to add the applicant
      const jobRef = doc(db, 'job_listings', jobId);
      const jobDoc = await getDoc(jobRef);

      if (jobDoc.exists()) {
        // Add applicant to the job listing's applicants array
        await updateDoc(jobRef, {
          applicants: arrayUnion(currentUser.uid),
          updatedAt: serverTimestamp()
        });
      }

      return {
        id: docRef.id,
        success: true,
        message: 'Application submitted successfully'
      };
    } catch (error) {
      console.error('Error applying to job:', error);
      throw error;
    }
  }
};

export default contractsService; 
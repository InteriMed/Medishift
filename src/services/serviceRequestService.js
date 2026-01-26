import { db } from './firebase';
import { FIRESTORE_COLLECTIONS } from '../config/keysDatabase';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

const serviceRequestService = {
  CREATE_SERVICE_REQUEST: async (requestData, user) => {
    try {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const request = {
        title: requestData.title,
        description: requestData.description,
        serviceType: requestData.serviceType,
        category: requestData.category || 'general',
        priority: requestData.priority || 'medium',
        requestedBy: user.uid,
        requestedByEmail: user.email,
        requestedByName: user.displayName || user.email?.split('@')[0] || 'User',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        attachments: requestData.attachments || [],
        metadata: {
          workspace: requestData.workspace || null,
          facilityId: requestData.facilityId || null,
          organizationId: requestData.organizationId || null,
          relatedEntityId: requestData.relatedEntityId || null
        }
      };

      const docRef = await addDoc(collection(db, 'serviceRequests'), request);
      
      return {
        id: docRef.id,
        ...request
      };
    } catch (error) {
      console.error('Error creating service request:', error);
      throw error;
    }
  },

  GET_SERVICE_REQUEST: async (requestId) => {
    try {
      const requestRef = doc(db, 'serviceRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        throw new Error('Service request not found');
      }
      
      return {
        id: requestDoc.id,
        ...requestDoc.data()
      };
    } catch (error) {
      console.error('Error fetching service request:', error);
      throw error;
    }
  },

  LIST_SERVICE_REQUESTS: async (filters = {}) => {
    try {
      const requestsRef = collection(db, 'serviceRequests');
      let q = query(requestsRef, orderBy('createdAt', 'desc'));

      if (filters.userId) {
        q = query(q, where('requestedBy', '==', filters.userId));
      }

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters.serviceType) {
        q = query(q, where('serviceType', '==', filters.serviceType));
      }

      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }

      if (filters.facilityId) {
        q = query(q, where('metadata.facilityId', '==', filters.facilityId));
      }

      if (filters.organizationId) {
        q = query(q, where('metadata.organizationId', '==', filters.organizationId));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error listing service requests:', error);
      throw error;
    }
  },

  UPDATE_SERVICE_REQUEST: async (requestId, updates) => {
    try {
      const requestRef = doc(db, 'serviceRequests', requestId);
      await updateDoc(requestRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      const updatedDoc = await getDoc(requestRef);
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
    } catch (error) {
      console.error('Error updating service request:', error);
      throw error;
    }
  },

  GET_AVAILABLE_SERVICES: () => {
    return [
      {
        id: 'staffing',
        name: 'Staffing Services',
        description: 'Request temporary or permanent staffing solutions',
        categories: ['temporary', 'permanent', 'replacement', 'float_pool']
      },
      {
        id: 'training',
        name: 'Training & Development',
        description: 'Request training programs or professional development',
        categories: ['onboarding', 'certification', 'skills_development', 'compliance']
      },
      {
        id: 'consulting',
        name: 'Consulting Services',
        description: 'Request consulting or advisory services',
        categories: ['operations', 'compliance', 'technology', 'strategy']
      },
      {
        id: 'integration',
        name: 'System Integration',
        description: 'Request system integration or API access',
        categories: ['api_access', 'data_export', 'third_party_integration']
      },
      {
        id: 'custom',
        name: 'Custom Service',
        description: 'Request a custom service or solution',
        categories: ['other']
      }
    ];
  }
};

export default serviceRequestService;


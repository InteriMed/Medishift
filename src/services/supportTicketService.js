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
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const supportTicketService = {
  CREATE_TICKET: async (ticketData, user) => {
    try {
      const isAnonymous = ticketData.isAnonymous === true;

      if (!isAnonymous && !user) {
        throw new Error('User must be authenticated');
      }

      const ticket = {
        subject: ticketData.subject,
        message: ticketData.message,
        category: ticketData.category || 'general',
        priority: ticketData.priority || 'medium',
        userId: isAnonymous ? (user?.uid || 'anonymous') : user.uid,
        userEmail: isAnonymous ? 'anonymous@interimed.com' : user.email,
        userName: isAnonymous ? 'Anonymous Reporter' : (user.displayName || user.email?.split('@')[0] || 'User'),
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        attachments: ticketData.attachments || [],
        isAnonymous: isAnonymous,
        metadata: {
          workspace: ticketData.workspace || null,
          facilityId: ticketData.facilityId || null,
          organizationId: ticketData.organizationId || null
        }
      };

      const docRef = await addDoc(collection(db, 'supportTickets'), ticket);
      
      try {
        const createTicketFn = httpsCallable(functions, 'createSupportTicket');
        await createTicketFn({
          ticketId: docRef.id,
          ...ticket
        });
      } catch (error) {
        console.warn('Cloud function call failed, but ticket was created:', error);
      }

      return {
        id: docRef.id,
        ...ticket
      };
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  },

  GET_TICKET: async (ticketId) => {
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      const ticketDoc = await getDoc(ticketRef);
      
      if (!ticketDoc.exists()) {
        throw new Error('Ticket not found');
      }
      
      return {
        id: ticketDoc.id,
        ...ticketDoc.data()
      };
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  },

  LIST_MY_TICKETS: async (userId, filters = {}) => {
    try {
      if (!userId) {
        return [];
      }

      const ticketsRef = collection(db, 'supportTickets');
      let q = query(
        ticketsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (filters.category) {
        q = query(q, where('category', '==', filters.category));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null,
        updatedAt: doc.data().updatedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error listing tickets:', error);
      throw error;
    }
  },

  UPDATE_TICKET: async (ticketId, updates) => {
    try {
      const ticketRef = doc(db, 'supportTickets', ticketId);
      await updateDoc(ticketRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      const updatedDoc = await getDoc(ticketRef);
      return {
        id: updatedDoc.id,
        ...updatedDoc.data()
      };
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  },

  ADD_RESPONSE: async (ticketId, response, user) => {
    try {
      if (!user) {
        throw new Error('User must be authenticated');
      }

      const ticketRef = doc(db, 'supportTickets', ticketId);
      const ticketDoc = await getDoc(ticketRef);
      
      if (!ticketDoc.exists()) {
        throw new Error('Ticket not found');
      }

      const responses = ticketDoc.data().responses || [];
      const newResponse = {
        message: response.message,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email?.split('@')[0] || 'User',
        createdAt: serverTimestamp(),
        attachments: response.attachments || []
      };

      await updateDoc(ticketRef, {
        responses: [...responses, newResponse],
        updatedAt: serverTimestamp(),
        lastResponseAt: serverTimestamp()
      });

      return newResponse;
    } catch (error) {
      console.error('Error adding response:', error);
      throw error;
    }
  }
};

export default supportTicketService;


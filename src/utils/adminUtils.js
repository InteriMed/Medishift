import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../services/firebase';
import Papa from 'papaparse';

const functions = getFunctions(firebaseApp, 'europe-west6');

export const isAdmin = (userProfile) => {
  if (!userProfile) return false;
  
  if (userProfile.roles && Array.isArray(userProfile.roles)) {
    const adminRoles = ['admin', 'super_admin', 'ops_manager', 'finance', 'recruiter', 'support'];
    return userProfile.roles.some(role => adminRoles.includes(role));
  }
  
  return userProfile.role === 'admin';
};

export const impersonateUser = async (targetUserId) => {
  try {
    const startImpersonation = httpsCallable(functions, 'startImpersonation');
    const result = await startImpersonation({ targetUserId });
    
    if (result.data.success) {
      return result.data;
    } else {
      throw new Error(result.data.message || 'Failed to start impersonation');
    }
  } catch (error) {
    console.error('Impersonation error:', error);
    throw error;
  }
};

export const stopImpersonation = async (sessionId) => {
  try {
    const stopImpersonationFn = httpsCallable(functions, 'stopImpersonation');
    const result = await stopImpersonationFn({ sessionId });
    
    if (result.data.success) {
      return result.data;
    } else {
      throw new Error(result.data.message || 'Failed to stop impersonation');
    }
  } catch (error) {
    console.error('Stop impersonation error:', error);
    throw error;
  }
};

export const getImpersonationSession = async (sessionId) => {
  try {
    const getSession = httpsCallable(functions, 'getImpersonationSession');
    const result = await getSession({ sessionId });
    return result.data;
  } catch (error) {
    console.error('Get session error:', error);
    throw error;
  }
};

export const validateImpersonationSession = async (sessionId) => {
  try {
    const validateSession = httpsCallable(functions, 'validateImpersonationSession');
    const result = await validateSession({ sessionId });
    return result.data;
  } catch (error) {
    console.error('Validate session error:', error);
    return { isValid: false, reason: error.message };
  }
};

export const exportShiftsToCSV = async (month, year) => {
  try {
    const shiftsRef = collection(db, 'shifts');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const q = query(
      shiftsRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      where('status', '==', 'confirmed')
    );
    
    const snapshot = await getDocs(q);
    const shifts = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      shifts.push({
        shiftId: docSnap.id,
        facilityId: data.facilityId || '',
        date: data.date?.toDate?.()?.toISOString() || '',
        startTime: data.startTime || '',
        endTime: data.endTime || '',
        role: data.role || '',
        assignedUserId: data.assignedUserId || '',
        status: data.status || '',
        estimatedCost: data.estimatedCost || 0,
        actualCost: data.actualCost || 0
      });
    });
    
    const csv = Papa.unparse(shifts);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `verified_shifts_${year}_${String(month).padStart(2, '0')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true, count: shifts.length };
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
};

export const getUnverifiedUsersCount = async () => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('onboardingStatus', '==', 'pending_verification'));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unverified users count:', error);
    return 0;
  }
};

export const getActiveShiftsCount = async () => {
  try {
    const shiftsRef = collection(db, 'shifts');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      shiftsRef,
      where('date', '>=', today),
      where('status', 'in', ['open', 'filled', 'confirmed'])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting active shifts count:', error);
    return 0;
  }
};

export const getMonthlyRevenue = async (month, year) => {
  try {
    const shiftsRef = collection(db, 'shifts');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const q = query(
      shiftsRef,
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      where('status', '==', 'completed')
    );
    
    const snapshot = await getDocs(q);
    let total = 0;
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      total += data.actualCost || data.estimatedCost || 0;
    });
    
    return total;
  } catch (error) {
    console.error('Error getting monthly revenue:', error);
    return 0;
  }
};


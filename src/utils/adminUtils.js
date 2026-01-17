import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import Papa from 'papaparse';

export const isAdmin = (userProfile) => {
  if (!userProfile) return false;
  
  // Check roles array for admin roles
  if (userProfile.roles && Array.isArray(userProfile.roles)) {
    const adminRoles = ['admin', 'super_admin', 'ops_manager', 'finance', 'recruiter', 'support'];
    return userProfile.roles.some(role => adminRoles.includes(role));
  }
  
  // Fallback to singular role field for backward compatibility
  return userProfile.role === 'admin';
};

export const impersonateUser = async (targetUserId, adminUserId) => {
  try {
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    if (!targetUserDoc.exists()) {
      throw new Error('User not found');
    }
    
    const targetUserData = targetUserDoc.data();
    
    await updateDoc(doc(db, 'users', adminUserId), {
      impersonatingUserId: targetUserId,
      impersonatingUserData: targetUserData,
      impersonationStartedAt: serverTimestamp()
    });
    
    return targetUserData;
  } catch (error) {
    console.error('Impersonation error:', error);
    throw error;
  }
};

export const stopImpersonation = async (adminUserId) => {
  try {
    await updateDoc(doc(db, 'users', adminUserId), {
      impersonatingUserId: null,
      impersonatingUserData: null,
      impersonationStartedAt: null
    });
  } catch (error) {
    console.error('Stop impersonation error:', error);
    throw error;
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


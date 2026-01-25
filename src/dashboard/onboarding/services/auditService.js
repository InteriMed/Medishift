import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { FIRESTORE_COLLECTIONS } from '../../../config/keysDatabase';

const cleanFirestoreData = (obj) => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = cleanFirestoreData(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
};

export const saveGLNVerificationAudit = async (
  userId,
  legalName,
  glnNumber,
  verifiedBy,
  medregStatusAtTime,
  source,
  rawData
) => {
  try {
    const auditDocRef = doc(
      db,
      FIRESTORE_COLLECTIONS.AUDIT_PROFESSIONAL_CERTIFICATION,
      `${userId}_${Date.now()}`
    );

    const auditData = {
      user_uid: userId,
      legal_name: legalName,
      gln_number: glnNumber,
      verification_timestamp: serverTimestamp(),
      verified_by: verifiedBy || 'Self-Onboarding',
      medreg_status_at_time: medregStatusAtTime || '',
      source: source || '',
      rawdata: rawData ? cleanFirestoreData(rawData) : null,
      created_at: serverTimestamp()
    };

    await setDoc(auditDocRef, auditData);

    return { success: true, auditId: auditDocRef.id };
  } catch (error) {
    console.error('[AuditService] Failed to save GLN verification audit:', error);
    return { success: false, error: error.message };
  }
};

export const getGLNVerificationAudits = async (userId) => {
  try {
    const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
    
    const auditsRef = collection(db, FIRESTORE_COLLECTIONS.AUDIT_PROFESSIONAL_CERTIFICATION);
    const q = query(
      auditsRef,
      where('user_uid', '==', userId),
      orderBy('verification_timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const audits = [];

    querySnapshot.forEach((doc) => {
      audits.push({
        id: doc.id,
        ...doc.data(),
        verification_timestamp: doc.data().verification_timestamp?.toDate() || null
      });
    });

    return audits;
  } catch (error) {
    console.error('[AuditService] Failed to fetch GLN verification audits:', error);
    return [];
  }
};


import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface GLNVerificationAuditData {
  userId: string;
  gln: string;
  registry: string;
  verificationResult: 'success' | 'failed';
  metadata?: Record<string, any>;
}

export const saveGLNVerificationAudit = async (data: GLNVerificationAuditData): Promise<boolean> => {
  try {
    await addDoc(collection(db, 'gln_verification_audits'), {
      ...data,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('[Audit] Failed to save GLN verification audit:', error);
    return false;
  }
};


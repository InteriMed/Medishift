import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { isPayrollPeriodLocked } from '../contracts/types';

export async function checkPayrollLock(
  facilityId: string,
  shiftDate: string
): Promise<{ isLocked: boolean; periodId?: string; message?: string }> {
  const date = new Date(shiftDate);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const periodId = `${facilityId}_${year}_${String(month).padStart(2, '0')}`;
  
  const periodsRef = collection(db, 'payroll_periods');
  const q = query(
    periodsRef,
    where('__name__', '==', periodId)
  );

  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return { isLocked: false };
  }

  const period = snapshot.docs[0].data();
  const lockedStatuses = ['LOCKED', 'READY_FOR_HQ', 'APPROVED', 'SENT_TO_FIDUCIARY', 'COMPLETED'];

  if (lockedStatuses.includes(period.status)) {
    return {
      isLocked: true,
      periodId,
      message: `Cannot modify shift: Payroll period ${month}/${year} is ${period.status}. Contact HR for corrections.`,
    };
  }

  return { isLocked: false };
}


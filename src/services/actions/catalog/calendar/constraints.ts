import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { 
  ConstraintViolation, 
  ValidationResult, 
  SWISS_LAW_DEFAULTS,
  Shift 
} from './types';

export async function validateShiftConstraints(
  userId: string,
  facilityId: string,
  newShift: {
    date: string;
    startTime: string;
    endTime: string;
  },
  existingShiftId?: string,
  force: boolean = false
): Promise<ValidationResult> {
  const violations: ConstraintViolation[] = [];
  const warnings: string[] = [];
  let burdenScore = 0;

  const userShifts = await getUserShifts(userId, facilityId);
  const filteredShifts = userShifts.filter(s => s.id !== existingShiftId);

  const shiftDate = new Date(newShift.date);
  const shiftStart = parseTime(newShift.startTime);
  const shiftEnd = parseTime(newShift.endTime);
  const shiftDuration = calculateDuration(shiftStart, shiftEnd);

  if (shiftDuration > SWISS_LAW_DEFAULTS.maxDailyHours) {
    violations.push({
      code: 'MAX_DAILY_HOURS',
      severity: 'ERROR',
      message: `Shift duration (${shiftDuration}h) exceeds maximum daily hours (${SWISS_LAW_DEFAULTS.maxDailyHours}h)`,
    });
  }

  const dailyRestViolation = checkDailyRest(shiftDate, shiftStart, shiftEnd, filteredShifts);
  if (dailyRestViolation) {
    violations.push(dailyRestViolation);
  }

  const consecutiveDaysViolation = checkConsecutiveDays(shiftDate, filteredShifts);
  if (consecutiveDaysViolation) {
    violations.push(consecutiveDaysViolation);
  }

  const weeklyHoursResult = checkWeeklyHours(shiftDate, shiftDuration, filteredShifts);
  if (weeklyHoursResult.violation) {
    violations.push(weeklyHoursResult.violation);
  }
  burdenScore = weeklyHoursResult.weeklyHours;

  const userContract = await getUserContract(userId);
  if (userContract) {
    const contractViolation = checkContractHours(weeklyHoursResult.weeklyHours, userContract);
    if (contractViolation) {
      violations.push(contractViolation);
    }

    if (weeklyHoursResult.weeklyHours > userContract.maxWeeklyHours * 0.9) {
      warnings.push(`Approaching contract limit (${weeklyHoursResult.weeklyHours}h / ${userContract.maxWeeklyHours}h)`);
    }
  }

  if (force && violations.length > 0) {
    warnings.push(`⚠️ FORCE OVERRIDE: ${violations.length} violation(s) bypassed by manager`);
    return {
      valid: true,
      violations: violations.map(v => ({ ...v, severity: 'WARNING' as const })),
      burdenScore,
      warnings,
    };
  }

  return {
    valid: violations.filter(v => v.severity === 'ERROR').length === 0,
    violations,
    burdenScore,
    warnings,
  };
}

function checkDailyRest(
  shiftDate: Date,
  shiftStart: number,
  shiftEnd: number,
  existingShifts: Shift[]
): ConstraintViolation | null {
  const MIN_REST_HOURS = SWISS_LAW_DEFAULTS.minDailyRestHours;

  const previousDay = new Date(shiftDate);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayStr = previousDay.toISOString().split('T')[0];

  const nextDay = new Date(shiftDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const prevShift = existingShifts.find(s => s.date === previousDayStr);
  if (prevShift) {
    const prevEnd = parseTime(prevShift.endTime);
    const restHours = (24 - prevEnd) + shiftStart;
    
    if (restHours < MIN_REST_HOURS) {
      return {
        code: 'DAILY_REST_VIOLATION',
        severity: 'ERROR',
        message: `Insufficient rest between shifts (${restHours}h < ${MIN_REST_HOURS}h required)`,
        affectedShifts: [prevShift.id],
      };
    }
  }

  const nextShift = existingShifts.find(s => s.date === nextDayStr);
  if (nextShift) {
    const nextStart = parseTime(nextShift.startTime);
    const restHours = (24 - shiftEnd) + nextStart;
    
    if (restHours < MIN_REST_HOURS) {
      return {
        code: 'DAILY_REST_VIOLATION',
        severity: 'ERROR',
        message: `Insufficient rest before next shift (${restHours}h < ${MIN_REST_HOURS}h required)`,
        affectedShifts: [nextShift.id],
      };
    }
  }

  return null;
}

function checkConsecutiveDays(
  shiftDate: Date,
  existingShifts: Shift[]
): ConstraintViolation | null {
  const MAX_CONSECUTIVE = SWISS_LAW_DEFAULTS.maxConsecutiveDays;
  
  const sortedShifts = [...existingShifts]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let consecutiveCount = 1;
  const affectedShifts: string[] = [];

  let currentDate = new Date(shiftDate);
  for (let i = 1; i <= MAX_CONSECUTIVE; i++) {
    currentDate.setDate(currentDate.getDate() - 1);
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasShift = sortedShifts.find(s => s.date === dateStr);
    
    if (hasShift) {
      consecutiveCount++;
      affectedShifts.push(hasShift.id);
    } else {
      break;
    }
  }

  currentDate = new Date(shiftDate);
  for (let i = 1; i <= MAX_CONSECUTIVE; i++) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasShift = sortedShifts.find(s => s.date === dateStr);
    
    if (hasShift) {
      consecutiveCount++;
      affectedShifts.push(hasShift.id);
    } else {
      break;
    }
  }

  if (consecutiveCount > MAX_CONSECUTIVE) {
    return {
      code: 'CONSECUTIVE_DAYS_VIOLATION',
      severity: 'ERROR',
      message: `Would result in ${consecutiveCount} consecutive days (max ${MAX_CONSECUTIVE} allowed)`,
      affectedShifts,
    };
  }

  return null;
}

function checkWeeklyHours(
  shiftDate: Date,
  shiftDuration: number,
  existingShifts: Shift[]
): { violation: ConstraintViolation | null; weeklyHours: number } {
  const weekStart = getWeekStart(shiftDate);
  const weekEnd = getWeekEnd(shiftDate);

  const weekShifts = existingShifts.filter(s => {
    const date = new Date(s.date);
    return date >= weekStart && date <= weekEnd;
  });

  let totalWeeklyHours = shiftDuration;
  weekShifts.forEach(shift => {
    const start = parseTime(shift.startTime);
    const end = parseTime(shift.endTime);
    totalWeeklyHours += calculateDuration(start, end);
  });

  const MAX_WEEKLY = SWISS_LAW_DEFAULTS.maxWeeklyHours;

  if (totalWeeklyHours > MAX_WEEKLY) {
    return {
      violation: {
        code: 'WEEKLY_HOURS_VIOLATION',
        severity: 'ERROR',
        message: `Total weekly hours (${totalWeeklyHours}h) exceeds maximum (${MAX_WEEKLY}h)`,
        affectedShifts: weekShifts.map(s => s.id),
      },
      weeklyHours: totalWeeklyHours,
    };
  }

  return { violation: null, weeklyHours: totalWeeklyHours };
}

function checkContractHours(
  weeklyHours: number,
  contract: any
): ConstraintViolation | null {
  if (weeklyHours > contract.maxWeeklyHours) {
    return {
      code: 'CONTRACT_HOURS_VIOLATION',
      severity: 'ERROR',
      message: `Weekly hours (${weeklyHours}h) exceed contract limit (${contract.maxWeeklyHours}h)`,
    };
  }

  return null;
}

async function getUserShifts(userId: string, facilityId: string): Promise<Shift[]> {
  const shiftsRef = collection(db, 'shifts');
  const q = query(
    shiftsRef,
    where('userId', '==', userId),
    where('facilityId', '==', facilityId),
    where('status', '!=', 'CANCELLED')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shift[];
}

async function getUserContract(userId: string): Promise<any> {
  const contractsRef = collection(db, 'contracts');
  const q = query(contractsRef, where('userId', '==', userId), where('status', '==', 'ACTIVE'));
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours + minutes / 60;
}

function calculateDuration(start: number, end: number): number {
  if (end < start) {
    return (24 - start) + end;
  }
  return end - start;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
}


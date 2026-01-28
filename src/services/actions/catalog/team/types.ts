import { z } from "zod";

export type EmploymentStatus = 'ACTIVE' | 'TERMINATED' | 'SUSPENDED' | 'ON_LEAVE';
export type AccessLevel = 'GUEST' | 'STANDARD' | 'MANAGER';
export type TerminationReason = 'RESIGNATION' | 'DISMISSAL' | 'CONTRACT_END' | 'RETIREMENT';
export type PermitType = 'B' | 'C' | 'G' | 'L' | 'SWISS_CITIZEN';
export type CertificationType = 
  | 'VACCINATION_PERMIT' 
  | 'STUDENT_ID' 
  | 'PHARMACY_DIPLOMA' 
  | 'PROFESSIONAL_LICENSE'
  | 'NARCOTICS_LICENSE'
  | 'CONTINUING_EDUCATION';

export interface EmployeeProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  photoURL?: string;
  role: string;
  facilityId: string;
  secondaryFacilities?: Array<{
    facilityId: string;
    accessLevel: AccessLevel;
    grantedAt: number;
  }>;
  employmentStatus: EmploymentStatus;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'FLOATER' | 'EXTERNAL';
  workPercentage: number;
  jobTitle: string;
  contractStart: string;
  contractEnd?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Contract {
  userId: string;
  facilityId: string;
  workPercentage: number;
  salary?: number;
  jobTitle: string;
  annualVacationDays: number;
  maxWeeklyHours: number;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

export interface Certification {
  id: string;
  userId: string;
  type: CertificationType;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  fileUrl?: string;
  status: 'VALID' | 'EXPIRED' | 'PENDING_VERIFICATION';
  verifiedAt?: number;
  verifiedBy?: string;
}

export interface SwissIdentity {
  ahvNumber: string;
  permitType: PermitType;
  permitExpiryDate?: string;
  nationality: string;
  verified: boolean;
  verifiedAt?: number;
  verifiedBy?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: 'LANGUAGE' | 'SOFTWARE' | 'CLINICAL' | 'ADMINISTRATIVE';
  level?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

export function validateAHV(ahvNumber: string): boolean {
  const cleaned = ahvNumber.replace(/\./g, '');
  
  if (!/^756\d{10}$/.test(cleaned)) {
    return false;
  }

  const digits = cleaned.split('').map(Number);
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * weights[i];
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  
  return checkDigit === digits[10];
}

export function formatAHV(ahvNumber: string): string {
  const cleaned = ahvNumber.replace(/\./g, '');
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 7)}.${cleaned.slice(7, 11)}.${cleaned.slice(11)}`;
}


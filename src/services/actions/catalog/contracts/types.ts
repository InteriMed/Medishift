import { z } from "zod";

export type ContractStatus = 
  | 'DRAFT' 
  | 'PENDING_SIGNATURE' 
  | 'SIGNED' 
  | 'ACTIVE' 
  | 'TERMINATED' 
  | 'EXPIRED';

export type SalaryType = 'HOURLY' | 'MONTHLY';
export type SignatureProvider = 'INTERNAL' | 'SKRIBBLE' | 'DOCUSIGN';
export type AmendmentType = 'RATE_CHANGE' | 'PERCENTAGE_CHANGE' | 'ROLE_CHANGE' | 'FACILITY_CHANGE';

export type PayrollPeriodStatus = 
  | 'OPEN' 
  | 'LOCKED' 
  | 'READY_FOR_HQ' 
  | 'APPROVED' 
  | 'SENT_TO_FIDUCIARY' 
  | 'COMPLETED';

export type ManualEntryType = 'BONUS' | 'DEDUCTION' | 'EXPENSE' | 'REIMBURSEMENT';
export type ExportFormat = 'CSV_ABACUS' | 'CSV_GENERIC' | 'XML_ELM';

export interface ContractTemplate {
  id: string;
  name: string;
  salaryType: SalaryType;
  htmlTemplate: string;
  variables: string[];
}

export interface Contract {
  id: string;
  userId: string;
  facilityId: string;
  templateId: string;
  status: ContractStatus;
  salaryType: SalaryType;
  variables: Record<string, any>;
  generatedPdfUrl?: string;
  signedPdfUrl?: string;
  signedAt?: number;
  signedBy?: string;
  signatureProvider?: SignatureProvider;
  signatureMetadata?: {
    ip: string;
    timestamp: number;
    method: string;
  };
  parentContractId?: string;
  amendments?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PayrollPeriod {
  id: string;
  facilityId: string;
  month: number;
  year: number;
  status: PayrollPeriodStatus;
  lockedAt?: number;
  lockedBy?: string;
  approvedAt?: number;
  approvedBy?: string;
  variables: Record<string, PayrollVariables>;
  manualEntries: ManualEntry[];
}

export interface PayrollVariables {
  userId: string;
  standardHours: number;
  overtimeHours: number;
  sundayHours: number;
  nightHours: number;
  vacationDaysTaken: number;
  sickDays: number;
}

export interface ManualEntry {
  id: string;
  userId: string;
  type: ManualEntryType;
  amount: number;
  comment: string;
  addedBy: string;
  addedAt: number;
}

export function isPayrollPeriodLocked(
  periods: PayrollPeriod[],
  date: string
): boolean {
  const checkDate = new Date(date);
  const month = checkDate.getMonth() + 1;
  const year = checkDate.getFullYear();

  return periods.some(
    p => p.month === month && 
         p.year === year && 
         ['LOCKED', 'READY_FOR_HQ', 'APPROVED', 'SENT_TO_FIDUCIARY', 'COMPLETED'].includes(p.status)
  );
}


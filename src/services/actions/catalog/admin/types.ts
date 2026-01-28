import { z } from "zod";

export interface SupportTicket {
  id: string;
  userId: string;
  facilityId: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isBug: boolean;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedTo?: string;
  createdAt: any;
  resolvedAt?: any;
  capaId?: string;
}

export interface CapaEntry {
  id: string;
  ticketId: string;
  rootCauseAnalysis?: string;
  correction?: string;
  prevention?: string;
  verification?: string;
  status: 'INVESTIGATION' | 'IMPLEMENTATION' | 'VERIFICATION' | 'COMPLETED';
  createdAt: any;
  completedAt?: any;
}

export interface AgentResponse {
  answer: string;
  confidence: number;
  suggestedActions: {
    actionId: string;
    label: string;
    description: string;
  }[];
  sources: string[];
}

export interface TrendAnalysis {
  topIssues: {
    category: string;
    count: number;
    percentage: number;
  }[];
  totalTickets: number;
  averageResolutionTime: number;
  satisfactionScore?: number;
}

export interface TenantProvision {
  facilityId: string;
  facilityName: string;
  ownerEmail: string;
  plan: 'STARTER' | 'PRO' | 'ENTERPRISE';
  modules: string[];
  createdAt: any;
}

export interface BillingStatus {
  facilityId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'OVERDUE' | 'CANCELLED';
  plan: string;
  nextBillingDate?: any;
  suspendedAt?: any;
  suspensionReason?: string;
}

export interface FiduciaryClient {
  facilityId: string;
  facilityName: string;
  payrollStatus: 'DRAFT' | 'LOCKED' | 'APPROVED' | 'EXPORTED';
  lastExportDate?: any;
  pendingCorrections: number;
}

export interface PayrollDiscrepancy {
  id: string;
  facilityId: string;
  userId: string;
  period: string;
  note: string;
  flaggedBy: string;
  status: 'PENDING' | 'RESOLVED';
  createdAt: any;
}


import { z } from "zod";

export interface ClockEntry {
  id: string;
  userId: string;
  facilityId: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END';
  timestamp: any;
  location?: {
    latitude: number;
    longitude: number;
    ipAddress: string;
  };
  method: 'APP' | 'BADGE' | 'WEB';
  linkedShiftId?: string;
  status: 'VALID' | 'PENDING_CORRECTION' | 'DISPUTED';
}

export interface TimeBalance {
  userId: string;
  vacation_balance: number;
  overtime_balance: number;
  public_holiday_balance: number;
  comp_time_balance: number;
  lastUpdated: any;
}

export interface CorrectionRequest {
  id: string;
  userId: string;
  originalClockId: string;
  requestedTimestamp: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: any;
}

export interface FloatingPoolMember {
  userId: string;
  homeFacilityId: string;
  zones: string[];
  skills: string[];
  maxDistanceKM: number;
  weeklyAvailability: number;
  enrolledAt: any;
}

export interface InternalMission {
  id: string;
  requestingFacilityId: string;
  date: string;
  role: string;
  reason: string;
  status: 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
  assignedUserId?: string;
  visibility: 'POOL_ONLY' | 'NETWORK';
}

export interface CrossChargeEntry {
  sourceEntityId: string;
  targetEntityId: string;
  userId: string;
  hours: number;
  rate: number;
  totalAmount: number;
  period: string;
}

export interface ComplianceScore {
  facilityId: string;
  facilityName: string;
  score: number;
  violations: {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }[];
  lastAuditDate: any;
}

export interface EfficiencyMetric {
  facilityId: string;
  facilityName: string;
  metric: string;
  value: number;
  rank: number;
  networkAverage: number;
}

export interface NetworkLoadForecast {
  date: string;
  totalDemand: number;
  totalSupply: number;
  gap: number;
  roleBreakdown: {
    role: string;
    shortage: number;
  }[];
}


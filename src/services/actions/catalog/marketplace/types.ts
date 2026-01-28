import { z } from "zod";

export interface Mission {
  id: string;
  facilityId: string;
  facilityName: string;
  role: string;
  dates: string[];
  location: {
    address: string;
    city: string;
    canton: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  ratePerHour: number;
  isMarketRate: boolean;
  requirements: {
    skills: string[];
    certifications: string[];
    minExperience?: number;
  };
  targeting: 'PUBLIC' | 'POOL_ONLY' | 'FAVORITES';
  description: string;
  status: 'DRAFT' | 'PUBLISHED' | 'FILLED' | 'CANCELLED';
  createdBy: string;
  createdAt: any;
  expiresAt?: any;
}

export interface TalentProfile {
  id: string;
  displayName: string;
  role: string;
  yearsExperience: number;
  location: string;
  canton: string;
  rating?: number;
  reviewCount?: number;
  skills: string[];
  availability: string[];
  isAnonymized: boolean;
}

export interface MissionApplication {
  id: string;
  missionId: string;
  professionalId: string;
  professionalName: string;
  professionalRating?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'NEGOTIATING';
  proposedRate?: number;
  counterOffer?: number;
  appliedAt: any;
  message?: string;
}

export interface MissionContract {
  id: string;
  missionId: string;
  professionalId: string;
  facilityId: string;
  contractType: 'CDD' | 'INTERIM';
  startDate: string;
  endDate: string;
  ratePerHour: number;
  totalHours: number;
  signedAt?: any;
  pdfUrl?: string;
}

export interface Timesheet {
  id: string;
  missionId: string;
  professionalId: string;
  submittedHours: number;
  approvedHours?: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'DISPUTED';
  breakdowns: {
    date: string;
    clockIn: string;
    clockOut: string;
    hours: number;
  }[];
  submittedAt?: any;
  approvedAt?: any;
}

export interface Rating {
  id: string;
  missionId: string;
  fromUserId: string;
  toUserId: string;
  score: number;
  tags: string[];
  comment?: string;
  createdAt: any;
}

export interface MissionAlert {
  id: string;
  userId: string;
  criteria: {
    roles?: string[];
    minRate?: number;
    maxDistanceKM?: number;
    daysOfWeek?: number[];
    cantons?: string[];
  };
  active: boolean;
  createdAt: any;
}

export interface ShareableCV {
  id: string;
  userId: string;
  generatedAt: any;
  expiresAt: any;
  publicUrl: string;
  data: {
    name: string;
    role: string;
    totalHours: number;
    totalMissions: number;
    rating: number;
    skills: string[];
    certifications: string[];
    recentFacilities: string[];
  };
}

export interface IncomeSimulation {
  grossAmount: number;
  taxEstimate: number;
  socialSecurityEstimate: number;
  netAmount: number;
  breakdown: {
    hourlyRate: number;
    hours: number;
    avsTax: number;
    sourceTax?: number;
    otherDeductions: number;
  };
}

export interface OpenToWorkProfile {
  userId: string;
  active: boolean;
  availability: {
    daysOfWeek: number[];
    timeSlots?: string[];
  };
  preferredLocations: string[];
  minRate: number;
  maxDistanceKM: number;
  lastUpdated: any;
}


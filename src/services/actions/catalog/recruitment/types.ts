import { z } from "zod";

export interface JobPosting {
  id: string;
  facilityId: string;
  title: string;
  role: string;
  basicDetails: {
    salary: number;
    workPercentage: number;
    contractType: 'CDI' | 'CDD' | 'INTERIM';
    startDate: string;
    location: string;
  };
  standardFields: {
    require_cv: boolean;
    require_permit_scan: boolean;
    require_software_netcare: boolean;
    require_diplomas: boolean;
    require_references: boolean;
  };
  customQuestions: CustomQuestion[];
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  knockoutQuestionIds: string[];
  createdBy: string;
  createdAt: any;
  closedAt?: any;
}

export interface CustomQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'OPEN_TEXT' | 'BOOLEAN' | 'FILE_UPLOAD';
  question: string;
  options?: string[];
  required: boolean;
  isKnockout?: boolean;
  knockoutValue?: any;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  applicantName: string;
  applicantEmail: string;
  status: 'PENDING' | 'AUTO_REJECT' | 'REVIEWING' | 'INTERVIEW' | 'HIRED' | 'REJECTED';
  answers: Record<string, any>;
  cvFileUrl?: string;
  cvParsedData?: CVParsedData;
  aiMatchScore?: number;
  submittedAt: any;
}

export interface CVParsedData {
  skills: string[];
  software: string[];
  certifications: string[];
  experience: {
    role: string;
    facility: string;
    duration: string;
  }[];
  languages: string[];
  education: string[];
}

export interface CandidateComparison {
  jobId: string;
  candidates: {
    id: string;
    name: string;
    experience: string;
    software: string[];
    quizScore: number;
    aiMatchScore: number;
    salaryExpectation: number;
    availability: string;
  }[];
  recommendation: {
    topCandidate: string;
    reasoning: string;
  };
}

export interface Interview {
  id: string;
  applicationId: string;
  jobId: string;
  hostUserId: string;
  candidateUserId: string;
  scheduledAt: any;
  duration: number;
  type: 'VIDEO' | 'IN_PERSON' | 'PHONE';
  videoLink?: string;
  location?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
}

export interface InterviewFeedback {
  id: string;
  interviewId: string;
  score: number;
  decision: 'HIRE' | 'REJECT' | 'SECOND_ROUND';
  notes: string;
  strengths: string[];
  weaknesses: string[];
  createdBy: string;
  createdAt: any;
}


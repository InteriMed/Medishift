import { z } from "zod";

export interface UserProfile {
  id: string;
  email: string;
  legalName: string;
  preferredName?: string;
  firstName: string;
  lastName: string;
  language: 'en' | 'fr' | 'de' | 'it';
  phone?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  photoURL?: string;
  role: string;
  facilityId: string;
  activeFacilityId: string;
  permissions: string[];
  mergedPermissions?: string[];
}

export interface NotificationSettings {
  push: {
    shifts: boolean;
    messages: boolean;
    announcements: boolean;
    payroll: boolean;
  };
  email: {
    shifts: boolean;
    messages: boolean;
    announcements: boolean;
    payroll: boolean;
    weekly_summary: boolean;
  };
  inApp: {
    all: boolean;
  };
}

export interface UserPreferences {
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  notifications: NotificationSettings;
  defaultView: string;
  locale: string;
}

export interface FacilitySettings {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    zip: string;
    canton: string;
  };
  contactPhone: string;
  contactEmail: string;
  timezone: string;
  openingHours: {
    [key: number]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
}

export interface FacilityConfig {
  minStaffRules: {
    [role: string]: number;
  };
  breakRules: {
    lunchDuration: number;
    breakFrequency: number;
    minBreakDuration: number;
  };
  overtimeThreshold: number;
  allowFloaters: boolean;
}

export interface FacilityWhitelist {
  allowedIPs: string[];
  allowedMacAddresses?: string[];
  geofencing?: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
}

export interface OrganizationBranding {
  logoUrl: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  appName: string;
}

export interface OrganizationSubscription {
  planType: 'BASIC' | 'PRO' | 'ENTERPRISE';
  billingEmail: string;
  paymentMethod?: string;
  nextBillingDate?: string;
  seats: number;
  features: string[];
}

export interface SSOConfig {
  enabled: boolean;
  provider: 'AZURE_AD' | 'GOOGLE_WORKSPACE' | 'OKTA' | 'CUSTOM';
  idpMetadataUrl?: string;
  clientId?: string;
  tenantId?: string;
  domainHint?: string;
}

export interface OrganizationHierarchy {
  id: string;
  name: string;
  type: 'ROOT' | 'DEPARTMENT' | 'UNIT' | 'FACILITY';
  parentId?: string;
  children: OrganizationHierarchy[];
  floatingPoolScope?: string[];
}


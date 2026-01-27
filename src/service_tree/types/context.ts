export interface CustomClaims {
  facilityId: string;
  role: 'admin' | 'facility_admin' | 'professional' | 'coordinator';
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  userId: string;
  email: string;
}

export interface AuthContext {
  uid: string;
  claims: CustomClaims;
  token: string;
  isAuthenticated: boolean;
}

export interface AuditLogPayload {
  userId: string;
  facilityId: string;
  actionId: string;
  timestamp: number;
  ipAddress?: string;
  status: 'START' | 'SUCCESS' | 'ERROR';
  metadata?: Record<string, any>;
  error?: string;
}

export interface NotificationTarget {
  type: 'ROLE' | 'FACILITY' | 'USER' | 'ALL';
  roleFilter?: string[];
  facilityIds?: string[];
  userIds?: string[];
}

export interface NotificationPayload {
  title: string;
  body: string;
  priority: 'CRITICAL' | 'HIGH' | 'LOW';
  target: NotificationTarget;
  actionUrl?: string;
  data?: Record<string, any>;
}

export interface FeatureFlagContext {
  facilityId: string;
  tier: string;
  role: string;
  userId: string;
}

export interface TelemetryContext {
  userId: string;
  facilityId: string;
  tier: string;
  role: string;
  email: string;
}


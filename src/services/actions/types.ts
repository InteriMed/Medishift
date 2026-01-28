import { z } from "zod";

export type Permission = 
  // COMMUNICATION
  | 'thread.create'
  | 'thread.reply'
  | 'thread.read'
  | 'thread.delete'
  | 'ticket.manage'
  | 'announcement.create'
  | 'announcement.manage'
  | 'policy.create'
  | 'policy.manage'
  | 'reporting.read'
  | 'reporting.reveal_identity'
  | 'reporting.add_private_note'
  // ADMIN
  | 'admin.access'
  // CALENDAR & SCHEDULING
  | 'shift.create'
  | 'shift.view'
  // TIME TRACKING
  | 'time.clock_in'
  | 'time.clock_out'
  | 'time.record_break'
  | 'time.approve_correction'
  | 'time.get_balances'
  | 'time.compensate_overtime'
  | 'time.generate_seco_report'
  | 'time.declare_piquet_intervention'
  // ORGANIZATION
  | 'org.compare_efficiency'
  | 'org.predict_network_load'
  | 'org.generate_cross_charge_report'
  | 'org.set_transfer_pricing'
  | 'org.audit_compliance'
  | 'org.broadcast_policy'
  | 'org.standardize_roles'
  // POOL (Staff Sharing)
  | 'pool.dispatch_staff'
  | 'pool.enroll_member'
  | 'pool.request_coverage'
  | 'pool.search_network'
  // MARKETPLACE
  | 'marketplace.post_mission'
  | 'marketplace.search_talent'
  | 'marketplace.invite_talent'
  | 'marketplace.hire_candidate'
  | 'marketplace.apply'
  | 'marketplace.negotiate'
  | 'marketplace.set_alert'
  | 'marketplace.validate_timesheet'
  | 'marketplace.rate'
  | 'marketplace.toggle_open_to_work'
  // PROFILE
  | 'profile.generate_cv'
  // RECRUITMENT
  | 'recruitment.create_job'
  | 'recruitment.apply'
  | 'recruitment.parse_cv'
  | 'recruitment.compare_applicants'
  | 'recruitment.score_questions'
  | 'recruitment.schedule_interview'
  | 'recruitment.log_interview_feedback'
  // FIDUCIARY
  | 'fiduciary.access'
  | 'fiduciary.bulk_export'
  | 'fiduciary.flag_discrepancy'
  // EDUCATION
  | 'education.check_compliance_status'
  | 'education.log_fph_credits'
  | 'education.manage_apprenticeship'
  // RISK & SECURITY
  | 'risk.block_user'
  | 'risk.report_incident'
  | 'risk.trigger_crisis_alert';

export type CollectionType = 'messages' | 'tickets' | 'announcements' | 'policies' | 'hr_reports';

export interface ActionContext {
  userId: string;
  facilityId: string;
  userPermissions: Permission[];
  auditLogger: (actionId: string, status: 'START' | 'SUCCESS' | 'ERROR', payload?: any) => Promise<void>;
  ipAddress?: string;
}

export interface ActionDefinition<TInput extends z.ZodType, TOutput> {
  id: string;
  fileLocation: string;
  requiredPermission: Permission;
  label: string;
  description: string;
  keywords: string[];
  icon: string;
  schema: TInput;
  route?: {
    path: string;
    queryParam?: Record<string, string>;
  };
  metadata?: {
    isRAG?: boolean;
    autoToast?: boolean;
    riskLevel?: 'LOW' | 'HIGH';
  };
  handler: (input: z.infer<TInput>, context: ActionContext) => Promise<TOutput>;
}

export interface AuditEntry {
  uid: string;
  action: string;
  timestamp: number;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface ThreadMetadata {
  seenBy: string[];
  acknowledgedBy: string[];
  reactions: Record<string, string[]>;
  isPinned: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
}

export interface PollData {
  question: string;
  options: string[];
  allowMultiple: boolean;
  expiresAt?: number;
  votes: Record<string, string[]>;
}


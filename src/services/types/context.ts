import { z } from "zod";

export type Permission =
  | 'shift.create' | 'shift.view'
  | 'user.write' | 'docs.read'
  | 'admin.access'
  | 'thread.create' | 'thread.reply' | 'thread.fetch' | 'thread.list' | 'thread.mark_read' | 'thread.mark_acknowledge' | 'thread.get_stats' | 'thread.archive' | 'thread.flag_priority' | 'thread.compile_text' | 'thread.compile_url_map' | 'thread.pin' | 'thread.read'
  | 'announcement.get_poll_results' | 'announcement.vote_poll'
  | 'reporting.reveal_identity' | 'reporting.add_private_note'
  | 'thread.rag_query'
  | 'calendar.create_shift' | 'calendar.update_shift' | 'calendar.delete_shift' | 'calendar.apply_pattern' | 'calendar.publish_roster'
  | 'calendar.request_leave' | 'calendar.set_availability' | 'calendar.post_swap_request' | 'calendar.accept_swap'
  | 'calendar.validate_move' | 'calendar.get_coverage_status' | 'calendar.resolve_gap' | 'calendar.assign_floater'
  | 'calendar.export_ical_link' | 'calendar.export_timesheet'
  | 'team.list_employees' | 'team.get_profile_full' | 'team.assign_secondary_facility'
  | 'team.invite_user' | 'team.terminate_user' | 'team.reactivate_user'
  | 'team.update_contract_terms' | 'team.manage_certification' | 'team.verify_identity'
  | 'profile.update_iban' | 'profile.download_payslip' | 'profile.generate_cv'
  | 'team.add_skill' | 'team.search_by_skill'
  | 'contracts.generate_draft' | 'contracts.send_for_signature' | 'contracts.sign_digital' | 'contracts.create_amendment' | 'contracts.terminate_employment'
  | 'payroll.calculate_period_variables' | 'payroll.add_manual_entry' | 'payroll.lock_period' | 'payroll.approve_global' | 'payroll.export_data' | 'payroll.upload_payslip_bundle' | 'payroll.publish_payslips'
  | 'profile.get_me' | 'profile.update_me' | 'profile.set_preferences' | 'profile.upload_avatar'
  | 'facility.update_settings' | 'facility.update_config' | 'facility.manage_whitelist'
  | 'org.update_branding' | 'org.manage_subscription' | 'org.configure_sso' | 'org.get_hierarchy'
  | 'marketplace.post_mission' | 'marketplace.search_talent' | 'marketplace.invite_talent' | 'marketplace.hire_candidate'
  | 'marketplace.browse_missions' | 'marketplace.apply' | 'marketplace.negotiate' | 'marketplace.set_alert'
  | 'marketplace.validate_timesheet' | 'marketplace.rate'
  | 'marketplace.toggle_open_to_work' | 'finance.simulate_income'
  | 'time.clock_in' | 'time.clock_out' | 'time.record_break' | 'time.approve_correction' | 'time.get_balances' | 'time.compensate_overtime'
  | 'time.declare_piquet_intervention' | 'time.generate_seco_report'
  | 'pool.enroll_member' | 'pool.request_coverage' | 'pool.search_network' | 'pool.dispatch_staff'
  | 'org.generate_cross_charge_report' | 'org.set_transfer_pricing'
  | 'org.broadcast_policy' | 'org.standardize_roles' | 'org.audit_compliance'
  | 'org.compare_efficiency' | 'org.predict_network_load'
  | 'education.log_fph_credits' | 'education.check_compliance_status' | 'education.manage_apprenticeship'
  | 'risk.block_user' | 'risk.trigger_crisis_alert' | 'risk.report_incident'
  | 'support.ask_agent' | 'support.create_ticket' | 'support.manage_capa' | 'support.analyze_trends'
  | 'admin.provision_tenant' | 'admin.manage_billing' | 'admin.impersonate_user' | 'admin.broadcast_alert'
  | 'fiduciary.access' | 'fiduciary.bulk_export' | 'fiduciary.flag_discrepancy'
  | 'recruitment.create_job' | 'recruitment.archive_job' | 'recruitment.apply' | 'recruitment.parse_cv'
  | 'recruitment.compare_applicants' | 'recruitment.score_questions' | 'recruitment.schedule_interview' | 'recruitment.log_interview_feedback';

export interface ActionContext {
  userId: string;
  facilityId: string;
  userPermissions: Permission[];
  auditLogger: (actionId: string, status: 'START'|'SUCCESS'|'ERROR', payload?: any) => Promise<void>;
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
    riskLevel?: 'LOW' | 'HIGH' | 'MEDIUM';
    isSwiss?: boolean;
  };
  handler: (input: z.infer<TInput>, context: ActionContext) => Promise<TOutput>;
}

export interface CustomClaims {
  facilityId: string;
  role: 'admin' | 'facility_admin' | 'professional' | 'coordinator';
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  userId: string;
  email: string;
  userPermissions?: Permission[];
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


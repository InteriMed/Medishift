import { z } from "zod";

export type Permission = 
  // COMMUNICATION
  | 'thread.create'
  | 'thread.reply'
  | 'thread.read'
  | 'thread.delete'
  | 'thread.fetch'
  | 'thread.list'
  | 'thread.mark_read'
  | 'thread.mark_acknowledge'
  | 'thread.get_stats'
  | 'thread.archive'
  | 'thread.flag_priority'
  | 'thread.compile_text'
  | 'thread.compile_url_map'
  | 'thread.pin'
  | 'thread.rag_query'
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
  | 'marketplace.browse_missions'
  // FINANCE
  | 'finance.simulate_income'
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
  | 'risk.trigger_crisis_alert'
  // ADDITIONAL PERMISSIONS FROM CONTEXT
  | 'shift.create' | 'shift.view'
  | 'user.write' | 'docs.read'
  | 'announcement.get_poll_results' | 'announcement.vote_poll'
  | 'calendar.create_shift' | 'calendar.update_shift' | 'calendar.delete_shift' | 'calendar.apply_pattern' | 'calendar.publish_roster'
  | 'calendar.request_leave' | 'calendar.set_availability' | 'calendar.post_swap_request' | 'calendar.accept_swap'
  | 'calendar.validate_move' | 'calendar.get_coverage_status' | 'calendar.resolve_gap' | 'calendar.assign_floater'
  | 'calendar.export_ical_link' | 'calendar.export_timesheet'
  | 'team.list_employees' | 'team.get_profile_full' | 'team.assign_secondary_facility'
  | 'team.invite_user' | 'team.terminate_user' | 'team.reactivate_user'
  | 'team.update_contract_terms' | 'team.manage_certification' | 'team.verify_identity'
  | 'profile.update_iban' | 'profile.download_payslip'
  | 'team.add_skill' | 'team.search_by_skill'
  | 'contracts.generate_draft' | 'contracts.send_for_signature' | 'contracts.sign_digital' | 'contracts.create_amendment' | 'contracts.terminate_employment'
  | 'payroll.calculate_period_variables' | 'payroll.add_manual_entry' | 'payroll.lock_period' | 'payroll.approve_global' | 'payroll.export_data' | 'payroll.upload_payslip_bundle' | 'payroll.publish_payslips'
  | 'profile.get_me' | 'profile.update_me' | 'profile.set_preferences' | 'profile.upload_avatar'
  | 'facility.update_settings' | 'facility.update_config' | 'facility.manage_whitelist'
  | 'org.update_branding' | 'org.manage_subscription' | 'org.configure_sso' | 'org.get_hierarchy'
  | 'marketplace.browse_missions'
  | 'support.create_ticket' | 'support.manage_capa' | 'support.analyze_trends'
  | 'admin.provision_tenant' | 'admin.manage_billing' | 'admin.impersonate_user' | 'admin.broadcast_alert';

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
    riskLevel?: 'LOW' | 'HIGH' | 'MEDIUM';
    isSwiss?: boolean;
  };
  handler: (input: z.infer<TInput>, context: ActionContext) => Promise<TOutput>;
}

export interface AuditEntry {
  uid: string;
  action: string;
  timestamp: number;
  ip?: string;
  metadata?: Record<string, any>;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  warning?: string;
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


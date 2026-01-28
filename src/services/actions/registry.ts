import { createThreadAction } from "./catalog/communication/createThread";
import { replyThreadAction } from "./catalog/communication/replyThread";
import { fetchThreadAction } from "./catalog/communication/fetchThread";
import { listThreadsAction } from "./catalog/communication/listThreads";
import { markReadAction } from "./catalog/communication/markRead";
import { markAcknowledgeAction } from "./catalog/communication/markAcknowledge";
import { getStatsAction } from "./catalog/communication/getStats";
import { archiveThreadAction } from "./catalog/communication/archiveThread";
import { flagPriorityAction } from "./catalog/communication/flagPriority";
import { compileTextAction } from "./catalog/communication/compileText";
import { compileUrlMapAction } from "./catalog/communication/compileUrlMap";
import { pinThreadAction } from "./catalog/communication/pinThread";
import { getPollResultsAction } from "./catalog/communication/getPollResults";
import { votePollAction } from "./catalog/communication/votePoll";
import { revealIdentityAction } from "./catalog/communication/revealIdentity";
import { addPrivateNoteAction } from "./catalog/communication/addPrivateNote";
import { ragQueryAction } from "./catalog/communication/ragQuery";
import { getMeAction } from "./catalog/profile/me/getMe";
import { updateMeAction } from "./catalog/profile/me/updateMe";
import { setPreferencesAction } from "./catalog/profile/me/setPreferences";
import { uploadAvatarAction } from "./catalog/profile/me/uploadAvatar";
import { leaveFacilityAction } from "./catalog/profile/me/leaveFacility";
import { getFacilityMembershipsAction } from "./catalog/profile/me/getFacilityMemberships";
import { updateFacilitySettingsAction } from "./catalog/profile/facility/updateSettings";
import { updateFacilityConfigAction } from "./catalog/profile/facility/updateConfig";
import { manageFacilityWhitelistAction } from "./catalog/profile/facility/manageWhitelist";
import { getFacilityDataAction } from "./catalog/profile/facility/getFacilityData";
import { getTeamMembersAction } from "./catalog/profile/facility/getTeamMembers";
import { updateOrgBrandingAction } from "./catalog/profile/org/updateBranding";
import { manageOrgSubscriptionAction } from "./catalog/profile/org/manageSubscription";
import { configureOrgSSOAction } from "./catalog/profile/org/configureSso";
import { getOrgHierarchyAction } from "./catalog/profile/org/getHierarchy";
import { postMissionAction } from "./catalog/marketplace/facility/postMission";
import { searchTalentPoolAction } from "./catalog/marketplace/facility/searchTalentPool";
import { inviteTalentAction } from "./catalog/marketplace/facility/inviteTalent";
import { hireCandidateAction } from "./catalog/marketplace/facility/hireCandidate";
import { browseMissionsAction } from "./catalog/marketplace/professional/browseMissions";
import { applyMissionAction } from "./catalog/marketplace/professional/applyMission";
import { negotiateOfferAction } from "./catalog/marketplace/professional/negotiateOffer";
import { setAlertAction } from "./catalog/marketplace/professional/setAlert";
import { validateTimesheetAction } from "./catalog/marketplace/transaction/validateTimesheet";
import { ratePartyAction } from "./catalog/marketplace/transaction/rateParty";
import { generateShareableCVAction } from "./catalog/marketplace/professional/generateShareableCv";
import { simulateMissionIncomeAction } from "./catalog/marketplace/professional/simulateMissionIncome";
import { toggleOpenToWorkAction } from "./catalog/marketplace/professional/toggleOpenToWork";
import { createJobPostingAction } from "./catalog/recruitment/jobs/createJobPosting";
import { archiveJobAction } from "./catalog/recruitment/jobs/archiveJob";
import { submitApplicationAction } from "./catalog/recruitment/applications/submitApplication";
import { parseCvAiAction } from "./catalog/recruitment/applications/parseCvAi";
import { compareApplicantsAction } from "./catalog/recruitment/analysis/compareApplicants";
import { scoreOpenQuestionsAction } from "./catalog/recruitment/analysis/scoreOpenQuestions";
import { scheduleInterviewAction } from "./catalog/recruitment/interviews/scheduleInterview";
import { logInterviewFeedbackAction } from "./catalog/recruitment/interviews/logInterviewFeedback";
import { createShiftAction } from "./catalog/calendar/planning/createShift";
import { updateShiftAction } from "./catalog/calendar/planning/updateShift";
import { deleteShiftAction } from "./catalog/calendar/planning/deleteShift";
import { publishRosterAction } from "./catalog/calendar/planning/publishRoster";
import { applyPatternAction } from "./catalog/calendar/planning/applyPattern";
import { setAvailabilityAction } from "./catalog/calendar/requests/setAvailability";
import { requestLeaveAction } from "./catalog/calendar/requests/requestLeave";
import { postSwapRequestAction } from "./catalog/calendar/requests/postSwapRequest";
import { acceptSwapAction } from "./catalog/calendar/requests/acceptSwap";
import { resolveGapAction } from "./catalog/calendar/engine/resolveGap";
import { getCoverageStatusAction } from "./catalog/calendar/engine/getCoverageStatus";
import { assignFloaterAction } from "./catalog/calendar/engine/assignFloater";
import { validateMoveAction } from "./catalog/calendar/engine/validateMove";
import { exportTimesheetAction } from "./catalog/calendar/export/exportTimesheet";
import { exportIcalLinkAction } from "./catalog/calendar/export/exportIcalLink";
import { createEventAction } from "./catalog/calendar/events/createEvent";
import { updateEventAction } from "./catalog/calendar/events/updateEvent";
import { deleteEventAction } from "./catalog/calendar/events/deleteEvent";
import { listEventsAction } from "./catalog/calendar/events/listEvents";
import { createRecurringEventsAction } from "./catalog/calendar/events/createRecurringEvents";
import { addEmployeeToFacilityAction } from "./catalog/team/directory/addEmployeeToFacility";
import { updateEmployeeRoleAction } from "./catalog/team/directory/updateEmployeeRole";
import { removeEmployeeFromFacilityAction } from "./catalog/team/directory/removeEmployeeFromFacility";
import { listEmployeesAction } from "./catalog/team/directory/listEmployees";
import { getProfileFullAction } from "./catalog/team/directory/getProfileFull";
import { assignSecondaryFacilityAction } from "./catalog/team/directory/assignSecondaryFacility";
import { inviteUserAction } from "./catalog/team/lifecycle/inviteUser";
import { terminateUserAction } from "./catalog/team/lifecycle/terminateUser";
import { reactivateUserAction } from "./catalog/team/lifecycle/reactivateUser";
import { createRoleAction } from "./catalog/team/roles/createRole";
import { updateRoleAction } from "./catalog/team/roles/updateRole";
import { deleteRoleAction } from "./catalog/team/roles/deleteRole";
import { listRolesAction } from "./catalog/team/roles/listRoles";
import { createContractAction } from "./catalog/contracts/createContract";
import { listContractsAction } from "./catalog/contracts/listContracts";
import { getContractAction } from "./catalog/contracts/getContract";
import { generateDraftAction } from "./catalog/contracts/generateDraft";
import { sendForSignatureAction } from "./catalog/contracts/sendForSignature";
import { signDigitalAction } from "./catalog/contracts/signDigital";
import { createAmendmentAction } from "./catalog/contracts/createAmendment";
import { terminateEmploymentAction } from "./catalog/contracts/terminateEmployment";
import { calculatePeriodVariablesAction } from "./catalog/payroll/calculatePeriodVariables";
import { lockPeriodAction } from "./catalog/payroll/lockPeriod";
import { exportDataAction } from "./catalog/payroll/exportData";
import { addManualEntryAction } from "./catalog/payroll/addManualEntry";
import { approveGlobalAction } from "./catalog/payroll/approveGlobal";
import { publishPayslipsAction } from "./catalog/payroll/publishPayslips";
import { uploadPayslipBundleAction } from "./catalog/payroll/uploadPayslipBundle";
import { generateSecoReportAction } from "./catalog/time/audit/generateSecoReport";
import { grantAuditorAccessAction } from "./catalog/time/audit/grantAuditorAccess";
import { adjustBalanceAction } from "./catalog/time/bank/adjustBalance";
import { compensateOvertimeAction } from "./catalog/time/bank/compensateOvertime";
import { getBalancesAction } from "./catalog/time/bank/getBalances";
import { approveCorrectionAction } from "./catalog/time/clock/approveCorrection";
import { clockInAction } from "./catalog/time/clock/clockIn";
import { clockOutAction } from "./catalog/time/clock/clockOut";
import { recordBreakAction } from "./catalog/time/clock/recordBreak";
import { declarePiquetInterventionAction } from "./catalog/time/piquet/declarePiquetIntervention";
import { compareEfficiencyAction } from "./catalog/organization/analytics/compareEfficiency";
import { predictNetworkLoadAction } from "./catalog/organization/analytics/predictNetworkLoad";
import { generateCrossChargeReportAction } from "./catalog/organization/finance/generateCrossChargeReport";
import { setTransferPricingAction } from "./catalog/organization/finance/setTransferPricing";
import { auditComplianceScoreAction } from "./catalog/organization/governance/auditComplianceScore";
import { broadcastPolicyAction } from "./catalog/organization/governance/broadcastPolicy";
import { standardizeRolesAction } from "./catalog/organization/governance/standardizeRoles";
import { dispatchStaffAction } from "./catalog/organization/pool/dispatchStaff";
import { enrollMemberAction } from "./catalog/organization/pool/enrollMember";
import { requestCoverageAction } from "./catalog/organization/pool/requestCoverage";
import { searchNetworkAvailabilityAction } from "./catalog/organization/pool/searchNetworkAvailability";
import { analyzeTrendsAction } from "./catalog/support/analyzeTrends";
import { askAgentAction } from "./catalog/support/askAgent";
import { createTicketWithCapaAction } from "./catalog/support/createTicketWithCapa";
import { logAiFeedbackAction } from "./catalog/support/logAiFeedback";
import { manageCapaWorkflowAction } from "./catalog/support/manageCapaWorkflow";
import { broadcastSystemAlertAction } from "./catalog/admin/broadcastSystemAlert";
import { impersonateUserAction } from "./catalog/admin/impersonateUser";
import { manageBillingAction } from "./catalog/admin/manageBilling";
import { provisionTenantAction } from "./catalog/admin/provisionTenant";
import { sendEmailAction } from "./catalog/admin/sendEmail";
import { bulkExportAction } from "./catalog/fiduciary/bulkExport";
import { flagDiscrepancyAction } from "./catalog/fiduciary/flagDiscrepancy";
import { getClientDashboardAction } from "./catalog/fiduciary/getClientDashboard";
import { checkComplianceStatusAction } from "./catalog/education/checkComplianceStatus";
import { logFphCreditsAction } from "./catalog/education/logFphCredits";
import { manageApprenticeshipAction } from "./catalog/education/manageApprenticeship";
import { blockUserAction } from "./catalog/risk/blockUser";
import { reportIncidentAction } from "./catalog/risk/reportIncident";
import { triggerCrisisAlertAction } from "./catalog/risk/triggerCrisisAlert";
import { extractTextAction } from "./catalog/ai/extractText";
import { parseDocumentAction } from "./catalog/ai/parseDocument";
import { verifyDocumentAction } from "./catalog/ai/verifyDocument";
import { verifyGLNAction } from "./catalog/verification/verifyGLN";
import { verifyUIDAction } from "./catalog/verification/verifyUID";
import { manageCertificationAction } from "./catalog/team/compliance/manageCertification";
import { updateContractTermsAction } from "./catalog/team/compliance/updateContractTerms";
import { verifyIdentityAction } from "./catalog/team/compliance/verifyIdentity";
import { downloadPayslipAction } from "./catalog/team/finance/downloadPayslip";
import { updateIbanAction } from "./catalog/team/finance/updateIban";
import { addSkillAction } from "./catalog/team/skills/addSkill";
import { searchBySkillAction } from "./catalog/team/skills/searchBySkill";

export const ActionRegistry = {
  [createThreadAction.id]: createThreadAction,
  [replyThreadAction.id]: replyThreadAction,
  [fetchThreadAction.id]: fetchThreadAction,
  [listThreadsAction.id]: listThreadsAction,
  [markReadAction.id]: markReadAction,
  [markAcknowledgeAction.id]: markAcknowledgeAction,
  [getStatsAction.id]: getStatsAction,
  [archiveThreadAction.id]: archiveThreadAction,
  [flagPriorityAction.id]: flagPriorityAction,
  [compileTextAction.id]: compileTextAction,
  [compileUrlMapAction.id]: compileUrlMapAction,
  [pinThreadAction.id]: pinThreadAction,
  [getPollResultsAction.id]: getPollResultsAction,
  [votePollAction.id]: votePollAction,
  [revealIdentityAction.id]: revealIdentityAction,
  [addPrivateNoteAction.id]: addPrivateNoteAction,
  [ragQueryAction.id]: ragQueryAction,
  [getMeAction.id]: getMeAction,
  [updateMeAction.id]: updateMeAction,
  [setPreferencesAction.id]: setPreferencesAction,
  [uploadAvatarAction.id]: uploadAvatarAction,
  [leaveFacilityAction.id]: leaveFacilityAction,
  [getFacilityMembershipsAction.id]: getFacilityMembershipsAction,
  [updateFacilitySettingsAction.id]: updateFacilitySettingsAction,
  [updateFacilityConfigAction.id]: updateFacilityConfigAction,
  [manageFacilityWhitelistAction.id]: manageFacilityWhitelistAction,
  [getFacilityDataAction.id]: getFacilityDataAction,
  [getTeamMembersAction.id]: getTeamMembersAction,
  [updateOrgBrandingAction.id]: updateOrgBrandingAction,
  [manageOrgSubscriptionAction.id]: manageOrgSubscriptionAction,
  [configureOrgSSOAction.id]: configureOrgSSOAction,
  [getOrgHierarchyAction.id]: getOrgHierarchyAction,
  [postMissionAction.id]: postMissionAction,
  [searchTalentPoolAction.id]: searchTalentPoolAction,
  [inviteTalentAction.id]: inviteTalentAction,
  [hireCandidateAction.id]: hireCandidateAction,
  [browseMissionsAction.id]: browseMissionsAction,
  [applyMissionAction.id]: applyMissionAction,
  [negotiateOfferAction.id]: negotiateOfferAction,
  [setAlertAction.id]: setAlertAction,
  [validateTimesheetAction.id]: validateTimesheetAction,
  [ratePartyAction.id]: ratePartyAction,
  [generateShareableCVAction.id]: generateShareableCVAction,
  [simulateMissionIncomeAction.id]: simulateMissionIncomeAction,
  [toggleOpenToWorkAction.id]: toggleOpenToWorkAction,
  [createJobPostingAction.id]: createJobPostingAction,
  [archiveJobAction.id]: archiveJobAction,
  [submitApplicationAction.id]: submitApplicationAction,
  [parseCvAiAction.id]: parseCvAiAction,
  [compareApplicantsAction.id]: compareApplicantsAction,
  [scoreOpenQuestionsAction.id]: scoreOpenQuestionsAction,
  [scheduleInterviewAction.id]: scheduleInterviewAction,
  [logInterviewFeedbackAction.id]: logInterviewFeedbackAction,
  [createShiftAction.id]: createShiftAction,
  [updateShiftAction.id]: updateShiftAction,
  [deleteShiftAction.id]: deleteShiftAction,
  [publishRosterAction.id]: publishRosterAction,
  [applyPatternAction.id]: applyPatternAction,
  [setAvailabilityAction.id]: setAvailabilityAction,
  [requestLeaveAction.id]: requestLeaveAction,
  [postSwapRequestAction.id]: postSwapRequestAction,
  [acceptSwapAction.id]: acceptSwapAction,
  [resolveGapAction.id]: resolveGapAction,
  [getCoverageStatusAction.id]: getCoverageStatusAction,
  [assignFloaterAction.id]: assignFloaterAction,
  [validateMoveAction.id]: validateMoveAction,
  [exportTimesheetAction.id]: exportTimesheetAction,
  [exportIcalLinkAction.id]: exportIcalLinkAction,
  [createEventAction.id]: createEventAction,
  [updateEventAction.id]: updateEventAction,
  [deleteEventAction.id]: deleteEventAction,
  [listEventsAction.id]: listEventsAction,
  [createRecurringEventsAction.id]: createRecurringEventsAction,
  [addEmployeeToFacilityAction.id]: addEmployeeToFacilityAction,
  [updateEmployeeRoleAction.id]: updateEmployeeRoleAction,
  [removeEmployeeFromFacilityAction.id]: removeEmployeeFromFacilityAction,
  [listEmployeesAction.id]: listEmployeesAction,
  [getProfileFullAction.id]: getProfileFullAction,
  [assignSecondaryFacilityAction.id]: assignSecondaryFacilityAction,
  [inviteUserAction.id]: inviteUserAction,
  [terminateUserAction.id]: terminateUserAction,
  [reactivateUserAction.id]: reactivateUserAction,
  [createRoleAction.id]: createRoleAction,
  [updateRoleAction.id]: updateRoleAction,
  [deleteRoleAction.id]: deleteRoleAction,
  [listRolesAction.id]: listRolesAction,
  [createContractAction.id]: createContractAction,
  [listContractsAction.id]: listContractsAction,
  [getContractAction.id]: getContractAction,
  [generateDraftAction.id]: generateDraftAction,
  [sendForSignatureAction.id]: sendForSignatureAction,
  [signDigitalAction.id]: signDigitalAction,
  [createAmendmentAction.id]: createAmendmentAction,
  [terminateEmploymentAction.id]: terminateEmploymentAction,
  [calculatePeriodVariablesAction.id]: calculatePeriodVariablesAction,
  [lockPeriodAction.id]: lockPeriodAction,
  [exportDataAction.id]: exportDataAction,
  [addManualEntryAction.id]: addManualEntryAction,
  [approveGlobalAction.id]: approveGlobalAction,
  [publishPayslipsAction.id]: publishPayslipsAction,
  [uploadPayslipBundleAction.id]: uploadPayslipBundleAction,
  [generateSecoReportAction.id]: generateSecoReportAction,
  [grantAuditorAccessAction.id]: grantAuditorAccessAction,
  [adjustBalanceAction.id]: adjustBalanceAction,
  [compensateOvertimeAction.id]: compensateOvertimeAction,
  [getBalancesAction.id]: getBalancesAction,
  [approveCorrectionAction.id]: approveCorrectionAction,
  [clockInAction.id]: clockInAction,
  [clockOutAction.id]: clockOutAction,
  [recordBreakAction.id]: recordBreakAction,
  [declarePiquetInterventionAction.id]: declarePiquetInterventionAction,
  [compareEfficiencyAction.id]: compareEfficiencyAction,
  [predictNetworkLoadAction.id]: predictNetworkLoadAction,
  [generateCrossChargeReportAction.id]: generateCrossChargeReportAction,
  [setTransferPricingAction.id]: setTransferPricingAction,
  [auditComplianceScoreAction.id]: auditComplianceScoreAction,
  [broadcastPolicyAction.id]: broadcastPolicyAction,
  [standardizeRolesAction.id]: standardizeRolesAction,
  [dispatchStaffAction.id]: dispatchStaffAction,
  [enrollMemberAction.id]: enrollMemberAction,
  [requestCoverageAction.id]: requestCoverageAction,
  [searchNetworkAvailabilityAction.id]: searchNetworkAvailabilityAction,
  [analyzeTrendsAction.id]: analyzeTrendsAction,
  [askAgentAction.id]: askAgentAction,
  [createTicketWithCapaAction.id]: createTicketWithCapaAction,
  [logAiFeedbackAction.id]: logAiFeedbackAction,
  [manageCapaWorkflowAction.id]: manageCapaWorkflowAction,
  [broadcastSystemAlertAction.id]: broadcastSystemAlertAction,
  [impersonateUserAction.id]: impersonateUserAction,
  [manageBillingAction.id]: manageBillingAction,
  [provisionTenantAction.id]: provisionTenantAction,
  [sendEmailAction.id]: sendEmailAction,
  [bulkExportAction.id]: bulkExportAction,
  [flagDiscrepancyAction.id]: flagDiscrepancyAction,
  [getClientDashboardAction.id]: getClientDashboardAction,
  [checkComplianceStatusAction.id]: checkComplianceStatusAction,
  [logFphCreditsAction.id]: logFphCreditsAction,
  [manageApprenticeshipAction.id]: manageApprenticeshipAction,
  [blockUserAction.id]: blockUserAction,
  [reportIncidentAction.id]: reportIncidentAction,
  [triggerCrisisAlertAction.id]: triggerCrisisAlertAction,
  [extractTextAction.id]: extractTextAction,
  [parseDocumentAction.id]: parseDocumentAction,
  [verifyDocumentAction.id]: verifyDocumentAction,
  [verifyGLNAction.id]: verifyGLNAction,
  [verifyUIDAction.id]: verifyUIDAction,
  [manageCertificationAction.id]: manageCertificationAction,
  [updateContractTermsAction.id]: updateContractTermsAction,
  [verifyIdentityAction.id]: verifyIdentityAction,
  [downloadPayslipAction.id]: downloadPayslipAction,
  [updateIbanAction.id]: updateIbanAction,
  [addSkillAction.id]: addSkillAction,
  [searchBySkillAction.id]: searchBySkillAction,
} as const;

export function getAiToolsCatalog() {
  const { zodToJsonSchema } = require("zod-to-json-schema");
  
  return Object.values(ActionRegistry).map(action => ({
    name: action.id,
    description: action.description,
    inputSchema: zodToJsonSchema(action.schema),
    metadata: {
      label: action.label,
      keywords: action.keywords,
      icon: action.icon,
      riskLevel: action.metadata?.riskLevel,
      isRAG: action.metadata?.isRAG,
    },
  }));
}

export type ActionRegistryType = typeof ActionRegistry;
export type ActionId = keyof ActionRegistryType;


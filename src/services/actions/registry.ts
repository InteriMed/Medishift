import { createThreadAction } from "./catalog/messages/createThread";
import { replyThreadAction } from "./catalog/messages/replyThread";
import { fetchThreadAction } from "./catalog/messages/fetchThread";
import { listThreadsAction } from "./catalog/messages/listThreads";
import { markReadAction } from "./catalog/messages/markRead";
import { markAcknowledgeAction } from "./catalog/messages/markAcknowledge";
import { getStatsAction } from "./catalog/messages/getStats";
import { archiveThreadAction } from "./catalog/messages/archiveThread";
import { flagPriorityAction } from "./catalog/messages/flagPriority";
import { compileTextAction } from "./catalog/messages/compileText";
import { compileUrlMapAction } from "./catalog/messages/compileUrlMap";
import { pinThreadAction } from "./catalog/messages/pinThread";
import { getPollResultsAction } from "./catalog/messages/getPollResults";
import { votePollAction } from "./catalog/messages/votePoll";
import { revealIdentityAction } from "./catalog/messages/revealIdentity";
import { addPrivateNoteAction } from "./catalog/messages/addPrivateNote";
import { ragQueryAction } from "./catalog/messages/ragQuery";
import { getMeAction } from "./catalog/profile/me/getMe";
import { updateMeAction } from "./catalog/profile/me/updateMe";
import { setPreferencesAction } from "./catalog/profile/me/setPreferences";
import { uploadAvatarAction } from "./catalog/profile/me/uploadAvatar";
import { updateFacilitySettingsAction } from "./catalog/profile/facility/updateSettings";
import { updateFacilityConfigAction } from "./catalog/profile/facility/updateConfig";
import { manageFacilityWhitelistAction } from "./catalog/profile/facility/manageWhitelist";
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
  [updateFacilitySettingsAction.id]: updateFacilitySettingsAction,
  [updateFacilityConfigAction.id]: updateFacilityConfigAction,
  [manageFacilityWhitelistAction.id]: manageFacilityWhitelistAction,
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


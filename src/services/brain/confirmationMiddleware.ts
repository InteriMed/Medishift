import { ActionDefinition } from '../types/context';

/**
 * RISK LEVEL CLASSIFICATION
 * Defines the safety guardrails for each action
 */
export type RiskLevel = 
  | 'READ_ONLY'   // Safe (e.g., Search Docs, View Calendar)
  | 'WRITE_LOW'   // Reversible (e.g., Draft Shift, Send Message)
  | 'WRITE_HIGH'  // Impactful (e.g., Send Payroll, Publish Roster) -> Requires UI Confirmation
  | 'CRITICAL';   // Irreversible (e.g., Delete Data, Fire User) -> Requires 2FA / Password

/**
 * Confirmation requirement based on risk level
 */
export interface ConfirmationRequirement {
  required: boolean;
  level: 'UI_POPUP' | '2FA' | 'PASSWORD' | 'NONE';
  message: string;
}

/**
 * Proposal object for actions requiring confirmation
 */
export interface ActionProposal {
  status: 'CONFIRMATION_REQUIRED';
  actionId: string;
  riskLevel: RiskLevel;
  confirmationToken: string;
  summary: {
    action: string;
    target: string;
    impact: string;
    reversible: boolean;
  };
  previewData?: any;
}

/**
 * Get confirmation requirement for a risk level
 */
export function getConfirmationRequirement(riskLevel: RiskLevel): ConfirmationRequirement {
  switch (riskLevel) {
    case 'READ_ONLY':
    case 'WRITE_LOW':
      return {
        required: false,
        level: 'NONE',
        message: '',
      };
    
    case 'WRITE_HIGH':
      return {
        required: true,
        level: 'UI_POPUP',
        message: 'This action will affect published data. Please confirm to proceed.',
      };
    
    case 'CRITICAL':
      return {
        required: true,
        level: 'PASSWORD',
        message: 'This is a critical action that cannot be undone. Enter your password to confirm.',
      };
  }
}

/**
 * Create action proposal for user confirmation
 */
export function createActionProposal(
  actionId: string,
  riskLevel: RiskLevel,
  previewData: any
): ActionProposal {
  const confirmationToken = generateConfirmationToken();

  return {
    status: 'CONFIRMATION_REQUIRED',
    actionId,
    riskLevel,
    confirmationToken,
    summary: generateActionSummary(actionId, previewData),
    previewData,
  };
}

/**
 * Generate human-readable summary of action impact
 */
function generateActionSummary(actionId: string, data: any): ActionProposal['summary'] {
  const summaries: Record<string, (data: any) => ActionProposal['summary']> = {
    'team.terminate_user': (data) => ({
      action: 'Terminate Employment',
      target: `User: ${data.userId}`,
      impact: 'User will lose access to all systems. Future shifts will be cancelled.',
      reversible: false,
    }),
    'payroll.export_data': (data) => ({
      action: 'Export Payroll Data',
      target: `Period: ${data.period}`,
      impact: 'Payroll data will be sent to fiduciary. This action is logged for audit.',
      reversible: false,
    }),
    'calendar.publish_roster': (data) => ({
      action: 'Publish Schedule',
      target: `Month: ${data.month}`,
      impact: 'All staff will receive notifications about their shifts.',
      reversible: true,
    }),
    'admin.manage_billing': (data) => ({
      action: 'Change Billing Status',
      target: `Facility: ${data.facilityId}`,
      impact: data.status === 'SUSPENDED' 
        ? 'Facility will be switched to READ-ONLY mode. No write operations allowed.'
        : 'Facility access will be restored.',
      reversible: true,
    }),
  };

  const summaryGenerator = summaries[actionId];
  if (summaryGenerator) {
    return summaryGenerator(data);
  }

  return {
    action: actionId,
    target: 'Unknown',
    impact: 'This action requires confirmation.',
    reversible: false,
  };
}

/**
 * Generate unique confirmation token
 */
function generateConfirmationToken(): string {
  return `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate confirmation token (expires after 5 minutes)
 */
export function validateConfirmationToken(token: string): boolean {
  const timestamp = parseInt(token.split('_')[1]);
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return (now - timestamp) < fiveMinutes;
}

/**
 * MIDDLEWARE: Check if action requires confirmation
 */
export function requiresConfirmation(
  action: ActionDefinition<any, any>,
  input: any,
  isDryRun: boolean
): boolean {
  const riskLevel = action.metadata?.riskLevel || 'WRITE_LOW';
  const confirmation = getConfirmationRequirement(riskLevel as RiskLevel);
  
  // If dry run, always return proposal
  if (isDryRun) {
    return true;
  }
  
  return confirmation.required;
}


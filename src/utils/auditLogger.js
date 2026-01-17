import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

const logAudit = httpsCallable(functions, 'logAudit');

export const ADMIN_AUDIT_EVENTS = {
  USER_APPROVED: 'admin:user_approved',
  USER_REJECTED: 'admin:user_rejected',
  SHIFT_FORCE_ASSIGNED: 'admin:shift_force_assigned',
  SHIFT_PAY_EDITED: 'admin:shift_pay_edited',
  SHIFT_STATUS_EDITED: 'admin:shift_status_edited',
  USER_IMPERSONATED: 'admin:user_impersonated',
  EMPLOYEE_INVITED: 'admin:employee_invited',
  EMPLOYEE_ROLE_UPDATED: 'admin:employee_role_updated',
  ACCOUNT_CREATED: 'admin:account_created',
  DATABASE_EDITED: 'admin:database_edited'
};

export const logAdminAction = async ({
  eventType,
  action,
  resource = {},
  details = {},
  success = true,
  errorMessage = null
}) => {
  if (!eventType || !action) {
    console.error(`[AuditLogger] 🛑 MISSING REQUIRED PARAMS: eventType="${eventType}", action="${action}"`);
    console.trace('[AuditLogger] Call stack for missing params:');
    // detailed error for dev context
    const missing = [];
    if (!eventType) missing.push('eventType');
    if (!action) missing.push('action');

    // Return early to correct the crash
    return;
  }

  try {
    await logAudit({
      eventType,
      action,
      resource,
      details: {
        ...details,
        success,
        errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
};


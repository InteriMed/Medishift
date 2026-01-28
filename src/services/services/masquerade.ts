import { ActionContext } from '../types/context';

/**
 * MASQUERADE CONTEXT
 * When an admin impersonates a user, we maintain two identities:
 * - effectiveUser: The user being impersonated (for permissions/actions)
 * - realUser: The admin who initiated the impersonation (for audit trail)
 */
export interface MasqueradeContext extends ActionContext {
  realUserId: string;
  realUserEmail: string;
  isMasquerading: boolean;
  masqueradeStartedAt: Date;
  masqueradeReason: string;
}

/**
 * Check if current context is a masquerade session
 */
export function isMasqueradeContext(ctx: ActionContext): ctx is MasqueradeContext {
  return 'isMasquerading' in ctx && ctx.isMasquerading === true;
}

/**
 * Create masquerade context from admin impersonation
 */
export function createMasqueradeContext(
  adminContext: ActionContext,
  targetUserId: string,
  targetFacilityId: string,
  targetPermissions: string[],
  reason: string
): MasqueradeContext {
  return {
    userId: targetUserId,
    facilityId: targetFacilityId,
    userPermissions: targetPermissions as any[],
    auditLogger: createMasqueradeAuditLogger(adminContext, targetUserId),
    realUserId: adminContext.userId,
    realUserEmail: '', // Should be populated from admin user doc
    isMasquerading: true,
    masqueradeStartedAt: new Date(),
    masqueradeReason: reason,
  };
}

/**
 * Audit logger that tracks both real admin and masqueraded user
 */
function createMasqueradeAuditLogger(adminContext: ActionContext, targetUserId: string) {
  return async (actionId: string, status: 'START' | 'SUCCESS' | 'ERROR', payload?: any) => {
    await adminContext.auditLogger(actionId, status, {
      ...payload,
      masqueradeContext: {
        realUser: adminContext.userId,
        effectiveUser: targetUserId,
        severity: 'CRITICAL',
        warning: 'ADMIN_MASQUERADE_ACTIVE',
      },
    });
  };
}

/**
 * TENANT ISOLATION VALIDATOR
 * Ensures actions are scoped to user's facility unless they have admin.access
 */
export async function validateTenantIsolation(
  ctx: ActionContext,
  targetFacilityId: string,
  actionId: string
): Promise<void> {
  // Admin can cross tenant boundaries
  if (ctx.userPermissions.includes('admin.access')) {
    await ctx.auditLogger(actionId, 'START', {
      warning: 'CROSS_TENANT_ACCESS',
      adminUser: ctx.userId,
      targetFacility: targetFacilityId,
      currentFacility: ctx.facilityId,
    });
    return;
  }

  // Fiduciary can access linked facilities
  if (ctx.userPermissions.includes('fiduciary.access')) {
    const linkedFacilities = await getLinkedFacilities(ctx.userId);
    
    if (!linkedFacilities.includes(targetFacilityId)) {
      throw new Error(
        `Tenant isolation violation: Fiduciary ${ctx.userId} attempted to access unlinked facility ${targetFacilityId}`
      );
    }
    
    return;
  }

  // Standard users must stay within their facility
  if (ctx.facilityId !== targetFacilityId) {
    throw new Error(
      `Tenant isolation violation: User ${ctx.userId} attempted to access facility ${targetFacilityId} but belongs to ${ctx.facilityId}`
    );
  }
}

/**
 * Get linked facilities for a fiduciary user
 */
async function getLinkedFacilities(userId: string): Promise<string[]> {
  // This would query the user's profile or a separate linked_facilities table
  // For now, return empty array as placeholder
  return [];
}

/**
 * CROSS-FACILITY ACCESS CHECKER
 * Specifically for fiduciary operations
 */
export async function validateFiduciaryAccess(
  ctx: ActionContext,
  targetFacilityIds: string[]
): Promise<void> {
  if (!ctx.userPermissions.includes('fiduciary.access')) {
    throw new Error('Fiduciary access required');
  }

  const linkedFacilities = await getLinkedFacilities(ctx.userId);

  const unauthorizedFacilities = targetFacilityIds.filter(
    fid => !linkedFacilities.includes(fid)
  );

  if (unauthorizedFacilities.length > 0) {
    throw new Error(
      `Access denied to facilities: ${unauthorizedFacilities.join(', ')}. Not in linkedFacilities array.`
    );
  }
}


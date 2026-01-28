/**
 * ACTION CONTEXT BUILDER MIDDLEWARE
 * 
 * NOTE: This is currently a CLIENT-SIDE context builder.
 * Actions in this codebase run client-side using Firebase Client SDK.
 * 
 * FUTURE: When actions move to backend (Cloud Functions), this middleware should:
 * 1. Verify ID token server-side using Admin SDK
 * 2. Extract claims from decoded token
 * 3. Enforce facilityId requirement for facility-scoped actions
 * 4. Build ActionContext with verified claims
 * 
 * Reference: IMPLEMENTATION_GUIDE.md - "Trust the Token" Architecture
 */

import { auth } from '../../firebase';
import { ActionContext } from '../types';
import { createAuditLogger } from '../../services/audit';

/**
 * CLIENT-SIDE: Build Action Context from Firebase Auth
 * 
 * SECURITY NOTE: This trusts the client-side auth state.
 * Claims come from Firebase ID token which is verified by Firebase SDK.
 */
export async function buildActionContextFromAuth(): Promise<ActionContext | null> {
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }

  // Get ID token with custom claims
  const idTokenResult = await user.getIdTokenResult();
  const claims = idTokenResult.claims;

  // Extract workspace claims (set by workspace.switch action)
  const facilityId = claims.facilityId as string | undefined;
  const workspaceId = claims.workspaceId as string | undefined;
  const permissions = claims.permissions as string[] | undefined;

  // Warn if no workspace context (user may need to switch workspace)
  if (!workspaceId || workspaceId === 'UNASSIGNED') {
    console.warn('No workspace context in token. User may need to switch workspace.');
  }

  const auditLogger = createAuditLogger(user.uid, facilityId || 'NO_WORKSPACE');

  return {
    userId: user.uid,
    facilityId: facilityId || '',
    userPermissions: permissions || [],
    auditLogger,
    ipAddress: undefined // Client-side cannot reliably determine IP
  };
}

/**
 * BACKEND VERSION (Future Implementation)
 * 
 * This function should be implemented in Cloud Functions when actions move server-side.
 * 
 * @example
 * ```typescript
 * // In Cloud Function:
 * import { admin } from 'firebase-admin';
 * 
 * export async function buildActionContextFromToken(
 *   idToken: string,
 *   ipAddress?: string
 * ): Promise<ActionContext> {
 *   // 1. VERIFY TOKEN
 *   const decodedToken = await admin.auth().verifyIdToken(idToken);
 *   
 *   // 2. EXTRACT CLAIMS (The "Passport")
 *   const { uid, facilityId, workspaceId, permissions } = decodedToken;
 *   
 *   // 3. ENFORCE WORKSPACE REQUIREMENT
 *   if (!workspaceId || workspaceId === 'UNASSIGNED') {
 *     throw new Error('User must switch to a workspace before executing actions');
 *   }
 *   
 *   // 4. BUILD CONTEXT
 *   return {
 *     userId: uid,
 *     facilityId: facilityId || '',
 *     userPermissions: permissions || [],
 *     auditLogger: createBackendAuditLogger(uid, facilityId, ipAddress),
 *     ipAddress
 *   };
 * }
 * ```
 */

/**
 * TENANT ISOLATION VALIDATOR
 * 
 * Call this in actions that access facility-specific data
 * to ensure user can only access their own facility's data.
 */
export function validateTenantIsolation(
  ctx: ActionContext,
  targetFacilityId: string,
  actionId: string
): void {
  // Admin can cross tenant boundaries
  if (ctx.userPermissions.includes('admin.access')) {
    console.warn(`CROSS-TENANT ACCESS: Admin ${ctx.userId} accessing facility ${targetFacilityId}`);
    ctx.auditLogger(actionId, 'START', {
      warning: 'CROSS_TENANT_ACCESS',
      adminUser: ctx.userId,
      targetFacility: targetFacilityId,
      currentFacility: ctx.facilityId
    });
    return;
  }

  // Fiduciary can access linked facilities (implementation needed)
  if (ctx.userPermissions.includes('fiduciary.access')) {
    // TODO: Check linkedFacilities array
    console.warn('Fiduciary access not fully implemented');
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
 * CHECK WORKSPACE REQUIREMENT
 * 
 * Call this in actions that require an active workspace.
 * Throws error if user hasn't switched to a workspace.
 */
export function requireWorkspace(ctx: ActionContext, actionId: string): void {
  if (!ctx.facilityId || ctx.facilityId === 'NO_WORKSPACE' || ctx.facilityId === 'UNASSIGNED') {
    throw new Error(
      `Action ${actionId} requires an active workspace. Please switch to a workspace first.`
    );
  }
}


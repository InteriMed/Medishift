import { useState } from "react";
import { ActionRegistry, ActionId } from "./registry";
import { ActionContext } from "./types";
import { useSmartAuth } from "../services/auth";
import { createAuditLogger } from "../services/audit";

export function useAction() {
  const auth = useSmartAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async <TInput, TOutput>(
    actionId: ActionId,
    input: TInput
  ): Promise<TOutput> => {
    
    if (!auth) {
      throw new Error("User not authenticated");
    }

    const action = ActionRegistry[actionId];
    if (!action) {
      throw new Error(`Action ${actionId} not found`);
    }

    if (!auth.claims.userPermissions?.includes(action.requiredPermission)) {
      console.error(`Access Denied: Missing ${action.requiredPermission}`);
      const auditLogger = createAuditLogger(auth.uid, auth.claims.facilityId);
      await auditLogger(actionId, 'ERROR', { reason: 'Access Denied', user: auth.uid });
      throw new Error("Unauthorized: Missing required permission");
    }

    setLoading(true);
    setError(null);

    const auditLogger = createAuditLogger(auth.uid, auth.claims.facilityId);

    const context: ActionContext = {
      userId: auth.uid,
      facilityId: auth.claims.facilityId,
      userPermissions: auth.claims.userPermissions || [],
      auditLogger,
      ipAddress: undefined,
    };

    try {
      await auditLogger(actionId, 'START', { input });

      const result = await action.handler(input as any, context);

      await auditLogger(actionId, 'SUCCESS', { resultId: (result as any)?.id });
      
      return result as TOutput;

    } catch (err) {
      const error = err as Error;
      setError(error);
      
      await auditLogger(actionId, 'ERROR', { error: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}

export async function executeAction<TInput, TOutput>(
  actionId: ActionId,
  input: TInput,
  context: ActionContext
): Promise<TOutput> {
  const action = ActionRegistry[actionId];
  if (!action) {
    throw new Error(`Action ${actionId} not found`);
  }

  if (!context.userPermissions.includes(action.requiredPermission)) {
    await context.auditLogger(actionId, 'ERROR', { reason: 'Access Denied' });
    throw new Error("Unauthorized: Missing required permission");
  }

  try {
    await context.auditLogger(actionId, 'START', { input });

    const result = await action.handler(input as any, context);

    await context.auditLogger(actionId, 'SUCCESS', { resultId: (result as any)?.id });
    
    return result as TOutput;

  } catch (err) {
    const error = err as Error;
    await context.auditLogger(actionId, 'ERROR', { error: error.message });
    throw error;
  }
}


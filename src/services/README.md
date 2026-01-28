Implementation Plan: Centralized Action Catalog ("Service Tree")
Goal: Refactor the platform's logic into a centralized "Action Catalog" (src/services) where every business operation is defined as a discrete, auditable, and AI-callable action.

Current Context:

Target Directory: src/services/actions/

Architecture: centralized Registry + Zod Schemas + Granular Permissions + Audit Logging Hook.

Reference File Path: {{CURRENT_FILE_PATH}} (Use this for relative import adjustments).

1. Directory Structure
Create the following folder structure. The catalog folder is organized by domain (common, calendar, profile, etc.).

Plaintext
src/services/
└── actions/
    ├── types.ts                 # Base interfaces (ActionDefinition, Context)
    ├── hook.ts                  # Main execution hook (useAction / executeAction)
    ├── registry.ts              # Central export for AI & Search UI
    ├── audit.ts                 # Simple wrapper for audit logging service
    └── catalog/                 # The actual business logic
        ├── common/              # DB utils, generic formatters
        ├── profile/             # Actions: update_profile, upload_cv
        ├── calendar/            # Actions: create_shift, swap_shift
        ├── marketplace/         # Actions: post_job, apply_job
        ├── messages/            # Actions: send_dm, broadcast
        └── docs/                # Actions: search_sops (RAG)
2. Core Definitions (types.ts)
This file defines the "DNA" of an action. It uses zod to ensure every action is compatible with AI (MCP) and Form validation.

TypeScript
// src/services/actions/types.ts
import { z } from "zod";

// Granular Permissions (Not just Roles)
export type Permission = 
  | 'shift.create' | 'shift.view' 
  | 'user.write' | 'docs.read' 
  | 'admin.access';

// The Context passed to every handler
export interface ActionContext {
  userId: string;
  facilityId: string;
  userPermissions: Permission[];
  auditLogger: (actionId: string, status: 'START'|'SUCCESS'|'ERROR', payload?: any) => Promise<void>;
}

// The Definition of an Action
export interface ActionDefinition<TInput extends z.ZodType, TOutput> {
  // Identity
  id: string;                    // unique key e.g., 'calendar.create_shift'
  fileLocation: string;          // for debugging/refactoring
  
  // Security
  requiredPermission: Permission;
  
  // Metadata for UI & Search
  label: string;                 // e.g., "Create Shift"
  description: string;           // Instructions for AI Agent
  keywords: string[];            // For search bar e.g., ["add work", "schedule"]
  icon: string;                  // Icon key for UI component
  
  // The Input Schema (Zod) - Critical for AI
  schema: TInput;
  
  // Navigation (Optional)
  // If this action requires a UI redirect (e.g., opening a modal)
  route?: {
    path: string;                // e.g., "/calendar"
    queryParam?: Record<string, string>; // e.g., { modal: "create-shift" }
  };
  
  // Metadata flags
  metadata?: {
    isRAG?: boolean;             // Is this a retrieval action?
    autoToast?: boolean;         // Show success toast automatically?
    riskLevel?: 'LOW' | 'HIGH';  // 'HIGH' might require 2FA or confirmation
  };

  // The Logic
  handler: (input: z.infer<TInput>, context: ActionContext) => Promise<TOutput>;
}
3. The Execution Logic (hook.ts)
This hook acts as the "Kernel." It enforces security and auditing before any code runs.

Logic Flow:

Lookup: Find action in Registry by ID.

Auth Check: Compare user.permissions vs action.requiredPermission.

Audit (Start): Log intent to audit.ts.

Execute: Run action.handler(input, context).

Audit (End): Log success or error.

TypeScript
// src/services/actions/hook.ts
import { useState } from "react";
import { ActionRegistry } from "./registry";
import { useAuth } from "@/hooks/useAuth"; // Replace with actual Auth hook
import { logAudit } from "./audit";

export function useAction() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const execute = async <TInput, TOutput>(
    actionId: keyof typeof ActionRegistry,
    input: TInput
  ): Promise<TOutput> => {
    
    const action = ActionRegistry[actionId];
    if (!action) throw new Error(`Action ${actionId} not found`);

    // 1. Security Check
    if (!user.permissions.includes(action.requiredPermission)) {
      console.error(`Access Denied: Missing ${action.requiredPermission}`);
      await logAudit(actionId, 'ERROR', { reason: 'Access Denied', user: user.id });
      throw new Error("Unauthorized");
    }

    setLoading(true);

    const context = {
      userId: user.id,
      facilityId: user.facilityId,
      userPermissions: user.permissions,
      auditLogger: logAudit
    };

    try {
      // 2. Audit Start
      await logAudit(actionId, 'START', { input });

      // 3. Execution
      const result = await action.handler(input, context);

      // 4. Audit Success
      await logAudit(actionId, 'SUCCESS', { resultId: (result as any)?.id });
      
      return result as TOutput;

    } catch (error) {
      // 5. Audit Error
      await logAudit(actionId, 'ERROR', { error: error.message });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading };
}
4. The Registry (registry.ts)
This file aggregates all actions. It exposes two things:

ActionRegistry: Map for the frontend to execute code.

AiToolCatalog: List of JSON schemas for the MCP Agent.

TypeScript
// src/services/actions/registry.ts
import { createShiftAction } from "./catalog/calendar/createShift";
import { searchSOPsAction } from "./catalog/docs/searchSOPs";
// ... import all actions

export const ActionRegistry = {
  [createShiftAction.id]: createShiftAction,
  [searchSOPsAction.id]: searchSOPsAction,
} as const;

// Helper for AI Agent (MCP Format)
export function getAiToolsCatalog() {
  return Object.values(ActionRegistry).map(action => ({
    name: action.id,
    description: action.description,
    // Note: You need 'zod-to-json-schema' installed
    inputSchema: require("zod-to-json-schema").zodToJsonSchema(action.schema),
  }));
}
5. Example Action Implementation
Create a sample action to validate the pattern.

File: src/services/actions/catalog/calendar/createShift.ts

TypeScript
import { z } from "zod";
import { ActionDefinition } from "../../types";

// 1. Define Input Schema
const InputSchema = z.object({
  date: z.string().date(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  employeeId: z.string(),
  type: z.enum(['STANDARD', 'NIGHT', 'ON_CALL'])
});

// 2. Define Action
export const createShiftAction: ActionDefinition<typeof InputSchema, void> = {
  id: "calendar.create_shift",
  fileLocation: "src/services/actions/catalog/calendar/createShift.ts",
  
  requiredPermission: "shift.create",
  
  label: "Create Shift",
  description: "Assigns a shift to an employee. Validates overlaps automatically.",
  keywords: ["add shift", "roster", "schedule"],
  icon: "CalendarPlus",
  
  schema: InputSchema,
  
  route: {
    path: "/calendar",
    queryParam: { view: "week", modal: "create-shift" }
  },

  handler: async (input, ctx) => {
    // Business Logic Here
    console.log(`Creating shift for ${input.employeeId} by ${ctx.userId}`);
    // await db.collection('shifts').add(...)
  }
};
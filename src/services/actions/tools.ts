import { zodToJsonSchema } from "zod-to-json-schema";
import { ActionRegistry } from "./registry"; // Your central registry
import { ActionDefinition } from "./types";

/**
 * Transforms the Action Registry into an OpenAI/Anthropic compatible Tool Array.
 */
export function getAgentTools() {
  const tools: any[] = [];

  for (const [actionId, action] of Object.entries(ActionRegistry)) {
    // skip internal or admin-only tools if needed
    // if (action.riskLevel === 'CRITICAL') continue; 

    const jsonSchema = zodToJsonSchema(action.schema, { target: "jsonSchema7" });

    // Clean up the schema to remove Zod-specific artifacts
    // (LLMs prefer clean, simple JSON schemas)
    const parameters = {
      type: "object",
      properties: (jsonSchema as any).properties || {},
      required: (jsonSchema as any).required || [],
      additionalProperties: false, // Strict mode for reliability
    };

    tools.push({
      type: "function",
      function: {
        name: actionId, // e.g., "calendar.resolve_gap"
        description: action.description,
        parameters: parameters,
      },
    });
  }

  return tools;
}

/**
 * Helper to find and execute a tool based on the Agent's decision.
 */
export async function executeToolCall(toolName: string, toolArgs: any, context: any) {
  const action = ActionRegistry[toolName];
  
  if (!action) {
    throw new Error(`Tool '${toolName}' not found.`);
  }

  try {
    // 1. Validate Input (Double check via Zod)
    const validatedInput = action.schema.parse(toolArgs);

    // 2. Execute Handler
    // Type assertion is safe here because Zod validation ensures the input matches the schema
    const result = await (action.handler as (input: any, context: any) => Promise<any>)(validatedInput, context);
    
    return JSON.stringify({ status: "success", data: result });
  } catch (error: any) {
    console.error(`Tool Execution Failed (${toolName}):`, error);
    return JSON.stringify({ 
      status: "error", 
      message: error.message || "Unknown tool error" 
    });
  }
}
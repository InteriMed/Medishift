import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;
const scopeEnum = ['thread', 'collection', 'facility'] as const;

const RagQuerySchema = z.object({
  text: z.string().min(1),
  request: z.string().min(1),
  context: z.object({
    collectionType: z.enum(collectionTypeEnum).optional(),
    threadId: z.string().optional(),
    scope: z.enum(scopeEnum).optional(),
  }).optional(),
});

interface RagResult {
  answer: string;
  sources: Array<{
    threadId: string;
    content: string;
    relevance: number;
  }>;
  confidence: number;
}

export const ragQueryAction: ActionDefinition<typeof RagQuerySchema, RagResult> = {
  id: "thread.rag_query",
  fileLocation: "src/services/actions/catalog/messages/ragQuery.ts",
  
  requiredPermission: "thread.read",
  
  label: "RAG Search",
  description: "Perform semantic search across thread content",
  keywords: ["search", "ai", "semantic", "rag"],
  icon: "Search",
  
  schema: RagQuerySchema,
  
  metadata: {
    isRAG: true,
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof RagQuerySchema>, ctx: ActionContext): Promise<RagResult> => {
    const { text, request, context } = input;

    const { functions } = await import('../../../services/firebase');
    const { httpsCallable } = await import('firebase/functions');
    
    const ragQuery = httpsCallable(functions, 'performRagQuery');
    
    const result = await ragQuery({
      text,
      request,
      context: {
        ...context,
        userId: ctx.userId,
        facilityId: ctx.facilityId,
      },
    });

    await ctx.auditLogger('thread.rag_query', 'SUCCESS', {
      request,
      sourcesFound: (result.data as any).sources?.length || 0,
    });

    return result.data as RagResult;
  }
};


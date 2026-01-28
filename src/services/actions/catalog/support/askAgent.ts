import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { AgentResponse } from '../types';
import { checkRateLimit, incrementUsage } from '../../../brain/tokenBudgeting';
import { buildSystemPrompt } from '../../../brain/contextInjection';

const AskAgentSchema = z.object({
  query: z.string(),
  context: z.object({
    currentUrl: z.string().optional(),
    currentPage: z.string().optional(),
  }).optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

interface AskAgentResult {
  response: AgentResponse;
  sources: {
    title: string;
    url: string;
    page?: number;
  }[];
  rateLimitInfo: {
    remaining: number;
    resetAt: Date;
  };
}

export const askAgentAction: ActionDefinition<typeof AskAgentSchema, AskAgentResult> = {
  id: "support.ask_agent",
  fileLocation: "src/services/actions/catalog/support/askAgent.ts",
  
  requiredPermission: "thread.read",
  
  label: "Ask AI Support Agent",
  description: "Level 1 AI support with RAG search, sources, and rate limiting",
  keywords: ["support", "ai", "agent", "help", "rag"],
  icon: "MessageCircle",
  
  schema: AskAgentSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
    isRAG: true,
  },

  handler: async (input, ctx) => {
    const { query, context, conversationHistory } = input;

    // Check rate limit
    const rateLimit = await checkRateLimit(ctx);
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.message || 'Rate limit exceeded');
    }

    // Build system prompt with context injection
    const basePrompt = await loadBasePrompt();
    const systemPrompt = await buildSystemPrompt(basePrompt, ctx);

    // Context-aware document search
    const docsRef = collection(db, 'documentation');
    let docsQuery = query(docsRef, limit(10));

    if (context?.currentPage) {
      docsQuery = query(
        docsRef,
        where('category', '==', context.currentPage),
        limit(5)
      );
    }

    const docsSnapshot = await getDocs(docsQuery);
    
    const relevantDocs: any[] = [];
    const sources: any[] = [];
    
    docsSnapshot.forEach(doc => {
      const docData = doc.data();
      relevantDocs.push(docData.content);
      sources.push({
        title: docData.title,
        url: docData.url || `/docs/${doc.id}`,
        page: docData.page,
      });
    });

    // Generate AI response (placeholder for actual LLM call)
    const answer = await generateAIResponse(
      systemPrompt,
      query,
      relevantDocs,
      conversationHistory || []
    );

    const confidence = calculateConfidence(answer, relevantDocs);

    // Suggest actions based on confidence
    const suggestedActions = confidence < 0.7 
      ? [{
          actionId: 'support.create_ticket_with_capa',
          label: 'Open Support Ticket',
          description: 'Let our team help you directly'
        }]
      : findRelevantActions(query);

    // Increment usage counter
    await incrementUsage(ctx.userId);

    await ctx.auditLogger('support.ask_agent', 'SUCCESS', {
      query,
      confidence,
      sourcesFound: sources.length,
      suggestedActionsCount: suggestedActions.length,
    });

    return {
      response: {
        answer,
        confidence,
        suggestedActions,
        sources: sources.slice(0, 3).map(s => s.url),
      },
      sources,
      rateLimitInfo: {
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
      },
    };
  }
};

async function loadBasePrompt(): Promise<string> {
  // Load from specifications.md
  return `You are the Interimed AI Assistant...`;
}

async function generateAIResponse(
  systemPrompt: string,
  query: string,
  docs: string[],
  history: any[]
): Promise<string> {
  // Placeholder for actual LLM integration (OpenAI, Anthropic, etc.)
  // This is where you'd call: await openai.chat.completions.create(...)
  
  const hasRelevantDocs = docs.length > 0;
  
  if (hasRelevantDocs) {
    return `Based on the documentation, here's what I found regarding "${query}". According to [Policy Document], you should...`;
  }
  
  return `I understand you're asking about "${query}". However, I couldn't find specific documentation on this topic. Would you like me to open a support ticket for you?`;
}

function calculateConfidence(answer: string, docs: string[]): number {
  // Simple heuristic - in production, use LLM confidence scores
  if (docs.length === 0) return 0.3;
  if (docs.length > 0 && answer.includes('According to')) return 0.85;
  return 0.6;
}

function findRelevantActions(query: string): any[] {
  // In production, use semantic search on action descriptions
  return [];
}



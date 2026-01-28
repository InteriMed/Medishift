import { ActionContext } from '../types/context';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

/**
 * TOKEN BUDGETING & RATE LIMITING
 * Prevents users from burning through AI budget
 */

export interface TokenBudget {
  dailyLimit: number;
  monthlyLimit: number;
  usedToday: number;
  usedThisMonth: number;
  lastResetDate: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message?: string;
}

/**
 * Get user's AI usage budget
 */
export async function getTokenBudget(userId: string): Promise<TokenBudget> {
  const budgetRef = doc(db, 'ai_token_budgets', userId);
  const budgetSnap = await getDoc(budgetRef);

  if (!budgetSnap.exists()) {
    // Create default budget
    const defaultBudget: TokenBudget = {
      dailyLimit: 50,
      monthlyLimit: 1000,
      usedToday: 0,
      usedThisMonth: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
    };
    
    await updateDoc(budgetRef, defaultBudget);
    return defaultBudget;
  }

  return budgetSnap.data() as TokenBudget;
}

/**
 * Check if user has exceeded their AI budget
 */
export async function checkRateLimit(
  ctx: ActionContext,
  estimatedTokens: number = 1000
): Promise<RateLimitResult> {
  const budget = await getTokenBudget(ctx.userId);
  const today = new Date().toISOString().split('T')[0];

  // Reset daily counter if new day
  if (budget.lastResetDate !== today) {
    budget.usedToday = 0;
    budget.lastResetDate = today;
  }

  // Check daily limit
  if (budget.usedToday >= budget.dailyLimit) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      remaining: 0,
      resetAt: tomorrow,
      message: 'Daily AI message limit reached. Please open a support ticket or try again tomorrow.',
    };
  }

  // Check monthly limit
  if (budget.usedThisMonth >= budget.monthlyLimit) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      remaining: 0,
      resetAt: nextMonth,
      message: 'Monthly AI quota exceeded. Please contact your administrator.',
    };
  }

  return {
    allowed: true,
    remaining: budget.dailyLimit - budget.usedToday,
    resetAt: new Date(),
  };
}

/**
 * Increment usage counter
 */
export async function incrementUsage(
  userId: string,
  tokensUsed: number = 1000
): Promise<void> {
  const budgetRef = doc(db, 'ai_token_budgets', userId);
  
  await updateDoc(budgetRef, {
    usedToday: increment(1),
    usedThisMonth: increment(1),
    lastUsedAt: serverTimestamp(),
  });
}

/**
 * Manage conversation history (rolling window)
 */
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tokenCount?: number;
}

const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_TOKENS = 4000;

/**
 * Compress conversation history to fit within token budget
 */
export function compressConversationHistory(
  messages: ConversationMessage[]
): ConversationMessage[] {
  // Keep only last N messages
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);

  // Calculate total tokens
  let totalTokens = 0;
  const compressed: ConversationMessage[] = [];

  for (let i = recent.length - 1; i >= 0; i--) {
    const msg = recent[i];
    const estimatedTokens = msg.content.length / 4; // Rough estimate
    
    if (totalTokens + estimatedTokens > MAX_HISTORY_TOKENS) {
      break;
    }
    
    compressed.unshift(msg);
    totalTokens += estimatedTokens;
  }

  // If we had to drop messages, add a summary marker
  if (compressed.length < messages.length) {
    compressed.unshift({
      role: 'assistant',
      content: `[Earlier messages summarized: ${messages.length - compressed.length} messages]`,
      timestamp: new Date(),
    });
  }

  return compressed;
}

/**
 * Format conversation history for prompt
 */
export function formatConversationHistory(
  messages: ConversationMessage[]
): string {
  const compressed = compressConversationHistory(messages);
  
  return compressed.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n');
}


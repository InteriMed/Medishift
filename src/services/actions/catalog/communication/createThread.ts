import { z } from "zod";
import { ActionDefinition, CollectionType } from "../../types";
import { db } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;
const threadStatusEnum = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;
const priorityEnum = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

const CreateThreadSchema = z.object({
  collectionType: z.enum(collectionTypeEnum),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1),
  participants: z.array(z.string()).optional(),
  
  category: z.string().optional(),
  status: z.enum(threadStatusEnum).optional(),
  
  isAnonymous: z.boolean().optional(),
  offenderName: z.string().optional(),
  
  allowComments: z.boolean().optional(),
  pollData: z.object({
    question: z.string(),
    options: z.array(z.string()),
    allowMultiple: z.boolean(),
    expiresAt: z.number().optional(),
  }).optional(),
  
  mustAcknowledge: z.boolean().optional(),
  
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  
  priority: z.enum(priorityEnum).optional(),
});

interface ThreadCreationResult {
  threadId: string;
  collectionType: CollectionType;
}

export const createThreadAction: ActionDefinition<typeof CreateThreadSchema, ThreadCreationResult> = {
  id: "thread.create",
  fileLocation: "src/services/actions/catalog/messages/createThread.ts",
  
  requiredPermission: "thread.create",
  
  label: "Create Thread",
  description: "Create a new thread (message, ticket, announcement, policy, or report)",
  keywords: ["create", "thread", "message", "ticket", "announcement", "policy", "report"],
  icon: "MessageSquarePlus",
  
  schema: CreateThreadSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { collectionType, ...threadData } = input;

    const baseThread = {
      content: threadData.content,
      createdBy: threadData.isAnonymous ? 'ANONYMOUS' : ctx.userId,
      createdByHash: threadData.isAnonymous ? hashUserId(ctx.userId) : undefined,
      facilityId: ctx.facilityId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      auditHistory: [{
        uid: ctx.userId,
        action: 'CREATED',
        timestamp: Date.now(),
        ip: ctx.ipAddress,
      }],
      metadata: {
        seenBy: [ctx.userId],
        acknowledgedBy: [],
        reactions: {},
        isPinned: false,
        priority: threadData.priority || 'MEDIUM',
      },
    };

    let collectionName = collectionType;
    let specificData = {};

    switch (collectionType) {
      case 'messages':
        specificData = {
          participants: threadData.participants || [ctx.userId],
          type: threadData.participants && threadData.participants.length > 2 ? 'GROUP' : '1:1',
        };
        break;

      case 'tickets':
        specificData = {
          category: threadData.category || 'GENERAL',
          status: threadData.status || 'OPEN',
          assignedTo: null,
          title: threadData.title || 'Untitled Ticket',
        };
        break;

      case 'hr_reports':
        if (!threadData.isAnonymous && !ctx.userPermissions.includes('reporting.read')) {
          throw new Error('Insufficient permissions to create non-anonymous report');
        }
        
        specificData = {
          isAnonymous: threadData.isAnonymous || false,
          offenderName: threadData.offenderName,
          revealedBy: null,
          revealedAt: null,
          privateNotes: [],
          title: threadData.title || 'HR Report',
        };
        break;

      case 'announcements':
        if (!ctx.userPermissions.includes('announcement.create')) {
          throw new Error('Insufficient permissions to create announcement');
        }
        
        specificData = {
          title: threadData.title || 'Announcement',
          allowComments: threadData.allowComments ?? true,
          pollData: threadData.pollData ? {
            ...threadData.pollData,
            votes: {},
          } : null,
          publishedBy: ctx.userId,
        };
        break;

      case 'policies':
        if (!ctx.userPermissions.includes('policy.create')) {
          throw new Error('Insufficient permissions to create policy');
        }
        
        specificData = {
          title: threadData.title || 'Policy Document',
          mustAcknowledge: threadData.mustAcknowledge ?? false,
          version: 1,
          publishedBy: ctx.userId,
        };
        break;
    }

    const finalThread = {
      ...baseThread,
      ...specificData,
      attachments: threadData.attachments || [],
    };

    const threadRef = await addDoc(collection(db, collectionName), finalThread);

    await ctx.auditLogger('thread.create', 'SUCCESS', {
      threadId: threadRef.id,
      collectionType,
      isAnonymous: threadData.isAnonymous,
    });

    return {
      threadId: threadRef.id,
      collectionType,
    };
  }
};

function hashUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `HASH_${Math.abs(hash).toString(36)}`;
}


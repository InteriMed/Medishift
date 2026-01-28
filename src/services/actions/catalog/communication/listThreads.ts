import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;
const threadStatusEnum = ['OPEN', 'IN_PROGRESS', 'CLOSED'] as const;
const priorityEnum = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const sortByEnum = ['createdAt', 'updatedAt', 'priority'] as const;
const sortOrderEnum = ['asc', 'desc'] as const;

const ListThreadsSchema = z.object({
  collectionType: z.enum(collectionTypeEnum),
  filters: z.object({
    status: z.enum(threadStatusEnum).optional(),
    category: z.string().optional(),
    priority: z.enum(priorityEnum).optional(),
    isPinned: z.boolean().optional(),
  }).optional(),
  pagination: z.object({
    limit: z.number().max(100).default(20),
    startAfter: z.any().optional(),
  }).optional(),
  sortBy: z.enum(sortByEnum).optional(),
  sortOrder: z.enum(sortOrderEnum).optional(),
});

interface ListThreadsResult {
  threads: any[];
  hasMore: boolean;
  lastDoc: any;
}

export const listThreadsAction: ActionDefinition<typeof ListThreadsSchema, ListThreadsResult> = {
  id: "thread.list",
  fileLocation: "src/services/actions/catalog/messages/listThreads.ts",
  
  requiredPermission: "thread.read",
  
  label: "List Threads",
  description: "Retrieve a list of threads with filters",
  keywords: ["list", "threads", "filter", "search"],
  icon: "List",
  
  schema: ListThreadsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof ListThreadsSchema>, ctx: ActionContext): Promise<ListThreadsResult> => {
    const { collectionType, filters, pagination, sortBy, sortOrder } = input;

    let q = query(collection(db, collectionType));

    switch (collectionType) {
      case 'messages':
        q = query(q, where('participants', 'array-contains', ctx.userId));
        break;

      case 'tickets':
        if (!ctx.userPermissions.includes('ticket.manage')) {
          q = query(q, where('createdBy', '==', ctx.userId));
        }
        break;

      case 'hr_reports':
        if (!ctx.userPermissions.includes('reporting.read')) {
          q = query(q, where('createdBy', '==', ctx.userId));
        }
        break;

      case 'announcements':
      case 'policies':
        q = query(q, where('facilityId', '==', ctx.facilityId));
        break;
    }

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    if (filters?.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters?.priority) {
      q = query(q, where('metadata.priority', '==', filters.priority));
    }

    if (filters?.isPinned !== undefined) {
      q = query(q, where('metadata.isPinned', '==', filters.isPinned));
    }

    const sortField = sortBy || 'createdAt';
    const sortDirection = sortOrder || 'desc';
    q = query(q, orderBy(sortField, sortDirection));

    const pageLimit = pagination?.limit || 20;
    q = query(q, limit(pageLimit + 1));

    if (pagination?.startAfter) {
      q = query(q, startAfter(pagination.startAfter));
    }

    const snapshot = await getDocs(q);
    const threads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const hasMore = threads.length > pageLimit;
    if (hasMore) {
      threads.pop();
    }

    const lastDoc = threads.length > 0 ? snapshot.docs[threads.length - 1] : null;

    threads.forEach((thread: any) => {
      if (thread.isAnonymous && !ctx.userPermissions.includes('reporting.read')) {
        thread.createdBy = 'Anonymous User';
        delete thread.createdByHash;
      }
    });

    await ctx.auditLogger('thread.list', 'SUCCESS', {
      collectionType,
      resultCount: threads.length,
    });

    return {
      threads,
      hasMore,
      lastDoc,
    };
  }
};


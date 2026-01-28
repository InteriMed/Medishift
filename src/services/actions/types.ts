import { z } from "zod";

export type Permission = 
  | 'thread.create'
  | 'thread.reply'
  | 'thread.read'
  | 'thread.delete'
  | 'ticket.manage'
  | 'announcement.create'
  | 'announcement.manage'
  | 'policy.create'
  | 'policy.manage'
  | 'reporting.read'
  | 'reporting.reveal_identity'
  | 'reporting.add_private_note'
  | 'admin.access';

export type CollectionType = 'messages' | 'tickets' | 'announcements' | 'policies' | 'hr_reports';

export interface ActionContext {
  userId: string;
  facilityId: string;
  userPermissions: Permission[];
  auditLogger: (actionId: string, status: 'START' | 'SUCCESS' | 'ERROR', payload?: any) => Promise<void>;
  ipAddress?: string;
}

export interface ActionDefinition<TInput extends z.ZodType, TOutput> {
  id: string;
  fileLocation: string;
  requiredPermission: Permission;
  label: string;
  description: string;
  keywords: string[];
  icon: string;
  schema: TInput;
  route?: {
    path: string;
    queryParam?: Record<string, string>;
  };
  metadata?: {
    isRAG?: boolean;
    autoToast?: boolean;
    riskLevel?: 'LOW' | 'HIGH';
  };
  handler: (input: z.infer<TInput>, context: ActionContext) => Promise<TOutput>;
}

export interface AuditEntry {
  uid: string;
  action: string;
  timestamp: number;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface ThreadMetadata {
  seenBy: string[];
  acknowledgedBy: string[];
  reactions: Record<string, string[]>;
  isPinned: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ARCHIVED';
}

export interface PollData {
  question: string;
  options: string[];
  allowMultiple: boolean;
  expiresAt?: number;
  votes: Record<string, string[]>;
}


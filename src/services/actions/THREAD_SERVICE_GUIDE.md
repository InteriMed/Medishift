# Thread Service - Universal Messaging Architecture

## Overview

The Thread Service implements a **polymorphic architecture** that handles all messaging types across the platform:
- Messages (1:1, Group)
- Tickets (Support, HR, IT)
- Announcements (with Polls)
- Policies (with Acknowledgements)
- HR Reports (with Anonymity & Safety Features)

All thread types share the same core actions with collection-specific flags and behaviors.

## Architecture

```
src/services/actions/
├── types.ts              # Core types, permissions, interfaces
├── hook.ts               # useAction() hook for React components
├── registry.ts           # Action registry & AI tool catalog
├── audit.ts              # Audit logging wrapper
├── tools.ts              # AI agent tools (getAgentTools, executeToolCall)
└── catalog/
    ├── common/
    │   └── utils.ts      # Global utilities (sort, find, search, archive, etc.)
    └── messages/
        ├── createThread.ts         # Create any thread type
        ├── replyThread.ts          # Reply to thread
        ├── fetchThread.ts          # Fetch thread with access control
        ├── listThreads.ts          # List threads with filters
        ├── markRead.ts             # Mark as read (seen)
        ├── markAcknowledge.ts      # Acknowledge (policies/announcements)
        ├── getStats.ts             # Get metadata (seen, acknowledged, reactions)
        ├── archiveThread.ts        # Move to archive collection
        ├── flagPriority.ts         # Update priority level
        ├── compileText.ts          # Extract all text content
        ├── compileUrlMap.ts        # Extract all URLs with metadata
        ├── pinThread.ts            # Pin/unpin thread
        ├── getPollResults.ts       # Get poll voting results
        ├── votePoll.ts             # Vote in poll
        ├── revealIdentity.ts       # Reveal anonymous reporter (HR only)
        ├── addPrivateNote.ts       # Add internal HR note
        └── ragQuery.ts             # Semantic search (AI)
```

## Core Types

Located in `src/services/actions/types.ts`:

```typescript
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
```

## Action Registry

Located in `src/services/actions/registry.ts`:

The registry centralizes all action definitions and provides:
- Type-safe action lookup via `ActionRegistry[actionId]`
- AI tool catalog via `getAiToolsCatalog()` - converts Zod schemas to JSON Schema
- Action ID type: `ActionId = keyof ActionRegistryType`

All thread actions are registered under their respective IDs (e.g., `thread.create`, `thread.reply`, etc.).

## React Hook

Located in `src/services/actions/hook.ts`:

### `useAction()`

React hook for executing actions in components:

```typescript
const { execute, loading, error } = useAction();

await execute('thread.create', {
  collectionType: 'messages',
  content: 'Hello',
});
```

**Features:**
- Automatic permission checking
- Loading state management
- Error handling
- Automatic audit logging (START, SUCCESS, ERROR)
- Uses `useSmartAuth()` for authentication context

### `executeAction()`

Backend/server-side action execution:

```typescript
await executeAction('thread.create', input, context);
```

**Features:**
- Requires explicit `ActionContext`
- No React dependencies
- Same permission checks and audit logging

## Audit System

Located in `src/services/actions/audit.ts`:

Simple wrapper that re-exports `logAudit` from `../services/audit`. All actions use `context.auditLogger()` which:
- Logs action start, success, and error states
- Includes user ID, facility ID, timestamp, and payload
- Integrates with system audit trail

## Action Catalog

### Core Thread Actions

#### 1. `thread.create`
Create a new thread (message, ticket, announcement, policy, or report)

**File:** `catalog/messages/createThread.ts`

**Permission:** `thread.create`

**Metadata:**
- `autoToast: true`
- `riskLevel: 'LOW'`

**Input Schema (Zod):**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1),
  participants: z.array(z.string()).optional(),
  category: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']).optional(),
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
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
}
```

**Return Type:**
```typescript
{
  threadId: string;
  collectionType: CollectionType;
}
```

**Collection-Specific Logic:**

**Messages:**
- Validates `participants` array (defaults to `[userId]` if not provided)
- Sets `type: '1:1'` or `'GROUP'` based on participant count (>2 = GROUP)
- Stores `participants` array
- Access control: Only participants can view

**Tickets:**
- Requires `category` (defaults to `'GENERAL'` if not provided)
- Requires `status` (defaults to `'OPEN'` if not provided)
- Auto-assigns `assignedTo: null` initially
- Stores `title` (defaults to `'Untitled Ticket'` if not provided)
- Access control: Creator + Assigned Agent + Admins with `ticket.manage`

**HR Reports:**
- Supports `isAnonymous` flag (defaults to `false`)
- If anonymous: stores `createdBy: 'ANONYMOUS'` and `createdByHash: hashUserId(userId)`
- If not anonymous: requires `reporting.read` permission to create
- Stores `offenderName` for context
- Initializes `revealedBy: null`, `revealedAt: null`, `privateNotes: []`
- Stores `title` (defaults to `'HR Report'` if not provided)
- Access control: STRICT - Only creator (if not anon) + HR Admins with `reporting.read` permission

**Announcements:**
- Requires `announcement.create` permission
- Supports `allowComments` flag (defaults to `true`)
- Optional `pollData` for surveys (initializes `votes: {}`)
- Stores `title` (defaults to `'Announcement'` if not provided)
- Stores `publishedBy: userId`
- Access control: Public read, Admin write

**Policies:**
- Requires `policy.create` permission
- Supports `mustAcknowledge` flag (defaults to `false`)
- Tracks `version: 1`
- Stores `title` (defaults to `'Policy Document'` if not provided)
- Stores `publishedBy: userId`
- Access control: Public read, Admin write

**Common Fields (All Types):**
- `content: string` (required)
- `createdBy: string | 'ANONYMOUS'`
- `createdByHash?: string` (only for anonymous HR reports)
- `facilityId: string`
- `createdAt: serverTimestamp()`
- `updatedAt: serverTimestamp()`
- `auditHistory: [{ uid, action: 'CREATED', timestamp, ip }]`
- `metadata: { seenBy: [userId], acknowledgedBy: [], reactions: {}, isPinned: false, priority }`
- `attachments: []` (optional)

**Hash Function:**
Anonymous reports use `hashUserId(userId)` which generates `HASH_{base36(hash)}` format.

#### 2. `thread.reply`
Add a reply to an existing thread

**File:** `catalog/messages/replyThread.ts`

**Permission:** `thread.reply`

**Metadata:**
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
  content: z.string().min(1),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number(),
  })).optional(),
  visibility: z.enum(['public', 'internal_only']).optional(),
}
```

**Return Type:**
```typescript
{
  replyId: string;
}
```

**Behavior:**
- Creates reply in `{collectionType}_replies` collection
- Sets `visibility: 'public'` by default, or `'internal_only'` if specified
- If `visibility === 'internal_only'`: requires `reporting.add_private_note` permission
- Updates parent thread: `lastReplyAt: serverTimestamp()`, `lastReplyBy: userId`, `replyCount: arrayUnion(replyRef.id).length`
- Attaches audit entry to reply: `{ uid, action: 'REPLIED', timestamp, ip }`
- Appends audit to thread: `{ uid, action: 'REPLIED', metadata: { replyId, visibility } }`

#### 3. `thread.fetch`
Retrieve a thread with optional replies

**File:** `catalog/messages/fetchThread.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
  includeReplies: z.boolean().optional(),
}
```

**Return Type:**
```typescript
{
  thread: any;
  replies?: any[];
  canAccess: boolean;
}
```

**Access Control Logic:**
```typescript
switch (collectionType) {
  case 'messages':
    canAccess = threadData.participants?.includes(ctx.userId) || false;
    break;
  case 'tickets':
    canAccess = 
      threadData.createdBy === ctx.userId ||
      threadData.assignedTo === ctx.userId ||
      ctx.userPermissions.includes('ticket.manage');
    break;
  case 'hr_reports':
    canAccess = 
      (!threadData.isAnonymous && threadData.createdBy === ctx.userId) ||
      (threadData.isAnonymous && threadData.createdByHash === hashUserId(ctx.userId)) ||
      ctx.userPermissions.includes('reporting.read');
    break;
  case 'announcements':
  case 'policies':
    canAccess = true;
    break;
}
```

**Special Handling:**
- If thread not found: throws `'Thread not found'`
- If access denied: throws `'Access denied to this thread'`
- If anonymous HR report and user lacks `reporting.read`: replaces `createdBy` with `'Anonymous User'` and removes `createdByHash`
- Replies filtered: `internal_only` replies only visible if user has `reporting.add_private_note` permission
- Replies ordered by `createdAt: 'asc'`

#### 4. `thread.list`
List threads with filters and pagination

**File:** `catalog/messages/listThreads.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  filters: z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']).optional(),
    category: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    isPinned: z.boolean().optional(),
  }).optional(),
  pagination: z.object({
    limit: z.number().max(100).default(20),
    startAfter: z.any().optional(),
  }).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
}
```

**Return Type:**
```typescript
{
  threads: any[];
  hasMore: boolean;
  lastDoc: any;
}
```

**Automatic Scoping:**
- **Messages:** `where('participants', 'array-contains', userId)`
- **Tickets:** `where('createdBy', '==', userId)` unless user has `ticket.manage` permission
- **HR Reports:** `where('createdBy', '==', userId)` unless user has `reporting.read` permission
- **Announcements/Policies:** `where('facilityId', '==', facilityId)`

**Filtering:**
- `status`: `where('status', '==', filters.status)`
- `category`: `where('category', '==', filters.category)`
- `priority`: `where('metadata.priority', '==', filters.priority)`
- `isPinned`: `where('metadata.isPinned', '==', filters.isPinned)`

**Sorting:**
- Default: `orderBy('createdAt', 'desc')`
- Custom: `orderBy(sortBy || 'createdAt', sortOrder || 'desc')`

**Pagination:**
- Default limit: `20`, max: `100`
- Fetches `limit + 1` to determine `hasMore`
- Uses `startAfter` for cursor-based pagination

**Anonymous Report Handling:**
- Replaces `createdBy` with `'Anonymous User'` and removes `createdByHash` for users without `reporting.read` permission

### Metadata Actions

#### 5. `thread.mark_read`
Mark thread as seen

**File:** `catalog/messages/markRead.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
}
```

**Return Type:** `void`

**Behavior:**
- Updates `metadata.seenBy: arrayUnion(userId)`
- Updates `updatedAt: serverTimestamp()`
- Appends audit: `{ uid, action: 'MARKED_READ', ip }`

#### 6. `thread.mark_acknowledge`
Acknowledge a policy or announcement (compliance tracking)

**File:** `catalog/messages/markAcknowledge.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: true`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['policies', 'announcements']),
  threadId: z.string(),
}
```

**Return Type:** `void`

**Behavior:**
- Updates `metadata.acknowledgedBy: arrayUnion(userId)`
- Updates `updatedAt: serverTimestamp()`
- Appends audit: `{ uid, action: 'ACKNOWLEDGED', ip, metadata: { acknowledgedAt } }`

#### 7. `thread.get_stats`
Get metadata statistics

**File:** `catalog/messages/getStats.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
}
```

**Return Type:**
```typescript
{
  seenCount: number;
  seenBy: string[];
  acknowledgedCount: number;
  acknowledgedBy: string[];
  reactions: Record<string, number>;
  reactionsByUser: Record<string, string[]>;
}
```

**Behavior:**
- Reads thread metadata
- Converts `reactions: { emoji: [userId] }` to `reactions: { emoji: count }`
- Returns both count and full user arrays

### Content Actions

#### 8. `thread.compile_text`
Extract all text content from thread and replies

**File:** `catalog/messages/compileText.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
  includeReplies: z.boolean().default(true),
}
```

**Return Type:**
```typescript
{
  compiledText: string;
  wordCount: number;
  charCount: number;
}
```

**Format:**
```
Thread: {title}
Created: {date}
Author: {createdBy}

Content:
{content}

--- Replies ({count}) ---

Reply 1:
By: {createdBy}
Date: {date}
{content}
```

**Filters:** Excludes `internal_only` replies unless user has `reporting.add_private_note` permission

#### 9. `thread.compile_url_map`
Extract all URLs from thread and replies with metadata

**File:** `catalog/messages/compileUrlMap.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
}
```

**Return Type:**
```typescript
{
  urls: Array<{
    url: string;
    source: 'thread' | 'reply';
    sourceId: string;
    createdBy: string;
    createdAt: number;
    metadata?: {
      title?: string;
      domain?: string;
      isAttachment?: boolean;
    };
  }>;
  totalUrls: number;
}
```

**Behavior:**
- Extracts URLs from `content` using regex: `/(https?:\/\/[^\s]+)/g`
- Extracts URLs from `attachments[].url`
- Extracts domain via `new URL(url).hostname`
- Filters `internal_only` replies unless user has permission
- Returns URLs from both thread and replies with source tracking

### Management Actions

#### 10. `thread.archive`
Move thread to archive collection (atomic copy+delete)

**File:** `catalog/messages/archiveThread.ts`

**Permission:** `thread.delete`

**Metadata:**
- `autoToast: true`
- `riskLevel: 'MEDIUM'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
}
```

**Return Type:**
```typescript
{
  archiveId: string;
  archiveCollection: string;
}
```

**Behavior:**
- Uses `moveToArchive()` utility (transactional)
- Archive collection name: `{collectionType}Archive` (e.g., `messagesArchive`)
- Archive document fields: `_archivedAt`, `_archivedBy`, `_originalId`, `_originalCollection`
- Atomic operation: copy then delete (via Firestore transaction)

#### 11. `thread.flag_priority`
Update thread priority level

**File:** `catalog/messages/flagPriority.ts`

**Permission:** `thread.create`

**Metadata:**
- `autoToast: true`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
}
```

**Return Type:** `void`

**Behavior:**
- Updates `metadata.priority: priority`
- Updates `updatedAt: serverTimestamp()`
- Appends audit: `{ uid, action: 'PRIORITY_CHANGED', metadata: { newPriority } }`

#### 12. `thread.pin`
Toggle thread pin status

**File:** `catalog/messages/pinThread.ts`

**Permission:** `thread.create`

**Metadata:**
- `autoToast: true`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
  isPinned: z.boolean(),
}
```

**Return Type:** `void`

**Behavior:**
- Updates `metadata.isPinned: isPinned`
- Updates `updatedAt: serverTimestamp()`
- Appends audit: `{ uid, action: isPinned ? 'PINNED' : 'UNPINNED' }`

### Announcement-Specific Actions

#### 13. `announcement.get_poll_results`
Get poll voting results

**File:** `catalog/messages/getPollResults.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  announcementId: z.string(),
}
```

**Return Type:**
```typescript
{
  question: string;
  options: string[];
  results: Array<{
    option: string;
    votes: number;
    voters: string[];
    percentage: number;
  }>;
  totalVotes: number;
  isExpired: boolean;
  expiresAt?: number;
}
```

**Behavior:**
- Reads `announcements/{announcementId}`
- Extracts `pollData.votes: { option: [userId] }`
- Calculates vote counts and percentages
- Checks expiration: `isExpired = pollData.expiresAt ? Date.now() > pollData.expiresAt : false`
- Throws if announcement not found or has no poll

#### 14. `announcement.vote_poll`
Submit or remove vote in poll

**File:** `catalog/messages/votePoll.ts`

**Permission:** `thread.read`

**Metadata:**
- `autoToast: true`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  announcementId: z.string(),
  option: z.string(),
  remove: z.boolean().optional(),
}
```

**Return Type:** `void`

**Behavior:**
- Updates `pollData.votes.{option}: arrayUnion(userId)` or `arrayRemove(userId)`
- Updates `updatedAt: serverTimestamp()`
- Appends audit: `{ uid, action: remove ? 'VOTE_REMOVED' : 'VOTED', metadata: { option } }`

### HR Reporting Safety Actions

#### 15. `reporting.reveal_identity` ⚠️ **HIGH RISK**
Reveal identity of anonymous reporter (Break Glass)

**File:** `catalog/messages/revealIdentity.ts`

**Permission:** `reporting.reveal_identity`

**Metadata:**
- `autoToast: true`
- `riskLevel: 'HIGH'`

**Input Schema:**
```typescript
{
  reportId: z.string(),
  reason: z.string().min(10),
}
```

**Return Type:**
```typescript
{
  userId: string;
  email: string;
  revealedAt: number;
}
```

**Behavior:**
- Validates report exists and is anonymous
- Validates identity not already revealed
- Resolves `createdByHash` by iterating all users and comparing hashes
- Updates report: `revealedBy: userId`, `revealedAt: serverTimestamp()`, `revealedReason: reason`
- Appends audit: `{ uid, action: 'IDENTITY_REVEALED', metadata: { reason, revealedUserId, severity: 'HIGH' } }`
- Calls `logSecurityEvent('IDENTITY_REVEALED', userId, { reportId, revealedUserId, reason, facilityId })`
- Returns resolved user identity

**Safety Measures:**
- Only works if report is anonymous
- Cannot reveal twice (throws if `revealedBy` exists)
- Requires written reason (min 10 chars)
- Logged to both audit trail and security events

#### 16. `reporting.add_private_note`
Add internal HR note (invisible to reporter)

**File:** `catalog/messages/addPrivateNote.ts`

**Permission:** `reporting.add_private_note`

**Metadata:**
- `autoToast: true`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  reportId: z.string(),
  content: z.string().min(1),
}
```

**Return Type:**
```typescript
{
  noteId: string;
}
```

**Behavior:**
- Generates note ID: `note_${Date.now()}_${userId.substring(0, 8)}`
- Creates note object: `{ id, content, createdBy, createdAt, visibility: 'internal_only' }`
- Updates report: `privateNotes: arrayUnion(privateNote)`
- Updates `updatedAt: serverTimestamp()`
- Appends audit: `{ uid, action: 'PRIVATE_NOTE_ADDED', metadata: { noteId } }`
- Reporter cannot see these notes (filtered in `thread.fetch`)

### AI/RAG Action

#### 17. `thread.rag_query`
Perform semantic search across thread content

**File:** `catalog/messages/ragQuery.ts`

**Permission:** `thread.read`

**Metadata:**
- `isRAG: true`
- `autoToast: false`
- `riskLevel: 'LOW'`

**Input Schema:**
```typescript
{
  text: z.string().min(1),
  request: z.string().min(1),
  context: z.object({
    collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']).optional(),
    threadId: z.string().optional(),
    scope: z.enum(['thread', 'collection', 'facility']).optional(),
  }).optional(),
}
```

**Return Type:**
```typescript
{
  answer: string;
  sources: Array<{
    threadId: string;
    content: string;
    relevance: number;
  }>;
  confidence: number;
}
```

**Behavior:**
- Calls Cloud Function: `performRagQuery`
- Passes context with `userId` and `facilityId`
- Returns AI-generated answer with source citations

## Global Utility Functions

Located in `src/services/actions/catalog/common/utils.ts`:

### Audit Helper

**`appendAudit(collectionName, documentId, auditEntry)`**
- Appends audit entry to document's `auditHistory` array
- Uses `arrayUnion()` to add entry
- Updates `updatedAt: serverTimestamp()`
- Throws on error (strict compliance mode)

### Archive Operations

**`moveToArchive(sourceCollection, documentId, userId)`**
- Atomically moves document to archive collection
- Uses Firestore transaction for atomicity
- Archive collection: `{sourceCollection}Archive`
- Archive fields: `_archivedAt`, `_archivedBy`, `_originalId`, `_originalCollection`
- Returns archive document ID

### Storage Operations

**`generateSignedURL(storagePath, expiresInMinutes = 60)`**
- Calls Cloud Function `generateSignedURL`
- Returns temporary secure download URL
- Never generates URLs client-side

### Data Manipulation (In-Memory)

**`sortElements<T>(elements, key, order = 'asc')`**
- Client-side sorting for small lists (<100 items)
- Supports string and number types
- Returns new sorted array

**`searchElements<T>(elements, attribute, searchTerm)`**
- In-memory search by attribute
- Case-insensitive string matching
- Returns filtered array

**`findElement<T>(elements, key, value)`**
- Finds first element matching key-value pair
- Returns element or `undefined`

### Attribute Mutations

**`addAttribute(collectionName, documentId, attribute, value, userId)`**
- Adds or updates single field on document
- Updates `updatedAt: serverTimestamp()`
- Appends audit: `{ uid, action: 'ADD_ATTRIBUTE', metadata: { attribute, value } }`

**`removeAttribute(collectionName, documentId, attribute, userId)`**
- Removes field from document using `deleteField()`
- Updates `updatedAt: serverTimestamp()`
- Appends audit: `{ uid, action: 'REMOVE_ATTRIBUTE', metadata: { attribute } }`

## AI Agent Tools

Located in `src/services/actions/tools.ts`:

### `getAgentTools()`

Transforms Action Registry into OpenAI/Anthropic compatible tool array:

```typescript
const tools = getAgentTools();
// Returns:
// [{
//   type: "function",
//   function: {
//     name: "thread.create",
//     description: "Create a new thread...",
//     parameters: { type: "object", properties: {...}, required: [...] }
//   }
// }, ...]
```

**Features:**
- Converts Zod schemas to JSON Schema 7
- Removes Zod-specific artifacts
- Sets `additionalProperties: false` for strict validation
- Can filter by risk level if needed

### `executeToolCall(toolName, toolArgs, context)`

Executes tool call from AI agent:

```typescript
const result = await executeToolCall('thread.create', { ... }, context);
// Returns: JSON.stringify({ status: "success", data: result })
// Or: JSON.stringify({ status: "error", message: "..." })
```

**Features:**
- Validates input via Zod schema
- Executes handler with validated input
- Returns JSON stringified result
- Error handling with status codes

## Usage Examples

### React Component: Create Message

```typescript
import { useAction } from '@/services/actions/hook';

function MessageComposer() {
  const { execute, loading, error } = useAction();

  const sendMessage = async () => {
    try {
      const result = await execute('thread.create', {
        collectionType: 'messages',
        content: 'Hello team!',
        participants: ['user1', 'user2', 'user3'],
        priority: 'MEDIUM',
      });

      console.log('Message created:', result.threadId);
    } catch (err) {
      console.error('Failed to create message:', err);
    }
  };

  return (
    <button onClick={sendMessage} disabled={loading}>
      {loading ? 'Sending...' : 'Send'}
    </button>
  );
}
```

### React Component: Create Anonymous HR Report

```typescript
function ReportForm() {
  const { execute, loading } = useAction();

  const submitReport = async (formData) => {
    const result = await execute('thread.create', {
      collectionType: 'hr_reports',
      title: 'Workplace Safety Concern',
      content: formData.description,
      isAnonymous: true,
      offenderName: formData.offenderName,
      priority: 'HIGH',
      attachments: formData.evidence,
    });

    alert('Report submitted anonymously: ' + result.threadId);
  };

  return <form onSubmit={handleSubmit(submitReport)}>...</form>;
}
```

### React Component: Announcement with Poll

```typescript
function CreateAnnouncement() {
  const { execute } = useAction();

  const publish = async () => {
    await execute('thread.create', {
      collectionType: 'announcements',
      title: 'Team Lunch Preferences',
      content: 'Help us plan next week\'s team lunch!',
      allowComments: true,
      pollData: {
        question: 'What type of food?',
        options: ['Italian', 'Japanese', 'Mexican', 'Vegetarian'],
        allowMultiple: false,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      },
    });
  };

  return <button onClick={publish}>Publish</button>;
}
```

### React Component: View Poll Results

```typescript
function PollResults({ announcementId }) {
  const { execute } = useAction();
  const [results, setResults] = useState(null);

  useEffect(() => {
    execute('announcement.get_poll_results', { announcementId })
      .then(setResults)
      .catch(console.error);
  }, [announcementId]);

  if (!results) return <Loading />;

  return (
    <div>
      <h3>{results.question}</h3>
      {results.results.map(result => (
        <div key={result.option}>
          <span>{result.option}</span>
          <progress value={result.percentage} max="100" />
          <span>{result.votes} votes ({result.percentage.toFixed(1)}%)</span>
        </div>
      ))}
      <p>Total: {results.totalVotes} votes</p>
      {results.isExpired && <p>Poll has expired</p>}
    </div>
  );
}
```

### Backend: Reveal Identity (HR Admin Tool)

```typescript
import { executeAction } from '@/services/actions/hook';

async function investigateSeriousReport(reportId, hrAdminContext) {
  const result = await executeAction('reporting.reveal_identity', {
    reportId,
    reason: 'Legal department requested identity for criminal investigation case #2024-0047',
  }, hrAdminContext);

  console.log('Revealed identity:', result.userId, result.email);
}
```

### Backend: Compile Thread for Export

```typescript
import { executeAction } from '@/services/actions/hook';

async function exportThreadAsText(threadId, collectionType, context) {
  const compiled = await executeAction('thread.compile_text', {
    collectionType,
    threadId,
    includeReplies: true,
  }, context);

  fs.writeFileSync(`export_${threadId}.txt`, compiled.compiledText);
  console.log(`Exported ${compiled.wordCount} words, ${compiled.charCount} characters`);
}
```

## Firestore Security Rules

```javascript
// Messages: Only participants
match /messages/{messageId} {
  allow read: if request.auth.uid in resource.data.participants;
  allow create: if request.auth.uid in request.resource.data.participants;
}

// Tickets: Creator + Assigned + Admins
match /tickets/{ticketId} {
  allow read: if request.auth.uid == resource.data.createdBy ||
                 request.auth.uid == resource.data.assignedTo ||
                 request.auth.token.role in ['admin', 'facility_admin'];
  allow create: if request.auth.uid == request.resource.data.createdBy;
  allow update: if request.auth.token.role in ['admin', 'facility_admin'];
}

// HR Reports: STRICT ACCESS CONTROL
match /hr_reports/{reportId} {
  allow read: if (
    (!resource.data.isAnonymous && request.auth.uid == resource.data.createdBy) ||
    (resource.data.isAnonymous && request.auth.uid == resource.data.createdByHash) ||
    (request.auth.token.role == 'admin' && 
     'reporting.read' in request.auth.token.permissions)
  );
  allow create: if request.auth != null;
  allow update: if request.auth.token.role == 'admin' && 
                   'reporting.read' in request.auth.token.permissions;
}

// Announcements: Public read, Admin write
match /announcements/{announcementId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth.token.role in ['admin', 'facility_admin'];
}

// Policies: Public read, Admin write
match /policies/{policyId} {
  allow read: if request.auth != null;
  allow create, update: if request.auth.token.role in ['admin', 'facility_admin'];
}

// Replies: Follow parent thread permissions
match /{collectionType}_replies/{replyId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
}

// Archives: Admin only
match /{collectionType}Archive/{docId} {
  allow read: if request.auth.token.role in ['admin', 'facility_admin'];
  allow write: if false;
}
```

## AI/MCP Integration

The registry exposes an AI-compatible tool catalog:

```typescript
import { getAiToolsCatalog } from '@/services/actions/registry';

const tools = getAiToolsCatalog();
// Returns array of:
// {
//   name: "thread.create",
//   description: "Create a new thread...",
//   inputSchema: { type: "object", properties: {...} },  // JSON Schema
//   metadata: { label, keywords, icon, riskLevel, isRAG }
// }
```

**Alternative: Agent Tools**

```typescript
import { getAgentTools, executeToolCall } from '@/services/actions/tools';

const tools = getAgentTools();
// Returns OpenAI/Anthropic compatible format

const result = await executeToolCall('thread.create', input, context);
// Returns JSON stringified result
```

This allows AI agents to:
- Discover available actions
- Validate inputs before execution
- Understand risk levels
- Route RAG queries appropriately
- Execute actions with proper error handling

## Testing Checklist

- [ ] Create message thread with multiple participants
- [ ] Create anonymous HR report
- [ ] Verify anonymous reporter cannot be identified by regular users
- [ ] HR Admin reveals identity with reason
- [ ] Verify high-severity audit log created
- [ ] Verify security event logged
- [ ] Add private note to HR report
- [ ] Verify reporter cannot see private notes
- [ ] Create announcement with poll
- [ ] Vote in poll
- [ ] Remove vote from poll
- [ ] Get poll results
- [ ] Create policy with `mustAcknowledge: true`
- [ ] User acknowledges policy
- [ ] Verify acknowledgement tracked
- [ ] Archive old thread
- [ ] Verify atomic move to archive collection
- [ ] Compile text from thread with 50+ replies
- [ ] Extract URL map with attachment metadata
- [ ] Test RAG query across facility threads
- [ ] Verify permission checks on all actions
- [ ] Test pagination with large result sets
- [ ] Test filtering and sorting combinations

## Performance Considerations

1. **Pagination:** List actions default to 20 items, max 100
2. **Batching:** Archive operations use Firestore transactions (atomic)
3. **Indexing:** Ensure Firestore composite indexes for:
   - `collectionType + participants + createdAt`
   - `collectionType + status + updatedAt`
   - `collectionType + facilityId + metadata.isPinned + createdAt`
   - `collectionType + metadata.priority + createdAt`
4. **Caching:** Frequently accessed threads should be cached client-side
5. **Hash Resolution:** `revealIdentity` iterates all users - consider optimization for large user bases
6. **RAG Queries:** Use Cloud Functions for semantic search to avoid client-side processing

## Migration from Existing Pages

Current files in `src/dashboard/pages/messages/`:
- `MessagesPage.js` → Use `thread.list` + `thread.fetch` with `collectionType: 'messages'`
- `InternalTicketPage.js` → Use `thread.list` + `thread.fetch` with `collectionType: 'tickets'`
- `AnnouncementsPage.js` → Use `thread.list` + `thread.fetch` with `collectionType: 'announcements'` + poll actions
- `ReportingPage.js` → Use `thread.list` + `thread.fetch` with `collectionType: 'hr_reports'` + safety actions

Refactor approach:
1. Replace direct Firestore queries with `useAction()` hook
2. Use action registry instead of inline CRUD operations
3. Benefit: Automatic audit logging, permission checks, type safety
4. Remove manual permission checks (handled by actions)
5. Remove manual audit logging (handled by actions)

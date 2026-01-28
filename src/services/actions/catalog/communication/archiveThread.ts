import { z } from "zod";
import { ActionDefinition } from "../../types";
import { moveToArchive } from '../common/utils';

const ArchiveThreadSchema = z.object({
  collectionType: z.enum(['messages', 'tickets', 'announcements', 'policies', 'hr_reports']),
  threadId: z.string(),
});

interface ArchiveResult {
  archiveId: string;
  archiveCollection: string;
}

export const archiveThreadAction: ActionDefinition<typeof ArchiveThreadSchema, ArchiveResult> = {
  id: "thread.archive",
  fileLocation: "src/services/actions/catalog/messages/archiveThread.ts",
  
  requiredPermission: "thread.delete",
  
  label: "Archive Thread",
  description: "Move thread to archive collection",
  keywords: ["archive", "move", "delete"],
  icon: "Archive",
  
  schema: ArchiveThreadSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { collectionType, threadId } = input;

    const archiveId = await moveToArchive(collectionType, threadId, ctx.userId);

    await ctx.auditLogger('thread.archive', 'SUCCESS', {
      threadId,
      archiveId,
      collectionType,
    });

    return {
      archiveId,
      archiveCollection: `${collectionType}Archive`,
    };
  }
};


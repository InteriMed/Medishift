import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { moveToArchive } from '../common/utils';

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;

const ArchiveThreadSchema = z.object({
  collectionType: z.enum(collectionTypeEnum),
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
    riskLevel: 'HIGH',
  },

  handler: async (input: z.infer<typeof ArchiveThreadSchema>, ctx: ActionContext): Promise<ArchiveResult> => {
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


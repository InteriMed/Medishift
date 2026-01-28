import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;

const CompileTextSchema = z.object({
  collectionType: z.enum(collectionTypeEnum),
  threadId: z.string(),
  includeReplies: z.boolean().default(true),
});

interface CompileTextResult {
  compiledText: string;
  wordCount: number;
  charCount: number;
}

export const compileTextAction: ActionDefinition<typeof CompileTextSchema, CompileTextResult> = {
  id: "thread.compile_text",
  fileLocation: "src/services/actions/catalog/messages/compileText.ts",
  
  requiredPermission: "thread.read",
  
  label: "Compile Thread Text",
  description: "Extract all text content from thread and replies",
  keywords: ["compile", "extract", "text", "export"],
  icon: "FileText",
  
  schema: CompileTextSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof CompileTextSchema>, ctx: ActionContext): Promise<CompileTextResult> => {
    const { collectionType, threadId, includeReplies } = input;

    const threadRef = doc(db, collectionType, threadId);
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      throw new Error('Thread not found');
    }

    const threadData = threadSnap.data();
    let compiledText = '';

    compiledText += `Thread: ${threadData.title || 'Untitled'}\n`;
    compiledText += `Created: ${new Date(threadData.createdAt?.toDate()).toLocaleString()}\n`;
    compiledText += `Author: ${threadData.createdBy}\n\n`;
    compiledText += `Content:\n${threadData.content}\n\n`;

    if (includeReplies) {
      const repliesCollection = `${collectionType}_replies`;
      const repliesQuery = query(
        collection(db, repliesCollection),
        where('threadId', '==', threadId),
        orderBy('createdAt', 'asc')
      );

      const repliesSnap = await getDocs(repliesQuery);
      const replies = repliesSnap.docs.map(doc => doc.data());

      if (replies.length > 0) {
        compiledText += `--- Replies (${replies.length}) ---\n\n`;
        
        replies.forEach((reply, index) => {
          if (reply.visibility !== 'internal_only' || ctx.userPermissions.includes('reporting.add_private_note')) {
            compiledText += `Reply ${index + 1}:\n`;
            compiledText += `By: ${reply.createdBy}\n`;
            compiledText += `Date: ${new Date(reply.createdAt?.toDate()).toLocaleString()}\n`;
            compiledText += `${reply.content}\n\n`;
          }
        });
      }
    }

    const wordCount = compiledText.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = compiledText.length;

    await ctx.auditLogger('thread.compile_text', 'SUCCESS', {
      threadId,
      collectionType,
      wordCount,
    });

    return {
      compiledText,
      wordCount,
      charCount,
    };
  }
};


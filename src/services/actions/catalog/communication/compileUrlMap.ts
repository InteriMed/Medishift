import { z } from "zod";
import { ActionDefinition, ActionContext } from "../../types";
import { db } from '../../../services/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const collectionTypeEnum = ['messages', 'tickets', 'announcements', 'policies', 'hr_reports'] as const;

const CompileUrlMapSchema = z.object({
  collectionType: z.enum(collectionTypeEnum),
  threadId: z.string(),
});

interface UrlMapResult {
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

export const compileUrlMapAction: ActionDefinition<typeof CompileUrlMapSchema, UrlMapResult> = {
  id: "thread.compile_url_map",
  fileLocation: "src/services/actions/catalog/messages/compileUrlMap.ts",
  
  requiredPermission: "thread.read",
  
  label: "Compile URL Map",
  description: "Extract all URLs from thread and replies with metadata",
  keywords: ["url", "link", "extract", "map"],
  icon: "Link",
  
  schema: CompileUrlMapSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input: z.infer<typeof CompileUrlMapSchema>, ctx: ActionContext): Promise<UrlMapResult> => {
    const { collectionType, threadId } = input;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls: UrlMapResult['urls'] = [];

    const threadRef = doc(db, collectionType, threadId);
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      throw new Error('Thread not found');
    }

    const threadData = threadSnap.data();
    
    const threadUrls = threadData.content?.match(urlRegex) || [];
    threadUrls.forEach((url: string) => {
      urls.push({
        url,
        source: 'thread',
        sourceId: threadId,
        createdBy: threadData.createdBy,
        createdAt: threadData.createdAt?.toMillis() || Date.now(),
        metadata: {
          domain: extractDomain(url),
        },
      });
    });

    threadData.attachments?.forEach((attachment: any) => {
      if (attachment.url) {
        urls.push({
          url: attachment.url,
          source: 'thread',
          sourceId: threadId,
          createdBy: threadData.createdBy,
          createdAt: threadData.createdAt?.toMillis() || Date.now(),
          metadata: {
            title: attachment.name,
            domain: extractDomain(attachment.url),
            isAttachment: true,
          },
        });
      }
    });

    const repliesCollection = `${collectionType}_replies`;
    const repliesQuery = query(
      collection(db, repliesCollection),
      where('threadId', '==', threadId)
    );

    const repliesSnap = await getDocs(repliesQuery);
    
    repliesSnap.docs.forEach(replyDoc => {
      const reply = replyDoc.data();
      
      if (reply.visibility !== 'internal_only' || ctx.userPermissions.includes('reporting.add_private_note')) {
        const replyUrls = reply.content?.match(urlRegex) || [];
        replyUrls.forEach((url: string) => {
          urls.push({
            url,
            source: 'reply',
            sourceId: replyDoc.id,
            createdBy: reply.createdBy,
            createdAt: reply.createdAt?.toMillis() || Date.now(),
            metadata: {
              domain: extractDomain(url),
            },
          });
        });

        reply.attachments?.forEach((attachment: any) => {
          if (attachment.url) {
            urls.push({
              url: attachment.url,
              source: 'reply',
              sourceId: replyDoc.id,
              createdBy: reply.createdBy,
              createdAt: reply.createdAt?.toMillis() || Date.now(),
              metadata: {
                title: attachment.name,
                domain: extractDomain(attachment.url),
                isAttachment: true,
              },
            });
          }
        });
      }
    });

    await ctx.auditLogger('thread.compile_url_map', 'SUCCESS', {
      threadId,
      collectionType,
      urlCount: urls.length,
    });

    return {
      urls,
      totalUrls: urls.length,
    };
  }
};

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}


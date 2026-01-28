import { z } from "zod";
import { ActionDefinition } from "../../types";
import { db } from '../../../services/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { appendAudit } from '../common/utils';

const AddPrivateNoteSchema = z.object({
  reportId: z.string(),
  content: z.string().min(1),
});

interface PrivateNoteResult {
  noteId: string;
}

export const addPrivateNoteAction: ActionDefinition<typeof AddPrivateNoteSchema, PrivateNoteResult> = {
  id: "reporting.add_private_note",
  fileLocation: "src/services/actions/catalog/messages/addPrivateNote.ts",
  
  requiredPermission: "reporting.add_private_note",
  
  label: "Add Private Note",
  description: "Add internal HR note that reporter cannot see",
  keywords: ["private", "note", "internal", "hr"],
  icon: "FileEdit",
  
  schema: AddPrivateNoteSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { reportId, content } = input;

    const noteId = `note_${Date.now()}_${ctx.userId.substring(0, 8)}`;
    
    const privateNote = {
      id: noteId,
      content,
      createdBy: ctx.userId,
      createdAt: Date.now(),
      visibility: 'internal_only',
    };

    const reportRef = doc(db, 'hr_reports', reportId);
    
    await updateDoc(reportRef, {
      privateNotes: arrayUnion(privateNote),
      updatedAt: serverTimestamp(),
    });

    await appendAudit('hr_reports', reportId, {
      uid: ctx.userId,
      action: 'PRIVATE_NOTE_ADDED',
      metadata: { noteId },
    });

    await ctx.auditLogger('reporting.add_private_note', 'SUCCESS', {
      reportId,
      noteId,
    });

    return {
      noteId,
    };
  }
};


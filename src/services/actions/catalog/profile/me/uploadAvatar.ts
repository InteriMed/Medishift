import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { storage, db } from '../../../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const UploadAvatarSchema = z.object({
  imageBase64: z.string(),
  fileName: z.string(),
});

interface UploadAvatarResult {
  avatarUrl: string;
}

export const uploadAvatarAction: ActionDefinition<typeof UploadAvatarSchema, UploadAvatarResult> = {
  id: "profile.upload_avatar",
  fileLocation: "src/services/actions/catalog/profile/me/uploadAvatar.ts",
  
  requiredPermission: "thread.create",
  
  label: "Upload Avatar",
  description: "Upload profile photo (public read allowed)",
  keywords: ["avatar", "photo", "profile picture"],
  icon: "Camera",
  
  schema: UploadAvatarSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { imageBase64, fileName } = input;

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const fileExtension = fileName.split('.').pop();
    const storagePath = `public/avatars/${ctx.userId}.${fileExtension}`;
    
    const storageRef = ref(storage, storagePath);
    
    await uploadBytes(storageRef, imageBuffer, {
      contentType: `image/${fileExtension}`,
      customMetadata: {
        uploadedBy: ctx.userId,
      },
    });

    const avatarUrl = await getDownloadURL(storageRef);

    const userRef = doc(db, 'users', ctx.userId);
    await updateDoc(userRef, {
      photoURL: avatarUrl,
      updatedAt: serverTimestamp(),
    });

    await ctx.auditLogger('profile.upload_avatar', 'SUCCESS', {
      avatarUrl,
    });

    return {
      avatarUrl,
    };
  }
};


import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db, storage } from '../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ShareableCV } from '../types';

const GenerateShareableCVSchema = z.object({
  includeRatings: z.boolean().default(true),
  includeFacilityNames: z.boolean().default(true),
  expiryDays: z.number().default(30),
});

interface GenerateShareableCVResult {
  cvUrl: string;
  publicUrl: string;
  expiresAt: string;
}

export const generateShareableCVAction: ActionDefinition<typeof GenerateShareableCVSchema, GenerateShareableCVResult> = {
  id: "profile.generate_shareable_cv",
  fileLocation: "src/services/actions/catalog/marketplace/professional/generateShareableCv.ts",
  
  requiredPermission: "profile.generate_cv",
  
  label: "Generate Shareable CV",
  description: "Create verified digital passport with stats and ratings",
  keywords: ["cv", "resume", "portable", "verified"],
  icon: "FileText",
  
  schema: GenerateShareableCVSchema,
  
  metadata: {
    autoToast: true,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { includeRatings, includeFacilityNames, expiryDays } = input;

    const missionsRef = collection(db, 'marketplace_missions');
    const q = query(missionsRef, where('filledBy', '==', ctx.userId), where('status', '==', 'COMPLETED'));
    const snapshot = await getDocs(q);

    const totalMissions = snapshot.size;
    let totalHours = 0;
    const facilities = new Set<string>();

    snapshot.forEach(doc => {
      const mission = doc.data();
      totalHours += mission.dates.length * 8;
      facilities.add(mission.facilityName);
    });

    const ratingsRef = collection(db, 'marketplace_ratings');
    const ratingsQuery = query(ratingsRef, where('toUserId', '==', ctx.userId));
    const ratingsSnapshot = await getDocs(ratingsQuery);

    let totalRating = 0;
    ratingsSnapshot.forEach(doc => {
      totalRating += doc.data().score;
    });

    const avgRating = ratingsSnapshot.size > 0 ? totalRating / ratingsSnapshot.size : 0;

    const cvData: ShareableCV = {
      id: `cv_${ctx.userId}_${Date.now()}`,
      userId: ctx.userId,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
      publicUrl: '',
      data: {
        name: 'Professional',
        role: 'Healthcare Professional',
        totalHours,
        totalMissions,
        rating: includeRatings ? avgRating : 0,
        skills: [],
        certifications: [],
        recentFacilities: includeFacilityNames ? Array.from(facilities).slice(0, 5) : [],
      },
    };

    const pdfBuffer = await generateCVPDF(cvData);

    const storagePath = `public/cvs/${cvData.id}.pdf`;
    const storageRef = ref(storage, storagePath);
    
    await uploadBytes(storageRef, pdfBuffer, {
      contentType: 'application/pdf',
    });

    const publicUrl = await getDownloadURL(storageRef);
    cvData.publicUrl = publicUrl;

    await ctx.auditLogger('profile.generate_shareable_cv', 'SUCCESS', {
      cvId: cvData.id,
      totalMissions,
      totalHours,
    });

    return {
      cvUrl: publicUrl,
      publicUrl,
      expiresAt: cvData.expiresAt.toISOString(),
    };
  }
};

async function generateCVPDF(cvData: ShareableCV): Promise<Buffer> {
  return Buffer.from('PDF_PLACEHOLDER');
}


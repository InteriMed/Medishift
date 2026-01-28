import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ComplianceScore } from '../types';

const AuditComplianceScoreSchema = z.object({
  region: z.string().optional(),
});

interface AuditComplianceScoreResult {
  scores: ComplianceScore[];
  averageScore: number;
}

export const auditComplianceScoreAction: ActionDefinition<typeof AuditComplianceScoreSchema, AuditComplianceScoreResult> = {
  id: "org.audit_compliance_score",
  fileLocation: "src/services/actions/catalog/organization/governance/auditComplianceScore.ts",
  
  requiredPermission: "org.audit_compliance",
  
  label: "Audit Compliance Score",
  description: "Crawl all facilities and flag violations (permits, contracts)",
  keywords: ["compliance", "audit", "score", "violations"],
  icon: "Shield",
  
  schema: AuditComplianceScoreSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { region } = input;

    const facilitiesRef = collection(db, 'facility_profiles');
    let facilitiesQuery = query(facilitiesRef);

    if (region) {
      facilitiesQuery = query(facilitiesRef, where('region', '==', region));
    }

    const facilitiesSnapshot = await getDocs(facilitiesQuery);

    const scores: ComplianceScore[] = [];

    for (const facilityDoc of facilitiesSnapshot.docs) {
      const facilityData = facilityDoc.data();
      const violations: any[] = [];
      let score = 100;

      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('facilityId', '==', facilityDoc.id));
      const usersSnapshot = await getDocs(usersQuery);

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        const certsRef = collection(db, 'user_certifications');
        const certsQuery = query(certsRef, where('userId', '==', userDoc.id));
        const certsSnapshot = await getDocs(certsQuery);

        certsSnapshot.forEach(certDoc => {
          const cert = certDoc.data();
          if (cert.expiryDate < new Date().toISOString()) {
            violations.push({
              type: 'EXPIRED_CERTIFICATION',
              severity: 'HIGH',
              description: `${userData.firstName} ${userData.lastName}: ${cert.type} expired`,
            });
            score -= 5;
          }
        });

        if (!userData.signedContract) {
          violations.push({
            type: 'MISSING_CONTRACT',
            severity: 'HIGH',
            description: `${userData.firstName} ${userData.lastName}: Contract not signed`,
          });
          score -= 10;
        }
      }

      scores.push({
        facilityId: facilityDoc.id,
        facilityName: facilityData.name,
        score: Math.max(0, score),
        violations,
        lastAuditDate: new Date(),
      });
    }

    const averageScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    await ctx.auditLogger('org.audit_compliance_score', 'SUCCESS', {
      region,
      facilitiesAudited: scores.length,
      averageScore,
    });

    return {
      scores,
      averageScore,
    };
  }
};


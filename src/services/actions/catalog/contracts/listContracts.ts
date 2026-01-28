import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const ListContractsSchema = z.object({
  facilityId: z.string().optional(),
  userId: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional(),
});

interface ListContractsResult {
  contracts: Array<{
    id: string;
    title?: string;
    status: string;
    userId: string;
    facilityId: string;
    createdAt: any;
    terms?: any;
  }>;
  totalCount: number;
}

export const listContractsAction: ActionDefinition<typeof ListContractsSchema, ListContractsResult> = {
  id: "contracts.list",
  fileLocation: "src/services/actions/catalog/contracts/listContracts.ts",
  
  requiredPermission: "thread.read",
  
  label: "List Contracts",
  description: "Get contracts with optional filters",
  keywords: ["contracts", "list", "employment"],
  icon: "FileText",
  
  schema: ListContractsSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { facilityId, userId, status } = input;

    let contractsQuery = query(collection(db, FIRESTORE_COLLECTIONS.CONTRACTS));

    if (facilityId) {
      contractsQuery = query(contractsQuery, where('facilityId', '==', facilityId));
    }

    if (userId) {
      contractsQuery = query(contractsQuery, where('userId', '==', userId));
    }

    if (status) {
      contractsQuery = query(contractsQuery, where('status', '==', status));
    }

    const snapshot = await getDocs(contractsQuery);
    
    const contracts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any));

    await ctx.auditLogger('contracts.list', 'SUCCESS', {
      facilityId: facilityId || 'ALL',
      userId: userId || 'ALL',
      resultCount: contracts.length,
    });

    return {
      contracts,
      totalCount: contracts.length,
    };
  }
};


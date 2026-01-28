import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FIRESTORE_COLLECTIONS } from '../../../../../config/keysDatabase';

const GetContractSchema = z.object({
  contractId: z.string(),
});

interface GetContractResult {
  contract: any;
  canAccessSensitiveData: boolean;
}

export const getContractAction: ActionDefinition<typeof GetContractSchema, GetContractResult> = {
  id: "contracts.get",
  fileLocation: "src/services/actions/catalog/contracts/getContract.ts",
  
  requiredPermission: "thread.read",
  
  label: "Get Contract",
  description: "Retrieve contract details with access control",
  keywords: ["contract", "details", "get"],
  icon: "FileText",
  
  schema: GetContractSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'MEDIUM',
  },

  handler: async (input, ctx) => {
    const { contractId } = input;

    const contractRef = doc(db, FIRESTORE_COLLECTIONS.CONTRACTS, contractId);
    const contractSnap = await getDoc(contractRef);

    if (!contractSnap.exists()) {
      throw new Error('Contract not found');
    }

    const contractData = contractSnap.data();
    
    const isSelf = contractData.userId === ctx.userId;
    const isHRAdmin = ctx.userPermissions.includes('admin.access');
    const isManager = ctx.userPermissions.includes('shift.create');

    if (!isSelf && !isHRAdmin && !isManager) {
      throw new Error('Access denied: You can only view your own contract or must be an HR admin/manager');
    }

    const canAccessSensitiveData = isSelf || isHRAdmin;

    const contract = {
      id: contractSnap.id,
      ...contractData
    };

    if (!canAccessSensitiveData) {
      delete contract.salary;
      delete contract.terms?.salary;
    }

    await ctx.auditLogger('contracts.get', 'SUCCESS', {
      contractId,
      accessLevel: canAccessSensitiveData ? 'FULL' : 'LIMITED',
    });

    return {
      contract,
      canAccessSensitiveData,
    };
  }
};


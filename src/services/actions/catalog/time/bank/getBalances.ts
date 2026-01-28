import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { TimeBalance } from '../types';

const GetBalancesSchema = z.object({});

interface GetBalancesResult {
  balances: TimeBalance;
}

export const getBalancesAction: ActionDefinition<typeof GetBalancesSchema, GetBalancesResult> = {
  id: "time.get_balances",
  fileLocation: "src/services/actions/catalog/time/bank/getBalances.ts",
  
  requiredPermission: "time.get_balances",
  
  label: "Get Time Balances",
  description: "Retrieve vacation, overtime, and comp time balances",
  keywords: ["time", "balance", "vacation", "overtime"],
  icon: "Calendar",
  
  schema: GetBalancesSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const balanceRef = doc(db, 'time_balances', ctx.userId);
    const balanceSnap = await getDoc(balanceRef);

    if (!balanceSnap.exists()) {
      return {
        balances: {
          userId: ctx.userId,
          vacation_balance: 0,
          overtime_balance: 0,
          public_holiday_balance: 0,
          comp_time_balance: 0,
          lastUpdated: new Date(),
        },
      };
    }

    await ctx.auditLogger('time.get_balances', 'SUCCESS', {
      userId: ctx.userId,
    });

    return {
      balances: balanceSnap.data() as TimeBalance,
    };
  }
};


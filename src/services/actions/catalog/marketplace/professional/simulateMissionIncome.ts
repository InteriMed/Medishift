import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { IncomeSimulation } from '../types';

const SimulateMissionIncomeSchema = z.object({
  hourlyRate: z.number().positive(),
  hours: z.number().positive(),
  canton: z.string().optional(),
  isMarried: z.boolean().default(false),
});

interface SimulateMissionIncomeResult {
  simulation: IncomeSimulation;
}

export const simulateMissionIncomeAction: ActionDefinition<typeof SimulateMissionIncomeSchema, SimulateMissionIncomeResult> = {
  id: "finance.simulate_mission_income",
  fileLocation: "src/services/actions/catalog/marketplace/professional/simulateMissionIncome.ts",
  
  requiredPermission: "finance.simulate_income",
  
  label: "Simulate Mission Income",
  description: "Calculate net take-home after tax/social security",
  keywords: ["finance", "income", "tax", "simulation"],
  icon: "Calculator",
  
  schema: SimulateMissionIncomeSchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { hourlyRate, hours, canton, isMarried } = input;

    const grossAmount = hourlyRate * hours;

    const avsRate = 0.0525;
    const acRate = 0.022;
    const lppRate = 0.065;

    const avsTax = grossAmount * avsRate;
    const acTax = grossAmount * acRate;
    const lppTax = grossAmount * lppRate;

    const sourceRate = getSourceTaxRate(canton || 'ZH', grossAmount, isMarried);
    const sourceTax = grossAmount * sourceRate;

    const totalDeductions = avsTax + acTax + lppTax + sourceTax;
    const netAmount = grossAmount - totalDeductions;

    const simulation: IncomeSimulation = {
      grossAmount,
      taxEstimate: sourceTax,
      socialSecurityEstimate: avsTax + acTax + lppTax,
      netAmount,
      breakdown: {
        hourlyRate,
        hours,
        avsTax,
        sourceTax,
        otherDeductions: acTax + lppTax,
      },
    };

    await ctx.auditLogger('finance.simulate_mission_income', 'SUCCESS', {
      grossAmount,
      netAmount,
      canton,
    });

    return {
      simulation,
    };
  }
};

function getSourceTaxRate(canton: string, grossAmount: number, isMarried: boolean): number {
  const rates: Record<string, number> = {
    'ZH': 0.08,
    'GE': 0.10,
    'VD': 0.09,
    'BE': 0.075,
  };
  
  return rates[canton] || 0.08;
}


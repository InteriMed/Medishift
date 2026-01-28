import { ActionContext, Permission } from '../types/context';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * CONTEXT INJECTION SERVICE
 * Dynamically builds the context block that gets injected into the AI prompt
 */

export interface UserContextBlock {
  currentUser: {
    id: string;
    name: string;
    role: string;
    permissions: Permission[];
    language?: string;
  };
  currentFacility: {
    id: string;
    name: string;
    rules: {
      minStaff: number;
      openingHours: string;
      breakRules?: any;
    };
  };
  environment: {
    date: string;
    isCrisisMode: boolean;
    systemStatus: 'NORMAL' | 'MAINTENANCE' | 'DEGRADED';
  };
}

/**
 * Build dynamic context for AI prompt injection
 */
export async function buildContextBlock(ctx: ActionContext): Promise<UserContextBlock> {
  // Get user details
  const userRef = doc(db, 'users', ctx.userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  // Get facility details
  const facilityRef = doc(db, 'facility_profiles', ctx.facilityId);
  const facilitySnap = await getDoc(facilityRef);
  const facilityData = facilitySnap.exists() ? facilitySnap.data() : {};

  // Get facility config
  const configRef = doc(db, 'facility_configs', ctx.facilityId);
  const configSnap = await getDoc(configRef);
  const configData = configSnap.exists() ? configSnap.data() : {};

  // Check system status
  const systemStatus = await getSystemStatus();

  return {
    currentUser: {
      id: ctx.userId,
      name: `${userData.firstName} ${userData.lastName}`,
      role: userData.role || 'STAFF',
      permissions: ctx.userPermissions,
      language: userData.language || 'en',
    },
    currentFacility: {
      id: ctx.facilityId,
      name: facilityData.name || 'Unknown Facility',
      rules: {
        minStaff: configData.minStaffRules?.total || 2,
        openingHours: formatOpeningHours(facilityData.openingHours),
        breakRules: configData.breakRules,
      },
    },
    environment: {
      date: new Date().toISOString(),
      isCrisisMode: systemStatus === 'CRISIS',
      systemStatus: systemStatus === 'CRISIS' ? 'DEGRADED' : 'NORMAL',
    },
  };
}

/**
 * Format opening hours for prompt
 */
function formatOpeningHours(hours: any): string {
  if (!hours) return '08:00-18:00';
  
  const monday = hours[1];
  if (monday) {
    return `${monday.open}-${monday.close}`;
  }
  
  return '08:00-18:00';
}

/**
 * Get current system status
 */
async function getSystemStatus(): Promise<'NORMAL' | 'MAINTENANCE' | 'CRISIS'> {
  const alertsRef = doc(db, 'system_alerts', 'current');
  const alertSnap = await getDoc(alertsRef);
  
  if (alertSnap.exists()) {
    const alertData = alertSnap.data();
    if (alertData.type === 'DOWNTIME') return 'MAINTENANCE';
    if (alertData.severity === 'CRITICAL') return 'CRISIS';
  }
  
  return 'NORMAL';
}

/**
 * Build complete system prompt with context injection
 */
export async function buildSystemPrompt(
  basePrompt: string,
  ctx: ActionContext
): Promise<string> {
  const contextBlock = await buildContextBlock(ctx);

  return `${basePrompt}

### CURRENT CONTEXT
\`\`\`json
${JSON.stringify(contextBlock, null, 2)}
\`\`\`

### AVAILABLE TOOLS
You have access to the following actions. Use them when the user's request matches their purpose.
Note: Some actions require explicit user confirmation before execution (marked with 🔒).

**READ_ONLY Actions:**
- \`support.ask_agent\`: Search documentation and knowledge base
- \`calendar.get_coverage_status\`: Check staffing levels
- \`time.get_balances\`: View vacation/overtime balances
- \`team.list_employees\`: Browse employee directory

**WRITE_LOW Actions (Reversible):**
- \`calendar.create_shift\`: Draft a new shift (not published)
- \`thread.create\`: Send a message
- \`profile.update_me\`: Update personal details

**WRITE_HIGH Actions (Requires UI Confirmation 🔒):**
- \`payroll.export_data\`: Export payroll to fiduciary
- \`calendar.publish_roster\`: Make schedule visible to staff
- \`contracts.send_for_signature\`: Send contract to employee

**CRITICAL Actions (Requires 2FA/Password 🔒🔒):**
- \`team.terminate_user\`: Fire an employee
- \`admin.manage_billing\`: Suspend facility access
- \`risk.block_user\`: Ban a user from the platform

### MEMORY (Last 10 Messages)
{conversationHistory}
`;
}


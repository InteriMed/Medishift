import { z } from "zod";
import { ActionDefinition } from "../../types";

const SwitchWorkspaceSchema = z.object({
  targetWorkspaceId: z.string(),
  workspaceType: z.enum(['personal', 'facility', 'organization', 'admin'])
});

interface SwitchResult {
  token: string;
  workspace: {
    id: string;
    name: string;
    type: string;
    role?: string;
    permissions?: string[];
  };
}

export const switchWorkspaceAction: ActionDefinition = {
  id: "workspace.switch",
  riskLevel: "LOW",
  label: "Switch Workspace",
  description: "Verifies membership and issues a session token for the target workspace.",
  schema: SwitchWorkspaceSchema,
  permissions: [],

  handler: async (input, ctx) => {
    const { targetWorkspaceId, workspaceType } = input;
    const userId = ctx.userId;

    if (workspaceType === 'personal') {
      const professionalProfileRef = ctx.db.collection('professionalProfiles').doc(userId);
      const profileSnap = await professionalProfileRef.get();

      if (!profileSnap.exists) {
        throw new Error("Professional profile not found. Please complete onboarding.");
      }

      const customClaims = {
        workspaceId: 'personal',
        workspaceType: 'personal',
        permissions: ['profile.read', 'profile.update', 'marketplace.browse']
      };

      const customToken = await ctx.auth.createCustomToken(userId, customClaims);

      await ctx.auditLogger('workspace.switch', 'SUCCESS', {
        workspaceId: 'personal',
        workspaceType: 'personal'
      });

      return {
        token: customToken,
        workspace: {
          id: 'personal',
          name: 'Personal Workspace',
          type: 'personal',
          permissions: customClaims.permissions
        }
      };
    }

    if (workspaceType === 'facility') {
      const facilityRef = ctx.db.collection('facilityProfiles').doc(targetWorkspaceId);
      const facilitySnap = await facilityRef.get();

      if (!facilitySnap.exists) {
        throw new Error("Facility workspace not found.");
      }

      const facilityData = facilitySnap.data() as any;
      
      const employees = facilityData.employees || [];
      const employeeRecord = employees.find((emp: any) => emp.user_uid === userId);
      
      if (!employeeRecord) {
        await ctx.auditLogger('workspace.switch', 'FAILURE', {
          attemptedFacility: targetWorkspaceId,
          reason: "NO_ACCESS"
        });
        throw new Error("Access Denied: You are not a member of this facility.");
      }

      const userRoles = employeeRecord.roles || [];
      const permissions = getPermissionsForFacilityRoles(userRoles);

      const customClaims = {
        workspaceId: targetWorkspaceId,
        workspaceType: 'facility',
        facilityId: targetWorkspaceId,
        roles: userRoles,
        permissions
      };

      const customToken = await ctx.auth.createCustomToken(userId, customClaims);

      await ctx.auditLogger('workspace.switch', 'SUCCESS', {
        workspaceId: targetWorkspaceId,
        workspaceType: 'facility',
        roles: userRoles
      });

      return {
        token: customToken,
        workspace: {
          id: targetWorkspaceId,
          name: facilityData.facilityDetails?.name || facilityData.facilityName || "Facility",
          type: 'facility',
          role: userRoles[0],
          permissions
        }
      };
    }

    if (workspaceType === 'organization') {
      const orgRef = ctx.db.collection('organizations').doc(targetWorkspaceId);
      const orgSnap = await orgRef.get();

      if (!orgSnap.exists) {
        throw new Error("Organization workspace not found.");
      }

      const orgData = orgSnap.data() as any;
      
      const internalTeamAdmins = orgData.internalTeam?.admins || [];
      
      if (!internalTeamAdmins.includes(userId)) {
        const userRef = ctx.db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.data() as any;
        const userRoles = userData.roles || [];
        
        const orgRole = userRoles.find((r: any) => r.organization_uid === targetWorkspaceId);
        
        if (!orgRole || !(orgRole.roles || []).includes('org_admin')) {
          await ctx.auditLogger('workspace.switch', 'FAILURE', {
            attemptedOrganization: targetWorkspaceId,
            reason: "NOT_ORG_ADMIN"
          });
          throw new Error("Access Denied: Only organization administrators can access this workspace.");
        }
      }

      const permissions = ['org.manage_facilities', 'org.view_analytics', 'org.manage_teams'];

      const customClaims = {
        workspaceId: targetWorkspaceId,
        workspaceType: 'organization',
        organizationId: targetWorkspaceId,
        role: 'org_admin',
        permissions
      };

      const customToken = await ctx.auth.createCustomToken(userId, customClaims);

      await ctx.auditLogger('workspace.switch', 'SUCCESS', {
        workspaceId: targetWorkspaceId,
        workspaceType: 'organization'
      });

      return {
        token: customToken,
        workspace: {
          id: targetWorkspaceId,
          name: orgData.name || "Organization",
          type: 'organization',
          role: 'org_admin',
          permissions
        }
      };
    }

    if (workspaceType === 'admin') {
      const adminRef = ctx.db.collection('admins').doc(userId);
      const adminSnap = await adminRef.get();

      if (!adminSnap.exists) {
        throw new Error("Admin access not found.");
      }

      const adminData = adminSnap.data() as any;
      
      if (adminData.isActive === false) {
        throw new Error("Admin account is not active.");
      }

      const permissions = ['admin.all', 'admin.manage_users', 'admin.manage_facilities', 'admin.view_analytics'];

      const customClaims = {
        workspaceId: 'admin',
        workspaceType: 'admin',
        role: adminData.role || 'admin',
        permissions
      };

      const customToken = await ctx.auth.createCustomToken(userId, customClaims);

      await ctx.auditLogger('workspace.switch', 'SUCCESS', {
        workspaceId: 'admin',
        workspaceType: 'admin'
      });

      return {
        token: customToken,
        workspace: {
          id: 'admin',
          name: 'Admin Workspace',
          type: 'admin',
          role: adminData.role,
          permissions
        }
      };
    }

    throw new Error("Invalid workspace type");
  }
};

function getPermissionsForFacilityRoles(roles: string[]): string[] {
  const permissionMap: Record<string, string[]> = {
    'admin': [
      'facility.manage_all',
      'facility.manage_employees',
      'facility.manage_schedules',
      'facility.post_positions',
      'facility.manage_contracts',
      'facility.view_analytics',
      'facility.manage_settings',
      'facility.invite_users'
    ],
    'scheduler': [
      'facility.manage_schedules',
      'facility.view_employees',
      'facility.view_contracts',
      'facility.request_staffing'
    ],
    'recruiter': [
      'facility.post_positions',
      'facility.view_applications',
      'facility.manage_contracts',
      'facility.view_professionals'
    ],
    'employee': [
      'facility.view_schedule',
      'facility.request_timeoff',
      'facility.view_contracts'
    ]
  };

  const allPermissions = new Set<string>();
  
  roles.forEach(role => {
    const perms = permissionMap[role] || permissionMap['employee'];
    perms.forEach(p => allPermissions.add(p));
  });

  return Array.from(allPermissions);
}


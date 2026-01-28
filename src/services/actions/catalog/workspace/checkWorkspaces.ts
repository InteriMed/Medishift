import { z } from "zod";
import { ActionDefinition } from "../../types";

const CheckWorkspacesSchema = z.object({});

interface WorkspaceInfo {
  id: string;
  name: string;
  type: 'personal' | 'facility' | 'organization' | 'admin';
  role?: string;
  hasAccess: boolean;
}

export const checkWorkspacesAction: ActionDefinition = {
  id: "workspace.check_available",
  riskLevel: "LOW",
  label: "Check Available Workspaces",
  description: "Returns all workspaces the user has access to.",
  schema: CheckWorkspacesSchema,
  permissions: [],

  handler: async (input, ctx) => {
    const userId = ctx.userId;
    const workspaces: WorkspaceInfo[] = [];

    const [userSnap, professionalSnap, adminSnap] = await Promise.all([
      ctx.db.collection('users').doc(userId).get(),
      ctx.db.collection('professionalProfiles').doc(userId).get(),
      ctx.db.collection('admins').doc(userId).get()
    ]);

    const userData = userSnap.exists ? userSnap.data() as any : null;

    if (professionalSnap.exists) {
      workspaces.push({
        id: 'personal',
        name: 'Personal Workspace',
        type: 'personal',
        hasAccess: true
      });
    }

    if (userData) {
      const roles = userData.roles || [];
      
      for (const roleEntry of roles) {
        if (roleEntry.facility_uid) {
          const facilitySnap = await ctx.db.collection('facilityProfiles').doc(roleEntry.facility_uid).get();
          
          if (facilitySnap.exists) {
            const facilityData = facilitySnap.data() as any;
            workspaces.push({
              id: roleEntry.facility_uid,
              name: facilityData.facilityDetails?.name || facilityData.facilityName || 'Facility',
              type: 'facility',
              role: (roleEntry.roles || [])[0],
              hasAccess: true
            });
          }
        }

        if (roleEntry.organization_uid) {
          const isOrgAdmin = (roleEntry.roles || []).includes('org_admin');
          
          if (isOrgAdmin) {
            const orgSnap = await ctx.db.collection('organizations').doc(roleEntry.organization_uid).get();
            
            if (orgSnap.exists) {
              const orgData = orgSnap.data() as any;
              workspaces.push({
                id: roleEntry.organization_uid,
                name: orgData.name || 'Organization',
                type: 'organization',
                role: 'org_admin',
                hasAccess: true
              });
            }
          }
        }
      }
    }

    if (adminSnap.exists) {
      const adminData = adminSnap.data() as any;
      
      if (adminData.isActive !== false) {
        workspaces.push({
          id: 'admin',
          name: 'Admin Workspace',
          type: 'admin',
          role: adminData.role || 'admin',
          hasAccess: true
        });
      }
    }

    const needsOnboarding = workspaces.length === 0;

    await ctx.auditLogger('workspace.check_available', 'SUCCESS', {
      workspaceCount: workspaces.length,
      needsOnboarding
    });

    return {
      workspaces,
      needsOnboarding,
      hasAnyWorkspace: workspaces.length > 0
    };
  }
};


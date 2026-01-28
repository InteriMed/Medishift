import { z } from "zod";
import { ActionDefinition } from "../../../types";
import { db } from '../../../../services/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { OrganizationHierarchy } from '../types';

const GetHierarchySchema = z.object({
  rootId: z.string().optional(),
});

interface GetHierarchyResult {
  hierarchy: OrganizationHierarchy;
}

export const getOrgHierarchyAction: ActionDefinition<typeof GetHierarchySchema, GetHierarchyResult> = {
  id: "org.get_hierarchy",
  fileLocation: "src/services/actions/catalog/profile/org/getHierarchy.ts",
  
  requiredPermission: "thread.read",
  
  label: "Get Organization Hierarchy",
  description: "Retrieve parent/child tree (for Floating Pool logic)",
  keywords: ["organization", "hierarchy", "tree", "floating"],
  icon: "Sitemap",
  
  schema: GetHierarchySchema,
  
  metadata: {
    autoToast: false,
    riskLevel: 'LOW',
  },

  handler: async (input, ctx) => {
    const { rootId } = input;

    const hierarchyRef = collection(db, 'organization_hierarchy');
    const q = rootId
      ? query(hierarchyRef, where('id', '==', rootId))
      : query(hierarchyRef, where('type', '==', 'ROOT'));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Root node not found');
    }

    const rootDoc = snapshot.docs[0];
    const rootData = rootDoc.data();

    const hierarchy = await buildTree(rootData.id);

    await ctx.auditLogger('org.get_hierarchy', 'SUCCESS', {
      rootId: rootData.id,
    });

    return {
      hierarchy,
    };
  }
};

async function buildTree(nodeId: string): Promise<OrganizationHierarchy> {
  const nodeRef = collection(db, 'organization_hierarchy');
  const q = query(nodeRef, where('id', '==', nodeId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const nodeData = snapshot.docs[0].data();

  const childrenQuery = query(
    nodeRef,
    where('parentId', '==', nodeId),
    orderBy('name', 'asc')
  );
  const childrenSnapshot = await getDocs(childrenQuery);

  const children: OrganizationHierarchy[] = [];
  for (const childDoc of childrenSnapshot.docs) {
    const childData = childDoc.data();
    const childTree = await buildTree(childData.id);
    children.push(childTree);
  }

  return {
    id: nodeData.id,
    name: nodeData.name,
    type: nodeData.type,
    parentId: nodeData.parentId,
    floatingPoolScope: nodeData.floatingPoolScope || [],
    children,
  };
}


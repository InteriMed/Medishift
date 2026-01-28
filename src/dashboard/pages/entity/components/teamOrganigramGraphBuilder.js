class NodeType {
  static ROLE = 'role';
  static ADMIN_LEVEL = 'admin_level';
  static EMPLOYEE = 'employee';
}

class EdgeType {
  static DEPENDS_ON = 'depends_on';
  static HAS_RIGHT = 'has_right';
  static ASSIGNED_TO = 'assigned_to';
  static INHERITS = 'inherits';
}

class GraphNode {
  constructor(id, type, name, metadata = {}) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.metadata = metadata;
  }
}

class TeamOrganigramGraphBuilder {
  constructor() {
    this.graph = new Map();
    this.nodes = new Map();
    this.edges = [];
  }

  buildGraph(roles = [], employees = [], adminRightsHierarchy = []) {
    this.graph.clear();
    this.nodes.clear();
    this.edges = [];

    const roleNodes = this._buildRoleNodes(roles);
    const adminNodes = this._buildAdminNodes(adminRightsHierarchy, employees);
    const employeeNodes = this._buildEmployeeNodes(employees);

    this._buildRoleDependencies(roleNodes);
    this._buildAdminRightsFlow(adminNodes);
    this._connectEmployeesToRoles(employeeNodes, roleNodes);
    this._connectAdminsToRights(employeeNodes, adminNodes);

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
      roleNodes: roleNodes,
      adminNodes: adminNodes,
      employeeNodes: employeeNodes
    };
  }

  _buildRoleNodes(roles) {
    const roleNodes = [];
    
    roles.forEach(role => {
      const nodeId = `role:${role.workerType}`;
      const node = new GraphNode(
        nodeId,
        NodeType.ROLE,
        role.title || role.workerType,
        {
          workerType: role.workerType,
          level: role.level || 999,
          color: role.color,
          color1: role.color1,
          quantity: role.quantity,
          assignedEmployees: role.assignedEmployees || []
        }
      );
      
      this.nodes.set(nodeId, node);
      roleNodes.push(node);
    });

    return roleNodes.sort((a, b) => a.metadata.level - b.metadata.level);
  }

  _buildAdminNodes(adminRightsHierarchy, employees) {
    const adminNodes = [];
    const adminEmployees = employees.filter(emp => emp.isAdmin);

    adminRightsHierarchy.forEach((adminLevel) => {
      const nodeId = `admin:${adminLevel.name}`;
      const matchingAdmins = adminEmployees.filter(emp => {
        const empRights = emp.rights || [];
        const levelRights = adminLevel.rights || [];
        
        if (adminLevel.level === 0) {
          return empRights.length === 0 || empRights.length >= levelRights.length;
        }
        
        const hasMatchingRights = levelRights.some(right => empRights.includes(right));
        const hasFewerRights = empRights.length > 0 && empRights.length < levelRights.length;
        
        return hasMatchingRights && hasFewerRights;
      });

      const node = new GraphNode(
        nodeId,
        NodeType.ADMIN_LEVEL,
        adminLevel.label || adminLevel.name,
        {
          level: adminLevel.level,
          rights: adminLevel.rights || [],
          color: adminLevel.color,
          employees: matchingAdmins,
          rightsCount: (adminLevel.rights || []).length
        }
      );

      this.nodes.set(nodeId, node);
      adminNodes.push(node);
    });

    return adminNodes.sort((a, b) => a.metadata.level - b.metadata.level);
  }

  _buildEmployeeNodes(employees) {
    const employeeNodes = [];

    employees.forEach(emp => {
      const nodeId = `employee:${emp.uid || emp.id}`;
      const node = new GraphNode(
        nodeId,
        NodeType.EMPLOYEE,
        `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
        {
          uid: emp.uid || emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          photoURL: emp.photoURL,
          isAdmin: emp.isAdmin,
          rights: emp.rights || [],
          roles: emp.roles || []
        }
      );

      this.nodes.set(nodeId, node);
      employeeNodes.push(node);
    });

    return employeeNodes;
  }

  _buildRoleDependencies(roleNodes) {
    for (let i = 0; i < roleNodes.length - 1; i++) {
      const currentRole = roleNodes[i];
      const nextRole = roleNodes[i + 1];
      
      if (currentRole.metadata.level < nextRole.metadata.level) {
        this.edges.push({
          source: currentRole.id,
          target: nextRole.id,
          type: EdgeType.DEPENDS_ON,
          metadata: {
            dependency: 'hierarchical'
          }
        });
      }
    }
  }

  _buildAdminRightsFlow(adminNodes) {
    for (let i = 0; i < adminNodes.length - 1; i++) {
      const currentLevel = adminNodes[i];
      const nextLevel = adminNodes[i + 1];
      
      this.edges.push({
        source: currentLevel.id,
        target: nextLevel.id,
        type: EdgeType.INHERITS,
        metadata: {
          flow: 'vertical',
          rightsInherited: nextLevel.metadata.rights.filter(
            right => currentLevel.metadata.rights.includes(right)
          )
        }
      });
    }
  }

  _connectEmployeesToRoles(employeeNodes, roleNodes) {
    employeeNodes.forEach(empNode => {
      const empData = empNode.metadata;
      
      roleNodes.forEach(roleNode => {
        const roleData = roleNode.metadata;
        const isAssigned = roleData.assignedEmployees.some(
          assignedEmp => (assignedEmp.uid || assignedEmp.id) === empData.uid
        );

        if (isAssigned && !empData.isAdmin) {
          this.edges.push({
            source: empNode.id,
            target: roleNode.id,
            type: EdgeType.ASSIGNED_TO,
            metadata: {
              assignment: 'role'
            }
          });
        }
      });
    });
  }

  _connectAdminsToRights(employeeNodes, adminNodes) {
    employeeNodes.forEach(empNode => {
      if (!empNode.metadata.isAdmin) return;

      const empRights = empNode.metadata.rights || [];
      
      adminNodes.forEach(adminNode => {
        const adminRights = adminNode.metadata.rights || [];
        const hasMatchingRights = empRights.length > 0 
          ? adminRights.some(right => empRights.includes(right))
          : adminNode.metadata.level === 0;

        if (hasMatchingRights) {
          this.edges.push({
            source: empNode.id,
            target: adminNode.id,
            type: EdgeType.HAS_RIGHT,
            metadata: {
              rights: empRights,
              level: adminNode.metadata.level
            }
          });
        }
      });
    });
  }

  findPaths(sourceId, targetId, maxDepth = 10) {
    const paths = [];
    const visited = new Set();

    const dfs = (current, target, path, depth) => {
      if (depth > maxDepth) return;
      if (current === target) {
        paths.push([...path, current]);
        return;
      }

      visited.add(current);
      const outgoingEdges = this.edges.filter(edge => edge.source === current);

      for (const edge of outgoingEdges) {
        if (!visited.has(edge.target)) {
          dfs(edge.target, target, [...path, current], depth + 1);
        }
      }

      visited.delete(current);
    };

    dfs(sourceId, targetId, [], 0);
    return paths;
  }

  getShortestPath(sourceId, targetId) {
    const paths = this.findPaths(sourceId, targetId);
    if (paths.length === 0) return null;

    return paths.reduce((shortest, current) => 
      current.length < shortest.length ? current : shortest
    );
  }

  getNodesByType(type) {
    return Array.from(this.nodes.values()).filter(node => node.type === type);
  }

  getIncomingEdges(nodeId) {
    return this.edges.filter(edge => edge.target === nodeId);
  }

  getOutgoingEdges(nodeId) {
    return this.edges.filter(edge => edge.source === nodeId);
  }
}

export default TeamOrganigramGraphBuilder;
export { NodeType, EdgeType, GraphNode };


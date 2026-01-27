"""
Team Organigram Analyzer - Role and Admin Rights Dependency Graph Builder

This analyzer builds a dependency graph for roles and admin rights:
1. Identifying roles (horizontal dependencies)
2. Identifying admin rights hierarchy (vertical flow)
3. Finding paths from roles to admin rights
4. Generating graph structure for visualization

Adapted from taint analysis pattern for organizational structure analysis.
"""

import json
import sys
from typing import Dict, List, Set, Optional
from dataclasses import dataclass


@dataclass
class GraphNode:
    id: str
    type: str
    name: str
    metadata: Dict


@dataclass
class GraphEdge:
    source: str
    target: str
    type: str
    metadata: Dict


@dataclass
class GraphData:
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    roleNodes: List[Dict]
    adminNodes: List[Dict]
    employeeNodes: List[Dict]


class TeamOrganigramGraphBuilder:
    """
    Builds a directed graph representing role dependencies and admin rights hierarchy.
    
    The graph enables:
    - Role dependency visualization (horizontal)
    - Admin rights hierarchy visualization (vertical)
    - Pathfinding between roles and admin rights
    """
    
    def __init__(self):
        self.nodes = {}
        self.edges = []
    
    def build_graph(self, roles: List[Dict], employees: List[Dict], admin_rights_hierarchy: List[Dict]) -> GraphData:
        """
        Build the complete dependency graph.
        
        Args:
            roles: List of role objects with workerType, title, level, etc.
            employees: List of employee objects with uid, isAdmin, rights, etc.
            admin_rights_hierarchy: List of admin level definitions
            
        Returns:
            GraphData with nodes, edges, and categorized node lists
        """
        self.nodes.clear()
        self.edges.clear()
        
        role_nodes = self._build_role_nodes(roles)
        admin_nodes = self._build_admin_nodes(admin_rights_hierarchy, employees)
        employee_nodes = self._build_employee_nodes(employees)
        
        self._build_role_dependencies(role_nodes)
        self._build_admin_rights_flow(admin_nodes)
        self._connect_employees_to_roles(employee_nodes, role_nodes)
        self._connect_admins_to_rights(employee_nodes, admin_nodes)
        
        return GraphData(
            nodes=[self._node_to_dict(node) for node in self.nodes.values()],
            edges=self.edges,
            roleNodes=[self._node_to_dict(node) for node in role_nodes],
            adminNodes=[self._node_to_dict(node) for node in admin_nodes],
            employeeNodes=[self._node_to_dict(node) for node in employee_nodes]
        )
    
    def _node_to_dict(self, node):
        """Convert GraphNode to dictionary."""
        return {
            "id": node.id,
            "type": node.type,
            "name": node.name,
            "metadata": node.metadata
        }
    
    def _build_role_nodes(self, roles: List[Dict]) -> List[GraphNode]:
        """Create nodes for each role."""
        role_nodes = []
        
        for role in roles:
            node_id = f"role:{role.get('workerType', 'unknown')}"
            node = GraphNode(
                id=node_id,
                type="role",
                name=role.get('title') or role.get('workerType', 'Unknown'),
                metadata={
                    "workerType": role.get('workerType'),
                    "level": role.get('level', 999),
                    "color": role.get('color'),
                    "color1": role.get('color1'),
                    "quantity": role.get('quantity', 0),
                    "assignedEmployees": role.get('assignedEmployees', [])
                }
            )
            self.nodes[node_id] = node
            role_nodes.append(node)
        
        return sorted(role_nodes, key=lambda n: n.metadata.get('level', 999))
    
    def _build_admin_nodes(self, admin_rights_hierarchy: List[Dict], employees: List[Dict]) -> List[GraphNode]:
        """Create nodes for admin rights hierarchy."""
        admin_nodes = []
        admin_employees = [emp for emp in employees if emp.get('isAdmin', False)]
        
        for admin_level in admin_rights_hierarchy:
            node_id = f"admin:{admin_level.get('name', 'unknown')}"
            level_rights = admin_level.get('rights', [])
            level_num = admin_level.get('level', 0)
            
            matching_admins = []
            for emp in admin_employees:
                emp_rights = emp.get('rights', [])
                if level_num == 0:
                    if len(emp_rights) == 0 or len(emp_rights) >= len(level_rights):
                        matching_admins.append(emp)
                else:
                    has_matching = any(right in emp_rights for right in level_rights)
                    has_fewer = len(emp_rights) > 0 and len(emp_rights) < len(level_rights)
                    if has_matching and has_fewer:
                        matching_admins.append(emp)
            
            node = GraphNode(
                id=node_id,
                type="admin_level",
                name=admin_level.get('label') or admin_level.get('name', 'Unknown'),
                metadata={
                    "level": level_num,
                    "rights": level_rights,
                    "color": admin_level.get('color'),
                    "employees": matching_admins,
                    "rightsCount": len(level_rights)
                }
            )
            self.nodes[node_id] = node
            admin_nodes.append(node)
        
        return sorted(admin_nodes, key=lambda n: n.metadata.get('level', 0))
    
    def _build_employee_nodes(self, employees: List[Dict]) -> List[GraphNode]:
        """Create nodes for employees."""
        employee_nodes = []
        
        for emp in employees:
            emp_id = emp.get('uid') or emp.get('id')
            if not emp_id:
                continue
                
            node_id = f"employee:{emp_id}"
            full_name = f"{emp.get('firstName', '')} {emp.get('lastName', '')}".strip() or 'Unknown'
            
            node = GraphNode(
                id=node_id,
                type="employee",
                name=full_name,
                metadata={
                    "uid": emp_id,
                    "firstName": emp.get('firstName'),
                    "lastName": emp.get('lastName'),
                    "email": emp.get('email'),
                    "photoURL": emp.get('photoURL'),
                    "isAdmin": emp.get('isAdmin', False),
                    "rights": emp.get('rights', []),
                    "roles": emp.get('roles', [])
                }
            )
            self.nodes[node_id] = node
            employee_nodes.append(node)
        
        return employee_nodes
    
    def _build_role_dependencies(self, role_nodes: List[GraphNode]) -> None:
        """Create horizontal dependency edges between roles."""
        for i in range(len(role_nodes) - 1):
            current = role_nodes[i]
            next_role = role_nodes[i + 1]
            
            if current.metadata.get('level', 999) < next_role.metadata.get('level', 999):
                self.edges.append({
                    "source": current.id,
                    "target": next_role.id,
                    "type": "depends_on",
                    "metadata": {"dependency": "hierarchical"}
                })
    
    def _build_admin_rights_flow(self, admin_nodes: List[GraphNode]) -> None:
        """Create vertical inheritance edges for admin rights."""
        for i in range(len(admin_nodes) - 1):
            current = admin_nodes[i]
            next_level = admin_nodes[i + 1]
            
            current_rights = set(current.metadata.get('rights', []))
            next_rights = set(next_level.metadata.get('rights', []))
            inherited = list(current_rights.intersection(next_rights))
            
            self.edges.append({
                "source": current.id,
                "target": next_level.id,
                "type": "inherits",
                "metadata": {
                    "flow": "vertical",
                    "rightsInherited": inherited
                }
            })
    
    def _connect_employees_to_roles(self, employee_nodes: List[GraphNode], role_nodes: List[GraphNode]) -> None:
        """Connect employees to their assigned roles."""
        for emp_node in employee_nodes:
            if emp_node.metadata.get('isAdmin'):
                continue
                
            emp_uid = emp_node.metadata.get('uid')
            for role_node in role_nodes:
                assigned = role_node.metadata.get('assignedEmployees', [])
                is_assigned = any(
                    (assigned_emp.get('uid') or assigned_emp.get('id')) == emp_uid
                    for assigned_emp in assigned
                )
                
                if is_assigned:
                    self.edges.append({
                        "source": emp_node.id,
                        "target": role_node.id,
                        "type": "assigned_to",
                        "metadata": {"assignment": "role"}
                    })
    
    def _connect_admins_to_rights(self, employee_nodes: List[GraphNode], admin_nodes: List[GraphNode]) -> None:
        """Connect admin employees to their rights levels."""
        for emp_node in employee_nodes:
            if not emp_node.metadata.get('isAdmin'):
                continue
            
            emp_rights = set(emp_node.metadata.get('rights', []))
            
            for admin_node in admin_nodes:
                admin_rights = set(admin_node.metadata.get('rights', []))
                level = admin_node.metadata.get('level', 0)
                
                has_matching = level == 0 or bool(emp_rights.intersection(admin_rights))
                
                if has_matching:
                    self.edges.append({
                        "source": emp_node.id,
                        "target": admin_node.id,
                        "type": "has_right",
                        "metadata": {
                            "rights": list(emp_rights),
                            "level": level
                        }
                    })


def analyze_team_organigram(roles: List[Dict], employees: List[Dict], admin_rights_hierarchy: List[Dict]) -> Dict:
    """
    Main entry point for team organigram analysis.
    
    Args:
        roles: List of role definitions
        employees: List of employee data
        admin_rights_hierarchy: List of admin rights levels
        
    Returns:
        Dictionary with graph data structure
    """
    builder = TeamOrganigramGraphBuilder()
    graph_data = builder.build_graph(roles, employees, admin_rights_hierarchy)
    
    return {
        "nodes": graph_data.nodes if isinstance(graph_data.nodes, list) else [graph_data.nodes],
        "edges": graph_data.edges,
        "roleNodes": graph_data.roleNodes if isinstance(graph_data.roleNodes, list) else [graph_data.roleNodes],
        "adminNodes": graph_data.adminNodes if isinstance(graph_data.adminNodes, list) else [graph_data.adminNodes],
        "employeeNodes": graph_data.employeeNodes if isinstance(graph_data.employeeNodes, list) else [graph_data.employeeNodes]
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        input_data = json.loads(sys.argv[1])
        roles = input_data.get('roles', [])
        employees = input_data.get('employees', [])
        admin_rights_hierarchy = input_data.get('adminRightsHierarchy', [])
        
        result = analyze_team_organigram(roles, employees, admin_rights_hierarchy)
        print(json.dumps(result, indent=2))
    else:
        print(json.dumps({"error": "No input data provided"}, indent=2))


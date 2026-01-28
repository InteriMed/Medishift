import React, { useCallback, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FiShield, FiUsers } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import TeamOrganigramGraphBuilder from './teamOrganigramGraphBuilder';
import { RIGHTS, ALL_RIGHTS } from '../../../admin/utils/rbac';

const ADMIN_RIGHTS_HIERARCHY = [
  {
    level: 0,
    name: 'SUPER_ADMIN',
    label: 'Super Admin',
    rights: ALL_RIGHTS,
    color: '#dc2626'
  },
  {
    level: 1,
    name: 'ADMIN',
    label: 'Admin',
    rights: [
      RIGHTS.VIEW_DASHBOARD,
      RIGHTS.VIEW_FINANCE,
      RIGHTS.VIEW_USER_PROFILES,
      RIGHTS.MANAGE_EMPLOYEES,
      RIGHTS.VIEW_AUDIT_LOGS,
      RIGHTS.SEND_NOTIFICATIONS
    ],
    color: '#ea580c'
  },
  {
    level: 2,
    name: 'OPS_MANAGER',
    label: 'Operations Manager',
    rights: [
      RIGHTS.VIEW_DASHBOARD,
      RIGHTS.VERIFY_USERS,
      RIGHTS.MANAGE_SHIFTS,
      RIGHTS.VIEW_USER_PROFILES
    ],
    color: '#f59e0b'
  }
];

const getRoleIcon = (workerType) => {
  switch (workerType) {
    case 'admin':
      return '🛡️';
    case 'pharmacist':
      return '💊';
    case 'pharmacy_technician':
      return '⚕️';
    case 'intern':
      return '📚';
    default:
      return '👤';
  }
};

const TeamOrganigramFlow = ({ roles = [], employees = [], viewMode = 'both' }) => {
  const { t } = useTranslation(['organization']);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  const graphData = useMemo(() => {
    const builder = new TeamOrganigramGraphBuilder();
    return builder.buildGraph(roles, employees, ADMIN_RIGHTS_HIERARCHY);
  }, [roles, employees]);

  useEffect(() => {
    if (!graphData) return;

    const reactFlowNodes = [];
    const reactFlowEdges = [];

    let xOffset = 100;
    const ySpacing = 150;
    const xSpacing = 300;

    // ADMIN NODES (VERTICAL FLOW)
    if (viewMode === 'admin' || viewMode === 'both') {
      graphData.adminNodes.forEach((adminNode, index) => {
        reactFlowNodes.push({
          id: adminNode.id,
          type: 'default',
          data: {
            label: (
              <div className="flex flex-col items-center gap-1 p-2">
                <div className="flex items-center gap-2">
                  <FiShield className="w-4 h-4" style={{ color: adminNode.metadata.color }} />
                  <span className="font-semibold text-sm">{adminNode.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {adminNode.metadata.rightsCount} {t('organization:organigram.rights', 'rights')}
                </span>
                <span className="text-xs text-gray-600">
                  {adminNode.metadata.employees?.length || 0} {t('organization:organigram.members', 'members')}
                </span>
              </div>
            ),
            metadata: adminNode.metadata,
            type: 'admin'
          },
          position: { x: xOffset, y: 100 + (index * ySpacing) },
          style: {
            background: '#ffffff',
            border: `2px solid ${adminNode.metadata.color}`,
            borderRadius: '8px',
            padding: '8px',
            width: 200
          }
        });
      });

      // Admin edges
      for (let i = 0; i < graphData.adminNodes.length - 1; i++) {
        reactFlowEdges.push({
          id: `admin-${i}-${i + 1}`,
          source: graphData.adminNodes[i].id,
          target: graphData.adminNodes[i + 1].id,
          animated: true,
          style: { stroke: graphData.adminNodes[i].metadata.color, strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: graphData.adminNodes[i].metadata.color }
        });
      }

      xOffset += xSpacing;
    }

    // ROLE NODES (HORIZONTAL FLOW)
    if (viewMode === 'roles' || viewMode === 'both') {
      graphData.roleNodes.forEach((roleNode, index) => {
        const yPosition = 100 + (index * ySpacing);
        
        reactFlowNodes.push({
          id: roleNode.id,
          type: 'default',
          data: {
            label: (
              <div className="flex flex-col items-center gap-1 p-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getRoleIcon(roleNode.metadata.workerType)}</span>
                  <span className="font-semibold text-sm">{roleNode.name}</span>
                </div>
                <span className="text-xs text-gray-600">
                  {roleNode.metadata.assignedEmployees?.length || 0} {t('organization:organigram.members', 'members')}
                </span>
              </div>
            ),
            metadata: roleNode.metadata,
            type: 'role'
          },
          position: { x: xOffset, y: yPosition },
          style: {
            background: roleNode.metadata.color1 || '#f3f4f6',
            border: `2px solid ${roleNode.metadata.color}`,
            borderRadius: '8px',
            padding: '8px',
            width: 180
          }
        });
      });

      // Role dependencies (horizontal connections)
      for (let i = 0; i < graphData.roleNodes.length - 1; i++) {
        reactFlowEdges.push({
          id: `role-${i}-${i + 1}`,
          source: graphData.roleNodes[i].id,
          target: graphData.roleNodes[i + 1].id,
          style: { stroke: '#94a3b8', strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }
        });
      }
    }

    console.log('TeamOrganigramFlow - Generated nodes:', reactFlowNodes.length);
    console.log('TeamOrganigramFlow - Generated edges:', reactFlowEdges.length);

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
  }, [graphData, viewMode, t, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    console.log('Node clicked:', node);
    setSelectedNode(node);
  }, []);

  const closeInspector = () => {
    setSelectedNode(null);
  };

  if (!graphData || (graphData.roleNodes.length === 0 && graphData.adminNodes.length === 0)) {
    return (
      <div className="flex items-center justify-center h-[600px] w-full border rounded-lg" style={{ background: 'var(--background-div-color)' }}>
        <div className="text-center">
          <FiUsers className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted-foreground)', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted-foreground)' }}>
            {t('organization:organigram.noData', 'No data available for visualization')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full border rounded-lg relative flex flex-col" style={{ background: 'var(--background-div-color)' }}>
      <div className="flex-1 h-full relative flex">
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            minZoom={0.1}
            maxZoom={2}
          >
            <Background color="var(--border-color)" gap={16} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                if (node.data?.type === 'admin') return node.style?.borderColor || '#dc2626';
                return node.style?.borderColor || '#3b82f6';
              }}
            />
          </ReactFlow>
        </div>

        {selectedNode && (
          <div 
            className="w-1/3 h-full border-l p-4 overflow-y-auto shadow-xl absolute right-0 top-0 z-10"
            style={{ background: 'var(--background-color)' }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-foreground)' }}>
                {selectedNode.data.type === 'admin' ? <FiShield /> : <FiUsers />}
                {selectedNode.data.label}
              </h3>
              <button
                onClick={closeInspector}
                className="p-2 rounded hover:bg-muted"
                style={{ color: 'var(--text-foreground)' }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedNode.data.type === 'role' && (
                <>
                  <div>
                    <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-muted-foreground)' }}>
                      {t('organization:organigram.assignedEmployees', 'Assigned Employees')}
                    </h4>
                    <div className="space-y-2">
                      {selectedNode.data.metadata.assignedEmployees?.map((emp, idx) => (
                        <div key={idx} className="border rounded p-2" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="flex items-center gap-2">
                            {emp.photoURL ? (
                              <img src={emp.photoURL} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                                style={{ background: selectedNode.data.metadata.color }}
                              >
                                {emp.firstName?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-sm" style={{ color: 'var(--text-foreground)' }}>
                              {emp.firstName} {emp.lastName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {selectedNode.data.type === 'admin' && (
                <>
                  <div>
                    <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-muted-foreground)' }}>
                      {t('organization:organigram.adminRights', 'Admin Rights')}
                    </h4>
                    <div className="space-y-1">
                      {selectedNode.data.metadata.rights?.map((right, idx) => (
                        <div key={idx} className="text-xs p-1 rounded" style={{ background: 'var(--muted-color)', color: 'var(--text-foreground)' }}>
                          {right.replace(/_/g, ' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-muted-foreground)' }}>
                      {t('organization:organigram.administrators', 'Administrators')}
                    </h4>
                    <div className="space-y-2">
                      {selectedNode.data.metadata.employees?.map((emp, idx) => (
                        <div key={idx} className="border rounded p-2" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="flex items-center gap-2">
                            {emp.photoURL ? (
                              <img src={emp.photoURL} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                                style={{ background: selectedNode.data.metadata.color }}
                              >
                                {emp.firstName?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-sm" style={{ color: 'var(--text-foreground)' }}>
                              {emp.firstName} {emp.lastName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamOrganigramFlow;


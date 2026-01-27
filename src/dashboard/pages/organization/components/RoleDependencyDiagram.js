import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiShield, FiUsers, FiBriefcase, FiUser, FiArrowDown, FiArrowRight } from 'react-icons/fi';
import { cn } from '../../../../utils/cn';
import { RIGHTS, ALL_RIGHTS } from '../../../admin/utils/rbac';
import { analyzeTeamOrganigram } from '../../../../services/teamOrganigramService';
import styles from './roleDependencyDiagram.module.css';

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
  },
  {
    level: 3,
    name: 'FINANCE',
    label: 'Finance',
    rights: [
      RIGHTS.VIEW_FINANCE,
      RIGHTS.VIEW_REVENUE,
      RIGHTS.VIEW_BALANCE_SHEET,
      RIGHTS.EXPORT_PAYROLL
    ],
    color: '#10b981'
  },
  {
    level: 4,
    name: 'RECRUITER',
    label: 'Recruiter',
    rights: [
      RIGHTS.VERIFY_USERS,
      RIGHTS.MANAGE_SHIFTS,
      RIGHTS.VIEW_USER_PROFILES
    ],
    color: '#3b82f6'
  },
  {
    level: 5,
    name: 'SUPPORT',
    label: 'Support',
    rights: [
      RIGHTS.VIEW_USER_PROFILES,
      RIGHTS.IMPERSONATE_USERS
    ],
    color: '#8b5cf6'
  }
];

const RoleDependencyDiagram = ({ roles = [], employees = [], viewMode = 'both' }) => {
  const { t } = useTranslation(['organization', 'dashboardProfile']);
  const [graphData, setGraphData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const buildLocalGraphData = useCallback((roles, employees) => {
    const roleNodes = roles
      .filter(role => role.assignedEmployees && role.assignedEmployees.length > 0)
      .map((role, index) => ({
        id: role.id || `role-${index}`,
        name: role.title || role.workerType,
        metadata: {
          workerType: role.workerType,
          assignedEmployees: role.assignedEmployees || [],
          color: role.color,
          color1: role.color1,
          level: role.level
        }
      }));

    const allEmployeesFromRoles = roles.flatMap(role => role.assignedEmployees || []);
    const adminEmployees = allEmployeesFromRoles.filter(emp => emp.isAdmin);
    
    const adminNodes = [];

    if (adminEmployees.length > 0 && (viewMode === 'admin' || viewMode === 'both')) {
      const adminLevel = ADMIN_RIGHTS_HIERARCHY.find(level => level.name === 'ADMIN') || ADMIN_RIGHTS_HIERARCHY[1];
      adminNodes.push({
        id: 'admin-level',
        name: adminLevel.label,
        metadata: {
          level: adminLevel.level,
          employees: adminEmployees,
          rights: adminLevel.rights || [],
          color: adminLevel.color,
          rightsCount: adminLevel.rights?.length || 0
        }
      });
    }

    return {
      roleNodes,
      adminNodes
    };
  }, [viewMode]);

  useEffect(() => {
    const fetchGraphData = async () => {
      if (!roles.length && !employees.length) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const localGraphData = buildLocalGraphData(roles, employees);
        console.log('RoleDependencyDiagram - Building local graph:', {
          rolesCount: roles.length,
          employeesCount: employees.length,
          roleNodes: localGraphData.roleNodes.length,
          adminNodes: localGraphData.adminNodes.length,
          roles: roles.map(r => ({ title: r.title, employeesCount: r.assignedEmployees?.length || 0 }))
        });
        setGraphData(localGraphData);
        setLoading(false);

        try {
          const result = await analyzeTeamOrganigram(roles, employees, ADMIN_RIGHTS_HIERARCHY);
          if (result.success && result.graphData) {
            console.log('RoleDependencyDiagram - Cloud function returned data:', result.graphData);
            setGraphData(result.graphData);
          }
        } catch (cloudError) {
          console.warn('Cloud function unavailable, using local graph data:', cloudError);
        }
      } catch (err) {
        console.error('Error building graph data:', err);
        setError(err.message || 'Failed to build team organigram');
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [roles, employees, buildLocalGraphData]);

  const roleNodes = useMemo(() => {
    if (!graphData?.roleNodes) return [];
    return graphData.roleNodes.map(node => ({
      id: node.id,
      name: node.name,
      workerType: node.metadata?.workerType,
      employees: node.metadata?.assignedEmployees || [],
      color: node.metadata?.color,
      color1: node.metadata?.color1,
      level: node.metadata?.level || 999
    }));
  }, [graphData]);

  const adminNodes = useMemo(() => {
    if (!graphData?.adminNodes) return [];
    return graphData.adminNodes.map(node => ({
      id: node.id,
      name: node.name,
      level: node.metadata?.level || 0,
      employees: node.metadata?.employees || [],
      rights: node.metadata?.rights || [],
      color: node.metadata?.color,
      rightsCount: node.metadata?.rightsCount || 0
    }));
  }, [graphData]);

  const getRoleIcon = (workerType) => {
    switch (workerType) {
      case 'admin':
        return FiShield;
      case 'pharmacist':
        return FiBriefcase;
      case 'pharmacy_technician':
      case 'intern':
      case 'other':
        return FiUser;
      default:
        return FiUsers;
    }
  };

  if (loading) {
    return (
      <div className={styles.diagramContainer}>
        <div className={styles.diagramHeader}>
          <h3 className={styles.diagramTitle}>
            {t('organization:organigram.dependencyDiagram', 'Role & Admin Rights Dependency Diagram')}
          </h3>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-logo-1)' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.diagramContainer}>
        <div className={styles.diagramHeader}>
          <h3 className={styles.diagramTitle}>
            {t('organization:organigram.dependencyDiagram', 'Role & Admin Rights Dependency Diagram')}
          </h3>
        </div>
        <div className="text-center py-16 text-destructive">
          <p>{t('organization:organigram.analysisError', 'Error analyzing team structure')}: {error}</p>
        </div>
      </div>
    );
  }

  if (!graphData || (!roleNodes.length && !adminNodes.length)) {
    return (
      <div className={styles.diagramContainer}>
        <div className={styles.diagramHeader}>
          <h3 className={styles.diagramTitle}>
            {t('organization:organigram.dependencyDiagram', 'Role & Admin Rights Dependency Diagram')}
          </h3>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <p>{t('organization:organigram.noData', 'No data available for visualization')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.diagramContainer}>
      <div className={styles.diagramHeader}>
        <h3 className={styles.diagramTitle}>
          {t('organization:organigram.dependencyDiagram', 'Role & Admin Rights Dependency Diagram')}
        </h3>
        <p className={styles.diagramDescription}>
          {t('organization:organigram.diagramDescription', 'Visual representation of role dependencies (horizontal) and admin rights hierarchy (vertical flow from top)')}
        </p>
      </div>

      <div className={styles.diagramContent}>
        {(viewMode === 'admin' || viewMode === 'both') && (
          <div className={styles.adminRightsColumn}>
          <div className={styles.adminRightsHeader}>
            <FiShield className={styles.headerIcon} />
            <span>{t('organization:organigram.adminRights', 'Admin Rights')}</span>
          </div>
          
          <div className={styles.adminRightsFlow}>
            {adminNodes.map((adminNode, index) => {
              const adminLevel = ADMIN_RIGHTS_HIERARCHY.find(level => level.level === adminNode.level);
              if (!adminLevel) return null;
              
              return (
                <div key={adminNode.id} className={styles.adminLevel}>
                  <div 
                    className={styles.adminLevelCard}
                    style={{ borderColor: adminNode.color || adminLevel.color }}
                  >
                    <div className={styles.adminLevelHeader}>
                      <div 
                        className={styles.adminLevelIcon}
                        style={{ backgroundColor: adminNode.color || adminLevel.color }}
                      >
                        <FiShield />
                      </div>
                      <div className={styles.adminLevelInfo}>
                        <h4 className={styles.adminLevelName}>{adminNode.name}</h4>
                        <p className={styles.adminLevelRights}>
                          {adminNode.rightsCount || adminNode.rights.length} {t('organization:organigram.rights', 'rights')}
                        </p>
                      </div>
                    </div>
                    
                    {adminNode.employees && adminNode.employees.length > 0 && (
                      <div className={styles.adminEmployees}>
                        {adminNode.employees.slice(0, 3).map(emp => (
                          <div key={emp.uid || emp.id} className={styles.adminEmployeeBadge}>
                            {emp.photoURL ? (
                              <img 
                                src={emp.photoURL} 
                                alt={`${emp.firstName || ''} ${emp.lastName || ''}`}
                                className={styles.adminEmployeeAvatar}
                              />
                            ) : (
                              <div className={styles.adminEmployeeAvatar}>
                                {emp.firstName?.[0] || emp.lastName?.[0] || '?'}
                              </div>
                            )}
                          </div>
                        ))}
                        {adminNode.employees.length > 3 && (
                          <div className={styles.adminEmployeeBadge}>
                            +{adminNode.employees.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={styles.rightsList}>
                      {adminNode.rights.slice(0, 5).map((right, idx) => (
                        <div key={idx} className={styles.rightItem}>
                          <span className={styles.rightDot} />
                          <span className={styles.rightLabel}>
                            {right.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      ))}
                      {adminNode.rights.length > 5 && (
                        <div className={styles.rightItem}>
                          <span className={styles.rightMore}>
                            +{adminNode.rights.length - 5} more
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {index < adminNodes.length - 1 && (
                    <div className={styles.flowArrow}>
                      <FiArrowDown className={styles.arrowIcon} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {(viewMode === 'roles' || viewMode === 'both') && (
          <div className={styles.rolesColumn}>
          <div className={styles.rolesHeader}>
            <FiUsers className={styles.headerIcon} />
            <span>{t('organization:organigram.roles', 'Roles')}</span>
          </div>

          <div className={styles.rolesFlow}>
            {roleNodes.map((role, index) => {
              const RoleIcon = getRoleIcon(role.workerType);
              
              return (
                <div key={role.id} className={styles.roleNode}>
                  <div 
                    className={styles.roleCard}
                    style={{ 
                      borderLeftColor: role.color,
                      backgroundColor: role.color1 || 'transparent'
                    }}
                  >
                    <div className={styles.roleHeader}>
                      <div 
                        className={styles.roleIcon}
                        style={{ backgroundColor: role.color }}
                      >
                        <RoleIcon />
                      </div>
                      <div className={styles.roleInfo}>
                        <h4 className={styles.roleName}>{role.name}</h4>
                        <p className={styles.roleCount}>
                          {role.employees.length} {role.employees.length === 1 ? t('organization:organigram.member', 'member') : t('organization:organigram.members', 'members')}
                        </p>
                      </div>
                    </div>

                    <div className={styles.roleEmployees}>
                      {role.employees.slice(0, 4).map((emp, empIdx) => (
                        <div key={emp.uid || emp.id || `emp-${empIdx}`} className={styles.roleEmployeeBadge}>
                          {emp.photoURL ? (
                            <img 
                              src={emp.photoURL} 
                              alt={`${emp.firstName || ''} ${emp.lastName || ''}`}
                              className={styles.roleEmployeeAvatar}
                            />
                          ) : (
                            <div 
                              className={styles.roleEmployeeAvatar}
                              style={{ backgroundColor: role.color }}
                            >
                              {emp.firstName?.[0] || emp.lastName?.[0] || '?'}
                            </div>
                          )}
                          {emp.isAdmin && (
                            <div className={styles.adminBadge}>
                              <FiShield />
                            </div>
                          )}
                        </div>
                      ))}
                      {role.employees.length > 4 && (
                        <div className={styles.roleEmployeeBadge}>
                          +{role.employees.length - 4}
                        </div>
                      )}
                    </div>
                  </div>

                  {index < roleNodes.length - 1 && (
                    <div className={styles.roleConnector}>
                      <FiArrowRight className={styles.connectorIcon} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      <div className={styles.diagramLegend}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#dc2626' }} />
          <span>{t('organization:organigram.legendAdmin', 'Admin Rights (Vertical Flow)')}</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#3b82f6' }} />
          <span>{t('organization:organigram.legendRoles', 'Roles (Horizontal Dependencies)')}</span>
        </div>
      </div>
    </div>
  );
};

export default RoleDependencyDiagram;


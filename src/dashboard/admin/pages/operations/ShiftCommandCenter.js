import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper
} from '@tanstack/react-table';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { MoreVertical, Edit, UserPlus, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../../../contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '../../utils/rbac';
import { logAdminAction, ADMIN_AUDIT_EVENTS } from '../../../../utils/auditLogger';
import Button from '../../../../components/colorPicker/Button';
import PersonnalizedInputField from '../../../../components/boxedInputFields/personnalizedInputField';
import PageHeader from '../../../components/PageHeader/PageHeader';
import FilterBar from '../../../../components/layout/FilterBar/FilterBar';
import '../../../../styles/variables.css';

const columnHelper = createColumnHelper();

const ShiftCommandCenter = () => {
  const { t } = useTranslation(['admin']);
  const { userProfile } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rowActionMenu, setRowActionMenu] = useState(null);
  const [forceAssignModal, setForceAssignModal] = useState(null);
  const [editPayModal, setEditPayModal] = useState(null);

  const canForceAssign = hasPermission(userProfile?.roles || [], PERMISSIONS.FORCE_ASSIGN_SHIFTS);
  const canEditPay = hasPermission(userProfile?.roles || [], PERMISSIONS.EDIT_PAY_RATES);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const shiftsRef = collection(db, 'shifts');
      const snapshot = await getDocs(shiftsRef);

      const shiftsList = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        shiftsList.push({
          id: docSnap.id,
          ...data,
          date: data.date?.toDate?.() || data.date || null,
          startTime: data.startTime?.toDate?.() || data.startTime || null,
          endTime: data.endTime?.toDate?.() || data.endTime || null
        });
      });

      setShifts(shiftsList);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceAssign = async (shiftId, userId) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      await updateDoc(doc(db, 'shifts', shiftId), {
        assignedUserId: userId,
        status: 'confirmed',
        assignedBy: userProfile?.uid || 'admin',
        assignedAt: new Date()
      });

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.SHIFT_FORCE_ASSIGNED,
        action: `Force assigned shift ${shiftId} to user ${userId}`,
        resource: {
          type: 'shift',
          id: shiftId
        },
        details: {
          shiftId,
          assignedUserId: userId,
          facilityId: shift?.facilityId,
          role: shift?.role,
          date: shift?.date?.toISOString?.() || shift?.date,
          assignedBy: userProfile?.uid || 'admin'
        }
      });

      await loadShifts();
      setForceAssignModal(null);
    } catch (error) {
      console.error('Error force assigning:', error);
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.SHIFT_FORCE_ASSIGNED,
        action: `Failed to force assign shift ${shiftId}`,
        resource: { type: 'shift', id: shiftId },
        details: { error: error.message },
        success: false,
        errorMessage: error.message
      });
      alert('Error assigning shift');
    }
  };

  const handleEditPay = async (shiftId, newRate) => {
    try {
      const shift = shifts.find(s => s.id === shiftId);
      const oldRate = shift?.hourlyRate;
      await updateDoc(doc(db, 'shifts', shiftId), {
        hourlyRate: parseFloat(newRate),
        estimatedCost: parseFloat(newRate) * (getShiftDuration(shiftId) || 8),
        editedBy: userProfile?.uid || 'admin',
        editedAt: new Date()
      });

      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.SHIFT_PAY_EDITED,
        action: `Edited pay rate for shift ${shiftId}`,
        resource: {
          type: 'shift',
          id: shiftId
        },
        details: {
          shiftId,
          oldRate,
          newRate: parseFloat(newRate),
          facilityId: shift?.facilityId,
          role: shift?.role,
          editedBy: userProfile?.uid || 'admin'
        }
      });

      await loadShifts();
      setEditPayModal(null);
    } catch (error) {
      console.error('Error editing pay:', error);
      await logAdminAction({
        eventType: ADMIN_AUDIT_EVENTS.SHIFT_PAY_EDITED,
        action: `Failed to edit pay rate for shift ${shiftId}`,
        resource: { type: 'shift', id: shiftId },
        details: { error: error.message },
        success: false,
        errorMessage: error.message
      });
      alert('Error updating pay rate');
    }
  };

  const getShiftDuration = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift || !shift.startTime || !shift.endTime) return 8;
    const start = shift.startTime instanceof Date ? shift.startTime : new Date(shift.startTime);
    const end = shift.endTime instanceof Date ? shift.endTime : new Date(shift.endTime);
    return (end - start) / (1000 * 60 * 60);
  };

  const filteredShifts = useMemo(() => {
    let filtered = shifts;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(shift => shift.status === statusFilter);
    }

    if (globalFilter) {
      const filterLower = globalFilter.toLowerCase();
      filtered = filtered.filter(shift =>
        shift.facilityId?.toLowerCase().includes(filterLower) ||
        shift.role?.toLowerCase().includes(filterLower) ||
        shift.assignedUserId?.toLowerCase().includes(filterLower) ||
        shift.status?.toLowerCase().includes(filterLower)
      );
    }

    return filtered;
  }, [shifts, statusFilter, globalFilter]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        header: t('admin:shifts.date', 'Date'),
        cell: info => {
          const date = info.getValue();
          return date ? format(date, 'dd/MM/yyyy') : 'N/A';
        }
      }),
      columnHelper.accessor('facilityId', {
        header: t('admin:shifts.facility', 'Facility'),
        cell: info => info.getValue() || 'N/A'
      }),
      columnHelper.accessor('role', {
        header: t('admin:shifts.role', 'Role'),
        cell: info => info.getValue() || 'N/A'
      }),
      columnHelper.accessor('status', {
        header: t('admin:shifts.status', 'Status'),
        cell: info => {
          const status = info.getValue();
          const statusStyles = {
            open: { backgroundColor: 'var(--blue-1)', color: 'var(--blue-4)' },
            filled: { backgroundColor: 'var(--yellow-1)', color: 'var(--yellow-4)' },
            confirmed: { backgroundColor: 'var(--green-1)', color: 'var(--green-4)' },
            completed: { backgroundColor: 'var(--grey-2)', color: 'var(--grey-5)' },
            cancelled: { backgroundColor: 'var(--red-1)', color: 'var(--red-4)' }
          };
          const defaultStyle = { backgroundColor: 'var(--grey-1)', color: 'var(--grey-4)' };
          return (
            <span style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRadius: 'var(--border-radius-sm)', fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)', ...(statusStyles[status] || defaultStyle) }}>
              {status || 'N/A'}
            </span>
          );
        }
      }),
      ...(canEditPay ? [columnHelper.accessor('hourlyRate', {
        header: t('admin:shifts.margin', 'Rate'),
        cell: info => {
          const rate = info.getValue();
          return rate ? `CHF ${rate.toFixed(2)}/h` : 'N/A';
        }
      })] : []),
      columnHelper.display({
        id: 'actions',
        header: t('admin:shifts.actions', 'Actions'),
        cell: info => {
          const shift = info.row.original;
          return (
            <div style={{ position: 'relative' }}>
              <Button
                onClick={() => setRowActionMenu(rowActionMenu === shift.id ? null : shift.id)}
                variant="secondary"
                className=""
                style={{ padding: 'var(--spacing-sm)' }}
              >
                <MoreVertical size={16} />
              </Button>
              {rowActionMenu === shift.id && (
                <div style={{ position: 'absolute', right: 0, marginTop: 'var(--spacing-xs)', width: '192px', backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--grey-2)', zIndex: 'var(--z-index-dropdown)' }}>
                  {canForceAssign && (
                    <Button
                      onClick={() => setForceAssignModal(shift)}
                      variant="secondary"
                      className=""
                      style={{ width: '100%', textAlign: 'left', padding: 'var(--spacing-sm) var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-small)', justifyContent: 'flex-start' }}
                    >
                      <UserPlus size={16} />
                      {t('admin:shifts.forceAssign', 'Force Assign')}
                    </Button>
                  )}
                  {canEditPay && (
                    <Button
                      onClick={() => setEditPayModal(shift)}
                      variant="secondary"
                      className=""
                      style={{ width: '100%', textAlign: 'left', padding: 'var(--spacing-sm) var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-small)', justifyContent: 'flex-start' }}
                    >
                      <DollarSign size={16} />
                      {t('admin:shifts.editPay', 'Edit Pay')}
                    </Button>
                  )}
                  <Button
                    onClick={async () => {
                      const newStatus = prompt('New status:');
                      if (newStatus) {
                        try {
                          const oldStatus = shift.status;
                          await updateDoc(doc(db, 'shifts', shift.id), {
                            status: newStatus,
                            editedBy: userProfile?.uid || 'admin',
                            editedAt: new Date()
                          });

                          await logAdminAction({
                            eventType: ADMIN_AUDIT_EVENTS.SHIFT_STATUS_EDITED,
                            action: `Changed shift ${shift.id} status from ${oldStatus} to ${newStatus}`,
                            resource: {
                              type: 'shift',
                              id: shift.id
                            },
                            details: {
                              shiftId: shift.id,
                              oldStatus,
                              newStatus,
                              facilityId: shift?.facilityId,
                              role: shift?.role,
                              editedBy: userProfile?.uid || 'admin'
                            }
                          });

                          await loadShifts();
                        } catch (error) {
                          console.error('Error updating shift status:', error);
                          await logAdminAction({
                            eventType: ADMIN_AUDIT_EVENTS.SHIFT_STATUS_EDITED,
                            action: `Failed to change shift ${shift.id} status`,
                            resource: { type: 'shift', id: shift.id },
                            details: { error: error.message },
                            success: false,
                            errorMessage: error.message
                          });
                          alert('Error updating shift status');
                        }
                      }
                      setRowActionMenu(null);
                    }}
                    variant="secondary"
                    className=""
                    style={{ width: '100%', textAlign: 'left', padding: 'var(--spacing-sm) var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-small)', justifyContent: 'flex-start' }}
                  >
                    <Edit size={16} />
                    {t('admin:shifts.edit', 'Edit')}
                  </Button>
                </div>
              )}
            </div>
          );
        }
      })
    ],
    [t, rowActionMenu, canForceAssign, canEditPay]
  );

  const table = useReactTable({
    data: filteredShifts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 20
      }
    }
  });

  const statusOptions = [
    { value: 'all', label: t('admin:shifts.allStatuses', 'All Statuses') },
    { value: 'open', label: t('admin:shifts.unfilled', 'Unfilled') },
    { value: 'filled', label: t('admin:shifts.applied', 'Applied') },
    { value: 'confirmed', label: t('admin:shifts.confirmed', 'Confirmed') },
    { value: 'completed', label: t('admin:shifts.completed', 'Completed') }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div style={{ color: 'var(--text-light-color)' }}>Loading shifts...</div>
      </div>
    );
  }

  const handleFilterChange = (key, value) => {
    if (key === 'status') {
      setStatusFilter(value);
    }
  };

  const filterBarDropdownFields = [
    {
      key: 'status',
      label: 'Status',
      options: statusOptions,
      defaultValue: 'all'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PageHeader
        title={t('admin:shifts.commandCenter', 'Command Center')}
        subtitle={t('admin:shifts.commandCenterDescription', 'Manage and monitor all shifts')}
      />
      
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <FilterBar
            filters={{ status: statusFilter }}
            onFilterChange={handleFilterChange}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            searchPlaceholder={t('admin:shifts.search', 'Search shifts...')}
            dropdownFields={filterBarDropdownFields}
            translationNamespace="admin"
            title={t('admin:shifts.searchCriteria', 'Search Criteria')}
            description={t('admin:shifts.searchDescription', 'Filter shifts by status or search by facility, role, or user')}
            onRefresh={loadShifts}
            isLoading={loading}
          />

      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-md)', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} style={{ borderBottom: '1px solid var(--grey-2)' }}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ textAlign: 'left', padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-light-color)' }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default', userSelect: 'none' }}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {(() => {
                            const sortOrder = header.column.getIsSorted();
                            const sortSymbols = { asc: ' ↑', desc: ' ↓' };
                            return sortSymbols[sortOrder] ?? null;
                          })()}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--grey-2)', transition: 'background-color var(--transition-fast)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--grey-1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} style={{ padding: 'var(--spacing-md)', fontSize: 'var(--font-size-small)' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--grey-2)' }}>
          <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-light-color)' }}>
            {t('admin:shifts.showing', 'Showing')} {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredShifts.length)} {t('admin:shifts.of', 'of')} {filteredShifts.length}
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              variant="secondary"
            >
              {t('admin:shifts.previous', 'Previous')}
            </Button>
            <Button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              variant="secondary"
            >
              {t('admin:shifts.next', 'Next')}
            </Button>
          </div>
        </div>
        </div>
      </div>
      </div>

      {forceAssignModal && (
        <ForceAssignModal
          shift={forceAssignModal}
          onClose={() => setForceAssignModal(null)}
          onAssign={handleForceAssign}
        />
      )}

      {editPayModal && (
        <EditPayModal
          shift={editPayModal}
          onClose={() => setEditPayModal(null)}
          onSave={handleEditPay}
        />
      )}
    </div>
  );
};

const ForceAssignModal = ({ shift, onClose, onAssign }) => {
  const [userId, setUserId] = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 'var(--z-index-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)' }}>
      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', maxWidth: '448px', width: '100%', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-md)' }}>Force Assign Shift</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <PersonnalizedInputField
              label="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              name="userId"
              placeholder="Enter user ID"
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Button
              onClick={() => onAssign(shift.id, userId)}
              variant="primary"
              style={{ flex: 1 }}
            >
              Assign
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditPayModal = ({ shift, onClose, onSave }) => {
  const [rate, setRate] = useState(shift.hourlyRate || '');

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 'var(--z-index-modal)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)' }}>
      <div style={{ backgroundColor: 'var(--background-div-color)', borderRadius: 'var(--border-radius-md)', padding: 'var(--spacing-lg)', maxWidth: '448px', width: '100%', border: '1px solid var(--grey-2)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: 'var(--font-size-large)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--spacing-md)' }}>Edit Pay Rate</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div>
            <PersonnalizedInputField
              label="Hourly Rate (CHF)"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              name="rate"
              placeholder="Enter hourly rate"
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Button
              onClick={() => onSave(shift.id, rate)}
              variant="primary"
              style={{ flex: 1 }}
            >
              Save
            </Button>
            <Button
              onClick={onClose}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftCommandCenter;


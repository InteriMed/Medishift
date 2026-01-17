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
import { collection, query, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { MoreVertical, Edit, Ban, Download, CheckCircle, XCircle, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { exportShiftsToCSV } from '../../../utils/adminUtils';

const columnHelper = createColumnHelper();

const ShiftMasterList = () => {
  const { t } = useTranslation(['admin']);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rowActionMenu, setRowActionMenu] = useState(null);

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
          date: data.date?.toDate?.() || data.date || null
        });
      });
      
      setShifts(shiftsList);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowAction = async (shiftId, action) => {
    try {
      switch (action) {
        case 'verify':
          await updateDoc(doc(db, 'shifts', shiftId), {
            status: 'confirmed',
            verifiedAt: new Date()
          });
          break;
        case 'ban':
          await updateDoc(doc(db, 'shifts', shiftId), {
            status: 'cancelled',
            cancelledAt: new Date()
          });
          break;
        case 'edit':
          const newStatus = prompt('New status (open/filled/confirmed/completed/cancelled):');
          if (newStatus) {
            await updateDoc(doc(db, 'shifts', shiftId), {
              status: newStatus
            });
          }
          break;
        default:
          break;
      }
      await loadShifts();
      setRowActionMenu(null);
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Error performing action. Please try again.');
    }
  };

  const handleExport = async () => {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    try {
      await exportShiftsToCSV(month, year);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting shifts');
    }
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
      columnHelper.accessor('id', {
        header: 'ID',
        cell: info => <span className="font-mono text-xs">{info.getValue().substring(0, 8)}...</span>
      }),
      columnHelper.accessor('facilityId', {
        header: t('admin:shifts.facility', 'Facility'),
        cell: info => info.getValue() || 'N/A'
      }),
      columnHelper.accessor('date', {
        header: t('admin:shifts.date', 'Date'),
        cell: info => {
          const date = info.getValue();
          return date ? format(date, 'dd/MM/yyyy') : 'N/A';
        }
      }),
      columnHelper.accessor('startTime', {
        header: t('admin:shifts.startTime', 'Start'),
        cell: info => info.getValue() || 'N/A'
      }),
      columnHelper.accessor('endTime', {
        header: t('admin:shifts.endTime', 'End'),
        cell: info => info.getValue() || 'N/A'
      }),
      columnHelper.accessor('role', {
        header: t('admin:shifts.role', 'Role'),
        cell: info => info.getValue() || 'N/A'
      }),
      columnHelper.accessor('assignedUserId', {
        header: t('admin:shifts.assignedUser', 'Assigned User'),
        cell: info => info.getValue() ? info.getValue().substring(0, 8) + '...' : 'Unassigned'
      }),
      columnHelper.accessor('status', {
        header: t('admin:shifts.status', 'Status'),
        cell: info => {
          const status = info.getValue();
          const statusColors = {
            open: 'bg-blue-1 text-blue-4',
            filled: 'bg-yellow-1 text-yellow-4',
            confirmed: 'bg-green-1 text-green-4',
            completed: 'bg-grey-2 text-grey-5',
            cancelled: 'bg-red-1 text-red-4'
          };
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status] || 'bg-grey-1 text-grey-4'}`}>
              {status || 'N/A'}
            </span>
          );
        }
      }),
      columnHelper.display({
        id: 'actions',
        header: t('admin:shifts.actions', 'Actions'),
        cell: info => {
          const shiftId = info.row.original.id;
          return (
            <div className="relative">
              <button
                onClick={() => setRowActionMenu(rowActionMenu === shiftId ? null : shiftId)}
                className="p-2 hover:bg-grey-1 rounded transition-colors"
              >
                <MoreVertical size={16} />
              </button>
              {rowActionMenu === shiftId && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-border z-10">
                  <button
                    onClick={() => handleRowAction(shiftId, 'verify')}
                    className="w-full text-left px-4 py-2 hover:bg-grey-1 flex items-center gap-2 text-sm"
                  >
                    <CheckCircle size={16} />
                    {t('admin:shifts.verify', 'Verify')}
                  </button>
                  <button
                    onClick={() => handleRowAction(shiftId, 'edit')}
                    className="w-full text-left px-4 py-2 hover:bg-grey-1 flex items-center gap-2 text-sm"
                  >
                    <Edit size={16} />
                    {t('admin:shifts.edit', 'Edit')}
                  </button>
                  <button
                    onClick={() => handleRowAction(shiftId, 'ban')}
                    className="w-full text-left px-4 py-2 hover:bg-grey-1 flex items-center gap-2 text-sm text-red-3"
                  >
                    <Ban size={16} />
                    {t('admin:shifts.cancel', 'Cancel')}
                  </button>
                </div>
              )}
            </div>
          );
        }
      })
    ],
    [t, rowActionMenu]
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading shifts...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('admin:shifts.title', 'Shift Master List')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin:shifts.subtitle', 'View and manage all platform shifts')}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download size={18} />
          {t('admin:shifts.export', 'Export CSV')}
        </button>
      </div>

      <div className="bg-background-div-color rounded-lg p-4 border border-border">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder={t('admin:shifts.search', 'Search shifts...')}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary appearance-none bg-white"
            >
              <option value="all">{t('admin:shifts.allStatuses', 'All Statuses')}</option>
              <option value="open">{t('admin:shifts.open', 'Open')}</option>
              <option value="filled">{t('admin:shifts.filled', 'Filled')}</option>
              <option value="confirmed">{t('admin:shifts.confirmed', 'Confirmed')}</option>
              <option value="completed">{t('admin:shifts.completed', 'Completed')}</option>
              <option value="cancelled">{t('admin:shifts.cancelled', 'Cancelled')}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b border-border">
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="text-left p-3 text-sm font-semibold text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: ' ↑',
                            desc: ' ↓'
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-border hover:bg-grey-1 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="p-3 text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {t('admin:shifts.showing', 'Showing')} {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} - {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredShifts.length)} {t('admin:shifts.of', 'of')} {filteredShifts.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-4 py-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-grey-1 transition-colors"
            >
              {t('admin:shifts.previous', 'Previous')}
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-4 py-2 border border-border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-grey-1 transition-colors"
            >
              {t('admin:shifts.next', 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftMasterList;


















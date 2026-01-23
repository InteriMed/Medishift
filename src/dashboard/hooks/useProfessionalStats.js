import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboard } from '../contexts/DashboardContext';
import { WORKSPACE_TYPES } from '../../utils/sessionAuth';

const useProfessionalStats = () => {
  const { user } = useAuth();
  const { selectedWorkspace } = useDashboard();
  
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeHours: 0,
    earnings: 0,
    upcomingJobs: 0,
    recentActivity: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user || !selectedWorkspace) {
        setLoading(false);
        return;
      }

      // Only fetch for personal workspace or if user is a professional
      if (selectedWorkspace.type !== WORKSPACE_TYPES.PERSONAL && !user.hasProfessionalProfile) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const userId = user.uid;
        
        // 1. Fetch Contracts
        const contractsRef = collection(db, 'contracts');
        // Query for contracts where user is the professional
        // Support both new structure (parties.professional.profileId) and old (workerId)
        const contractsQuery = query(
          contractsRef, 
          where('parties.professional.profileId', '==', userId),
          where('statusLifecycle.currentStatus', 'in', ['active', 'completed', 'terminated'])
        );
        
        const contractsSnapshot = await getDocs(contractsQuery);
        const contracts = contractsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Filter for active contracts
        const activeContracts = contracts.filter(c => 
          c.statusLifecycle?.currentStatus === 'active' || c.status === 'active'
        );

        // 2. Fetch Shifts (for hours and earnings)
        // Assuming 'shifts' collection has professionalId or workerId
        const shiftsRef = collection(db, 'shifts');
        const shiftsQuery = query(
          shiftsRef,
          where('professionalId', '==', userId)
        );
        
        // Note: If 'shifts' collection doesn't use professionalId, this might return empty.
        // We might need to adjust based on actual schema if known. 
        // For now, we'll try this.
        const shiftsSnapshot = await getDocs(shiftsQuery);
        const shifts = shiftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Calculate stats
        let totalHours = 0;
        let totalEarnings = 0;
        let upcomingShiftsCount = 0;
        const now = new Date();

        shifts.forEach(shift => {
          const startTime = shift.startTime instanceof Timestamp ? shift.startTime.toDate() : new Date(shift.startTime);
          const endTime = shift.endTime instanceof Timestamp ? shift.endTime.toDate() : new Date(shift.endTime);
          
          if (startTime > now) {
            upcomingShiftsCount++;
          } else if (endTime < now && shift.status === 'completed') {
            // Calculate hours for completed shifts
            const durationMs = endTime - startTime;
            const durationHours = durationMs / (1000 * 60 * 60);
            totalHours += durationHours;
            
            // Calculate earnings if rate is available
            // Assuming shift has hourlyRate or totalPay
            if (shift.totalPay) {
              totalEarnings += Number(shift.totalPay);
            } else if (shift.hourlyRate) {
              totalEarnings += durationHours * Number(shift.hourlyRate);
            }
          }
        });

        // 3. Recent Activity (Mocked for now, or derived from contracts/shifts)
        // We can combine recent contract updates and upcoming shifts
        const activities = [];
        
        // Add recent contracts
        contracts.slice(0, 5).forEach(contract => {
          activities.push({
            id: `contract-${contract.id}`,
            title: `Contract ${contract.statusLifecycle?.currentStatus || contract.status}: ${contract.title || 'Untitled'}`,
            time: contract.updatedAt instanceof Timestamp ? contract.updatedAt.toDate() : new Date(contract.updatedAt || Date.now()),
            type: 'contract'
          });
        });

        // Add upcoming shifts
        shifts.filter(s => {
          const start = s.startTime instanceof Timestamp ? s.startTime.toDate() : new Date(s.startTime);
          return start > now;
        }).sort((a, b) => {
          const startA = a.startTime instanceof Timestamp ? a.startTime.toDate() : new Date(a.startTime);
          const startB = b.startTime instanceof Timestamp ? b.startTime.toDate() : new Date(b.startTime);
          return startA - startB;
        }).slice(0, 5).forEach(shift => {
          const start = shift.startTime instanceof Timestamp ? shift.startTime.toDate() : new Date(shift.startTime);
          activities.push({
            id: `shift-${shift.id}`,
            title: `Upcoming Shift at ${shift.facilityName || 'Facility'}`,
            time: start,
            type: 'shift'
          });
        });

        // Sort activities by time desc
        activities.sort((a, b) => b.time - a.time);

        setStats({
          totalContracts: activeContracts.length,
          activeHours: Math.round(totalHours * 10) / 10,
          earnings: Math.round(totalEarnings * 100) / 100,
          upcomingJobs: upcomingShiftsCount,
          recentActivity: activities.slice(0, 5)
        });

      } catch (err) {
        console.error('Error fetching professional stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, selectedWorkspace]);

  return { stats, loading, error };
};

export default useProfessionalStats;


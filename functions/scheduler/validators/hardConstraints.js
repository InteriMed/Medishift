const { RulesConfig } = require('../config/schedulerRules');
const { Role } = require('../models/types');

function differenceInHours(dateLeft, dateRight) {
  const diffTime = Math.abs(dateLeft.getTime() - dateRight.getTime());
  return diffTime / (1000 * 60 * 60);
}

function isSameDay(dateLeft, dateRight) {
  return dateLeft.getFullYear() === dateRight.getFullYear() &&
         dateLeft.getMonth() === dateRight.getMonth() &&
         dateLeft.getDate() === dateRight.getDate();
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const HardConstraintValidator = {
  
  isShiftLegal: (employee, proposedShift) => {
    if (!employee || !proposedShift) {
      console.error('Illegal: Missing employee or shift data.');
      return false;
    }

    const lastShift = employee.shiftHistory && employee.shiftHistory.length > 0
      ? employee.shiftHistory[employee.shiftHistory.length - 1]
      : null;

    if (lastShift) {
      const lastShiftEnd = lastShift.end instanceof Date ? lastShift.end : new Date(lastShift.end);
      const proposedStart = proposedShift.start instanceof Date ? proposedShift.start : new Date(proposedShift.start);
      
      const restHours = differenceInHours(proposedStart, lastShiftEnd);
      if (restHours < RulesConfig.constraints.hard.min_daily_rest_hours) {
        console.error(`Illegal: Only ${restHours.toFixed(2)}h rest since last shift. Required: ${RulesConfig.constraints.hard.min_daily_rest_hours}h`);
        return false;
      }
    }

    if (employee.shiftHistory && employee.shiftHistory.length > 0) {
      const proposedStart = proposedShift.start instanceof Date ? proposedShift.start : new Date(proposedShift.start);
      let consecutiveDays = 0;
      let currentDate = new Date(proposedStart);
      currentDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < RulesConfig.constraints.hard.max_consecutive_days; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() - i);

        const hasShiftOnDay = employee.shiftHistory.some(shift => {
          const shiftDate = shift.start instanceof Date ? shift.start : new Date(shift.start);
          shiftDate.setHours(0, 0, 0, 0);
          return isSameDay(shiftDate, checkDate);
        });

        if (hasShiftOnDay) {
          consecutiveDays++;
        } else {
          break;
        }
      }

      if (consecutiveDays >= RulesConfig.constraints.hard.max_consecutive_days) {
        console.error(`Illegal: ${consecutiveDays + 1} consecutive days. Maximum allowed: ${RulesConfig.constraints.hard.max_consecutive_days}`);
        return false;
      }
    }

    return true;
  },

  isShopCovered: (slot) => {
    if (!slot || !slot.assignedStaff) {
      return false;
    }

    const pharmacists = slot.assignedStaff.filter(e => e.role === Role.PHARMACIST).length;
    const assistants = slot.assignedStaff.filter(e => e.role === Role.ASSISTANT).length;
    const totalActive = slot.assignedStaff.length;

    if (pharmacists < RulesConfig.constraints.hard.min_staff_per_slot.pharmacist) {
      return false;
    }
    if (assistants < RulesConfig.constraints.hard.min_staff_per_slot.assistant) {
      return false;
    }
    if (totalActive < RulesConfig.constraints.hard.min_staff_per_slot.total_active) {
      return false;
    }

    return true;
  },

  checkWeeklyHours: (employee, proposedShift) => {
    if (!employee || !proposedShift) {
      return false;
    }

    const proposedStart = proposedShift.start instanceof Date ? proposedShift.start : new Date(proposedShift.start);
    const proposedEnd = proposedShift.end instanceof Date ? proposedShift.end : new Date(proposedShift.end);
    const shiftHours = differenceInHours(proposedEnd, proposedStart);

    const weekStart = new Date(proposedStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let weeklyHours = 0;

    if (employee.shiftHistory && employee.shiftHistory.length > 0) {
      employee.shiftHistory.forEach(shift => {
        const shiftStart = shift.start instanceof Date ? shift.start : new Date(shift.start);
        if (shiftStart >= weekStart && shiftStart < weekEnd) {
          const shiftEnd = shift.end instanceof Date ? shift.end : new Date(shift.end);
          weeklyHours += differenceInHours(shiftEnd, shiftStart);
        }
      });
    }

    weeklyHours += shiftHours;

    if (weeklyHours > RulesConfig.constraints.hard.max_weekly_hours) {
      console.error(`Illegal: Weekly hours would be ${weeklyHours.toFixed(2)}h. Maximum: ${RulesConfig.constraints.hard.max_weekly_hours}h`);
      return false;
    }

    return true;
  }
};

module.exports = HardConstraintValidator;


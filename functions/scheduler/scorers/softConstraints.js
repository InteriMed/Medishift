const { RulesConfig } = require('../config/schedulerRules');

function differenceInHours(dateLeft, dateRight) {
  const diffTime = Math.abs(dateLeft.getTime() - dateRight.getTime());
  return diffTime / (1000 * 60 * 60);
}

const SoftConstraintScorer = {

  calculateBurden: (employee, proposedShift) => {
    if (!employee || !proposedShift) {
      return Infinity;
    }

    let score = 0;
    const shiftStart = proposedShift.start instanceof Date ? proposedShift.start : new Date(proposedShift.start);
    const shiftEnd = proposedShift.end instanceof Date ? proposedShift.end : new Date(proposedShift.end);
    const hours = differenceInHours(shiftEnd, shiftStart);
    const dayOfWeek = shiftStart.getDay();
    const startHour = shiftStart.getHours();
    const endHour = shiftEnd.getHours();

    let weight = RulesConfig.constraints.soft.weights.standard;

    if (dayOfWeek === 0) {
      weight = RulesConfig.constraints.soft.weights.sunday;
    } else if (dayOfWeek === 6) {
      weight = RulesConfig.constraints.soft.weights.saturday;
    }

    if (startHour >= 19 || startHour < 6 || endHour > 23 || endHour <= 6) {
      weight = Math.max(weight, RulesConfig.constraints.soft.weights.night);
    }

    score += (hours * weight);

    if (employee.preferredDays && employee.preferredDays.length > 0) {
      if (!employee.preferredDays.includes(dayOfWeek)) {
        score += RulesConfig.constraints.soft.penalties.pattern_deviation;
      }
    }

    if (employee.shiftHistory && employee.shiftHistory.length > 0) {
      const shiftDate = new Date(shiftStart);
      shiftDate.setHours(0, 0, 0, 0);

      const hasOtherShiftSameDay = employee.shiftHistory.some(shift => {
        const otherShiftStart = shift.start instanceof Date ? shift.start : new Date(shift.start);
        const otherShiftDate = new Date(otherShiftStart);
        otherShiftDate.setHours(0, 0, 0, 0);
        return otherShiftDate.getTime() === shiftDate.getTime();
      });

      if (hasOtherShiftSameDay) {
        score += RulesConfig.constraints.soft.penalties.split_shift;
      }
    }

    score += (employee.currentBalance * 0.5);

    return score;
  },

  calculateCost: (employee, proposedShift) => {
    const burden = SoftConstraintScorer.calculateBurden(employee, proposedShift);
    const shiftStart = proposedShift.start instanceof Date ? proposedShift.start : new Date(proposedShift.start);
    const shiftEnd = proposedShift.end instanceof Date ? proposedShift.end : new Date(proposedShift.end);
    const hours = differenceInHours(shiftEnd, shiftStart);
    
    return {
      burden,
      hours,
      cost: burden * hours
    };
  }
};

module.exports = SoftConstraintScorer;


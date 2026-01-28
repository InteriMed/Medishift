const HardConstraintValidator = require('../validators/hardConstraints');
const SoftConstraintScorer = require('../scorers/softConstraints');
const { createShift } = require('../models/types');

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

class SchedulerEngine {
  
  resolveGap(gapTime, availableEmployees, shiftDurationHours = 8) {
    if (!gapTime || !availableEmployees || availableEmployees.length === 0) {
      return {
        valid: false,
        error: 'Missing required parameters',
        employee: null,
        cost: null
      };
    }

    const gapStart = gapTime instanceof Date ? gapTime : new Date(gapTime);
    const gapEnd = new Date(gapStart);
    gapEnd.setHours(gapEnd.getHours() + shiftDurationHours);

    const testShift = createShift({
      id: 'temp',
      employeeId: '',
      start: gapStart,
      end: gapEnd,
      type: 'STANDARD'
    });

    const legalCandidates = availableEmployees.filter(candidate => {
      const candidateShift = createShift({
        id: 'temp',
        employeeId: candidate.id,
        start: gapStart,
        end: gapEnd,
        type: 'STANDARD'
      });

      const isLegal = HardConstraintValidator.isShiftLegal(candidate, candidateShift);
      const weeklyHoursOk = HardConstraintValidator.checkWeeklyHours(candidate, candidateShift);
      
      return isLegal && weeklyHoursOk;
    });

    if (legalCandidates.length === 0) {
      return {
        valid: false,
        error: 'No legal candidates available. Consider marketplace or floater.',
        employee: null,
        cost: null
      };
    }

    const rankedCandidates = legalCandidates.map(candidate => {
      const candidateShift = createShift({
        id: 'temp',
        employeeId: candidate.id,
        start: gapStart,
        end: gapEnd,
        type: 'STANDARD'
      });

      const costData = SoftConstraintScorer.calculateCost(candidate, candidateShift);
      
      return {
        employee: candidate,
        score: costData.burden,
        cost: costData.cost,
        hours: costData.hours
      };
    });

    rankedCandidates.sort((a, b) => a.score - b.score);

    const winner = rankedCandidates[0];

    return {
      valid: true,
      employee: winner.employee,
      cost: winner.cost,
      burden: winner.score,
      hours: winner.hours,
      alternatives: rankedCandidates.slice(1, 4).map(c => ({
        employee: c.employee,
        cost: c.cost,
        burden: c.score
      }))
    };
  }

  validateAssignment(employee, proposedShift) {
    if (!employee || !proposedShift) {
      return {
        valid: false,
        error: 'Missing employee or shift data'
      };
    }

    const shift = createShift(proposedShift);
    const isLegal = HardConstraintValidator.isShiftLegal(employee, shift);
    const weeklyHoursOk = HardConstraintValidator.checkWeeklyHours(employee, shift);

    if (!isLegal) {
      return {
        valid: false,
        error: 'Shift violates hard constraints (rest period or consecutive days)'
      };
    }

    if (!weeklyHoursOk) {
      return {
        valid: false,
        error: 'Shift would exceed maximum weekly hours'
      };
    }

    const costData = SoftConstraintScorer.calculateCost(employee, shift);

    return {
      valid: true,
      cost: costData.cost,
      burden: costData.burden,
      hours: costData.hours
    };
  }

  findBestAssignments(timeSlots, availableEmployees, shiftDurationHours = 8) {
    const results = [];

    for (const slot of timeSlots) {
      const slotStart = slot.start instanceof Date ? slot.start : new Date(slot.start);
      const result = this.resolveGap(slotStart, availableEmployees, shiftDurationHours);
      results.push({
        slot,
        result
      });
    }

    return results;
  }
}

module.exports = SchedulerEngine;


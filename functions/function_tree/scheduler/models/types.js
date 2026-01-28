const Role = {
  PHARMACIST: 'PHARMACIST',
  ASSISTANT: 'ASSISTANT',
  APPRENTICE: 'APPRENTICE'
};

const ShiftType = {
  STANDARD: 'STANDARD',
  NIGHT: 'NIGHT',
  ON_CALL: 'ON_CALL'
};

function createEmployee(data) {
  return {
    id: data.id,
    role: data.role,
    contractTargetHours: data.contractTargetHours || 0,
    currentBalance: data.currentBalance || 0,
    preferredDays: data.preferredDays || [],
    shiftHistory: data.shiftHistory || []
  };
}

function createShift(data) {
  return {
    id: data.id,
    employeeId: data.employeeId,
    start: data.start instanceof Date ? data.start : new Date(data.start),
    end: data.end instanceof Date ? data.end : new Date(data.end),
    type: data.type || ShiftType.STANDARD
  };
}

function createTimeSlot(data) {
  return {
    start: data.start instanceof Date ? data.start : new Date(data.start),
    assignedStaff: data.assignedStaff || []
  };
}

module.exports = {
  Role,
  ShiftType,
  createEmployee,
  createShift,
  createTimeSlot
};


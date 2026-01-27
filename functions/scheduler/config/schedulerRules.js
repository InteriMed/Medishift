const RulesConfig = {
  constraints: {
    hard: {
      max_consecutive_days: 6,
      min_daily_rest_hours: 11,
      max_weekly_hours: 50,
      min_staff_per_slot: {
        pharmacist: 2,
        assistant: 1,
        total_active: 3
      }
    },
    soft: {
      weights: {
        standard: 1.0,
        saturday: 1.25,
        sunday: 1.5,
        night: 1.8,
        holiday: 2.0
      },
      penalties: {
        pattern_deviation: 2.0,
        split_shift: 5.0
      }
    }
  }
};

module.exports = { RulesConfig };


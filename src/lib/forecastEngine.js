/**
 * Forecasting Engine - projected grade, fail risk, late probability, trend direction.
 */

const getDate = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export function computeForecast(assignments = [], completionHistory = []) {
  const graded = assignments.filter(a => (a.status === 'Completed' || a.status === 'Submitted') && (typeof a.grade === 'number' || (typeof a.grade === 'string' && /^\d+$/.test(a.grade))));
  const gradeValues = graded.map(a => Number(a.grade)).filter(n => !isNaN(n));

  let projectedGrade = null;
  let failRiskPct = 0;
  let trendDirection = 'Stable';

  if (gradeValues.length >= 1) {
    const recent = gradeValues.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    projectedGrade = Math.round(avg);
    failRiskPct = avg < 50 ? Math.min(90, 50 + (50 - avg)) : Math.max(0, 30 - avg);
  }

  if (gradeValues.length >= 2) {
    const slope = gradeValues[gradeValues.length - 1] - gradeValues[gradeValues.length - 2];
    if (slope > 2) trendDirection = 'Upward';
    else if (slope < -2) trendDirection = 'Downward';
  }

  // Late probability - based on historical late rate in last 14 days
  const last14 = completionHistory.filter(c => {
    const d = new Date(c.date);
    const now = new Date();
    return (now - d) / 86400000 <= 14;
  });
  const totalDone = last14.length;
  const assignmentsFrom14Days = assignments.filter(a => {
    const due = new Date(a.dueDate);
    const now = new Date();
    return (now - due) / 86400000 <= 14 && (now - due) / 86400000 >= -7;
  });
  const completedWithLate = assignments.filter(a => {
    if (a.status !== 'Completed' && a.status !== 'Submitted') return false;
    const sub = a.submittedAt || a.dueDate;
    const due = a.dueDate;
    return sub > due;
  }).length;
  const lateRate = assignments.length > 0 ? completedWithLate / assignments.filter(a => a.status === 'Completed' || a.status === 'Submitted').length : 0;
  const lateProbability14Days = Math.round(lateRate * 100);

  return {
    projectedGrade,
    failRiskPct: Math.round(failRiskPct),
    lateProbability14Days,
    trendDirection,
  };
}

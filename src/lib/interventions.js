/**
 * Intervention Engine - recovery targets, corrective checklist, teacher logs.
 */

import { getInterventions, saveInterventions } from './platformData';

const getDate = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export function createRecoveryTarget(studentEmail, targetCompletionPct = 95, days = 7) {
  const interventions = getInterventions();
  const startDate = getDate(0);
  const endDate = getDate(days);
  const target = {
    id: `rec_${Date.now()}`,
    studentEmail,
    type: 'recovery',
    targetCompletionPct,
    targetDays: days,
    startDate,
    endDate,
    achievedCompletions: 0,
    requiredCompletions: Math.ceil(days * (targetCompletionPct / 100)),
    checklist: [
      { day: 1, done: false, date: getDate(0) },
      ...[...Array(days - 1)].map((_, i) => ({ day: i + 2, done: false, date: getDate(i + 1) })),
    ],
    createdAt: new Date().toISOString(),
  };
  interventions.push(target);
  saveInterventions(interventions);
  return target;
}

export function updateRecoveryProgress(studentEmail, completionsToday) {
  const interventions = getInterventions();
  const today = getDate(0);
  const active = interventions.find(
    i => i.studentEmail === studentEmail && i.type === 'recovery' && i.startDate <= today && i.endDate >= today
  );
  if (!active) return null;
  const dayIdx = active.checklist.findIndex(c => c.date === today);
  if (dayIdx >= 0 && completionsToday >= 1) {
    active.checklist[dayIdx].done = true;
    active.achievedCompletions = active.checklist.filter(c => c.done).length;
  }
  saveInterventions(interventions);
  return active;
}

export function logTeacherIntervention(studentEmail, teacherEmail, action, notes) {
  const interventions = getInterventions();
  interventions.push({
    id: `int_${Date.now()}`,
    studentEmail,
    teacherEmail,
    type: 'intervention_log',
    action,
    notes,
    date: getDate(0),
    createdAt: new Date().toISOString(),
  });
  saveInterventions(interventions);
}

export function getActiveRecoveryForStudent(studentEmail) {
  const today = getDate(0);
  return getInterventions().find(
    i => i.studentEmail === studentEmail && i.type === 'recovery' && i.startDate <= today && i.endDate >= today
  );
}

export function getInterventionsForStudent(studentEmail) {
  return getInterventions().filter(i => i.studentEmail === studentEmail);
}

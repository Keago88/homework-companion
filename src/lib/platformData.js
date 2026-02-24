/**
 * Platform data layer: schools, classes, roster, parent-child links, grades.
 * Uses localStorage for demo; replace with Firestore in production.
 */

const KEYS = {
  SCHOOLS: 'hwc_schools',
  USERS: 'hwc_users_ext',
  PARENT_LINKS: 'hwc_parent_links',
  RISK_HISTORY: 'hwc_risk_history',
  ALERTS: 'hwc_alerts',
  INTERVENTIONS: 'hwc_interventions',
};

const get = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch { return null; }
};

const set = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

export const getSchools = () => get(KEYS.SCHOOLS) || [];
export const saveSchools = (schools) => set(KEYS.SCHOOLS, schools);

export const getUsersExt = () => get(KEYS.USERS) || [];
export const saveUsersExt = (users) => set(KEYS.USERS, users);

export const getParentLinks = () => get(KEYS.PARENT_LINKS) || [];
export const saveParentLinks = (links) => set(KEYS.PARENT_LINKS, links);

export const getRiskHistory = () => get(KEYS.RISK_HISTORY) || [];
export const saveRiskHistory = (history) => set(KEYS.RISK_HISTORY, history);

export const getAlerts = () => get(KEYS.ALERTS) || [];
export const saveAlerts = (alerts) => set(KEYS.ALERTS, alerts);

export const getInterventions = () => get(KEYS.INTERVENTIONS) || [];
export const saveInterventions = (interventions) => set(KEYS.INTERVENTIONS, interventions);

// --- Schools & roster ---
export const createSchool = (name, adminEmail) => {
  const schools = getSchools();
  const id = `school_${Date.now()}`;
  schools.push({
    id,
    name,
    adminEmail,
    teachers: [],
    classes: [],
    riskThresholds: { low: 80, moderate: 60, high: 40 },
    createdAt: new Date().toISOString(),
  });
  saveSchools(schools);
  return id;
};

export const addTeacherToSchool = (schoolId, teacherEmail, teacherName) => {
  const schools = getSchools();
  const s = schools.find(x => x.id === schoolId);
  if (!s) return;
  if (!s.teachers.some(t => t.email === teacherEmail)) {
    s.teachers.push({ email: teacherEmail, name: teacherName });
    saveSchools(schools);
  }
};

export const addClassToSchool = (schoolId, className, teacherEmail) => {
  const schools = getSchools();
  const s = schools.find(x => x.id === schoolId);
  if (!s) return;
  const id = `class_${Date.now()}`;
  s.classes.push({ id, name: className, teacherEmail, studentEmails: [] });
  saveSchools(schools);
  return id;
};

export const addStudentToClass = (schoolId, classId, studentEmail, studentName) => {
  const schools = getSchools();
  const s = schools.find(x => x.id === schoolId);
  if (!s) return;
  const c = s.classes.find(x => x.id === classId);
  if (!c) return;
  if (!c.studentEmails.some(e => e.email === studentEmail)) {
    c.studentEmails.push({ email: studentEmail, name: studentName });
    saveSchools(schools);
  }
};

// --- Parent-child linking ---
export const generatePairingCode = (studentEmail) => {
  const code = `${(studentEmail || '').slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const links = getParentLinks();
  const existing = links.find(l => l.studentEmail === studentEmail);
  const entry = {
    studentEmail,
    code,
    parentEmails: existing?.parentEmails || [],
  };
  const rest = links.filter(l => l.studentEmail !== studentEmail);
  saveParentLinks([...rest, entry]);
  return code;
};

export const linkParentToStudent = (code, parentEmail) => {
  const links = getParentLinks();
  const link = links.find(l => l.code === code.toUpperCase().replace(/\s/g, ''));
  if (!link) return { ok: false, error: 'Code not found' };
  if (!link.parentEmails.includes(parentEmail)) {
    link.parentEmails = [...(link.parentEmails || []), parentEmail];
    saveParentLinks(links.map(l => (l.studentEmail === link.studentEmail ? link : l)));
  }
  return { ok: true, studentEmail: link.studentEmail };
};

export const getLinkedStudentsForParent = (parentEmail) => {
  return getParentLinks().filter(l => l.parentEmails?.includes(parentEmail)).map(l => l.studentEmail);
};

export const getPairingCodeForStudent = (studentEmail) => {
  return getParentLinks().find(l => l.studentEmail === studentEmail)?.code;
};

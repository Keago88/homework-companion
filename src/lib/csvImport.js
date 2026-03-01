/**
 * CSV import for assignments.
 * Expected columns: title, subject, dueDate (YYYY-MM-DD), status (optional), grade (optional)
 */

const getDate = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

export function parseAssignmentsCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { ok: false, error: 'Need header and at least one row', items: [] };
  const header = lines[0].toLowerCase();
  const cols = header.split(/,\s*/).map(c => c.trim());
  const titleIdx = cols.findIndex(c => c === 'title' || c === 'name');
  const subjectIdx = cols.findIndex(c => c === 'subject');
  const dueIdx = cols.findIndex(c => c === 'duedate' || c === 'due_date' || c === 'due');
  const statusIdx = cols.findIndex(c => c === 'status');
  const gradeIdx = cols.findIndex(c => c === 'grade');

  if (titleIdx < 0) return { ok: false, error: 'CSV must have a "title" column', items: [] };

  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const title = vals[titleIdx] || '';
    if (!title) continue;
    const subject = (subjectIdx >= 0 && vals[subjectIdx]) ? vals[subjectIdx] : 'Other';
    let dueDate = getDate(0);
    if (dueIdx >= 0 && vals[dueIdx]) {
      const raw = vals[dueIdx];
      if (/^\d{4}-\d{2}-\d{2}/.test(raw)) dueDate = raw.slice(0, 10);
      else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) { const [m, d, y] = raw.split(/[/-]/); dueDate = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
    }
    const status = (statusIdx >= 0 && vals[statusIdx]) ? (vals[statusIdx].toLowerCase().includes('complete') ? 'Completed' : 'Pending') : 'Pending';
    const grade = (gradeIdx >= 0 && vals[gradeIdx]) ? (parseInt(vals[gradeIdx], 10) || null) : null;
    items.push({
      id: Date.now() + i,
      title,
      subject,
      dueDate,
      status,
      grade,
      progress: status === 'Completed' ? 100 : 0,
      submittedAt: status === 'Completed' ? dueDate : null,
    });
  }
  return { ok: true, items };
}

/**
 * CSV import for schools/teachers/classes (admin).
 * Expected columns: schoolName, teacherEmail, teacherName, className (all optional except schoolName)
 */
export function parseSchoolsCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { ok: false, error: 'Need header and at least one row', created: 0, teachers: 0, classes: 0 };
  const header = lines[0].toLowerCase();
  const cols = header.split(/,\s*/).map(c => c.trim().replace(/\s+/g, ''));
  const schoolIdx = cols.findIndex(c => ['schoolname', 'school_name', 'school'].includes(c));
  const teacherEmailIdx = cols.findIndex(c => ['teacheremail', 'teacher_email', 'email'].includes(c));
  const teacherNameIdx = cols.findIndex(c => ['teachername', 'teacher_name', 'teacher'].includes(c));
  const classIdx = cols.findIndex(c => ['classname', 'class_name', 'class'].includes(c));

  if (schoolIdx < 0) return { ok: false, error: 'CSV must have a "schoolName" column', created: 0, teachers: 0, classes: 0 };

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const schoolName = vals[schoolIdx] || '';
    if (!schoolName) continue;
    const teacherEmail = (teacherEmailIdx >= 0 && vals[teacherEmailIdx]) ? vals[teacherEmailIdx] : '';
    const teacherName = (teacherNameIdx >= 0 && vals[teacherNameIdx]) ? vals[teacherNameIdx] : teacherEmail;
    const className = (classIdx >= 0 && vals[classIdx]) ? vals[classIdx] : '';
    rows.push({ schoolName, teacherEmail, teacherName, className });
  }
  return { ok: true, rows };
}

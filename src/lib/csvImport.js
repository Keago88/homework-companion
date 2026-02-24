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

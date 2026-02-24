/**
 * Google Classroom integration.
 * Fetches courses and coursework using a Google OAuth access token.
 * Used when user clicks "Import from Google Classroom" in Settings.
 *
 * Setup: Create a Google Cloud project, enable Classroom API,
 * create OAuth 2.0 Web client, add to .env as VITE_GOOGLE_CLIENT_ID
 */

const CLASSROOM_API = 'https://classroom.googleapis.com/v1';

export async function fetchCourses(accessToken) {
  const res = await fetch(`${CLASSROOM_API}/courses?courseStates=ACTIVE`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Could not fetch courses');
  const data = await res.json();
  return data.courses || [];
}

export async function fetchCourseworkForCourse(accessToken, courseId) {
  const res = await fetch(
    `${CLASSROOM_API}/courses/${courseId}/courseWork`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.courseWork || [];
}

export async function fetchStudentSubmissions(accessToken, courseId, courseworkId) {
  const res = await fetch(
    `${CLASSROOM_API}/courses/${courseId}/courseWork/${courseworkId}/studentSubmissions`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.studentSubmissions || [];
}

/**
 * Fetch all coursework for all active courses and convert to our assignment format.
 */
export async function fetchAllCoursework(accessToken) {
  const courses = await fetchCourses(accessToken);
  const assignments = [];
  for (const course of courses) {
    const coursework = await fetchCourseworkForCourse(accessToken, course.id);
    for (const cw of coursework) {
      const dueDate = cw.dueDate
        ? `${String(cw.dueDate.year).padStart(4, '0')}-${String(cw.dueDate.month).padStart(2, '0')}-${String(cw.dueDate.day).padStart(2, '0')}`
        : null;
      assignments.push({
        id: `gc_${course.id}_${cw.id}`,
        title: cw.title || 'Untitled',
        subject: course.name || 'Other',
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        priority: 'Medium',
        status: 'Pending',
        progress: 0,
        description: cw.description || '',
        grade: null,
        category: 'Homework',
        source: 'google_classroom',
      });
    }
  }
  return assignments;
}

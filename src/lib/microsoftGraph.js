/**
 * Microsoft Graph integration for schools using Microsoft 365.
 * Fetches user, schools, and classes using Microsoft OAuth access token.
 *
 * Setup: Create an Azure AD app registration, add redirect URI,
 * grant User.Read, Schools.Read.All (admin consent for org) or
 * EducationAssignments.ReadBasic (for student assignments).
 * Add to .env: VITE_MICROSOFT_CLIENT_ID, VITE_MICROSOFT_TENANT_ID (or 'common')
 */

const GRAPH_API = 'https://graph.microsoft.com/v1.0';

export async function fetchMe(accessToken) {
  const res = await fetch(`${GRAPH_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Could not fetch user');
  return res.json();
}

export async function fetchMyClasses(accessToken) {
  const res = await fetch(`${GRAPH_API}/education/me/classes`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.value || [];
}

export async function fetchAssignmentsForClass(accessToken, classId) {
  const res = await fetch(
    `${GRAPH_API}/education/classes/${classId}/assignments`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.value || [];
}

/**
 * Fetch all assignments from all classes and convert to our format.
 */
export async function fetchAllAssignments(accessToken) {
  const classes = await fetchMyClasses(accessToken);
  const assignments = [];
  for (const cls of classes) {
    const edAssignments = await fetchAssignmentsForClass(accessToken, cls.id);
    for (const a of edAssignments) {
      const dueDateTime = a.dueDateTime ? new Date(a.dueDateTime.dateTime) : new Date();
      const dueStr = dueDateTime.toISOString().split('T')[0];
      assignments.push({
        id: `ms_${cls.id}_${a.id}`,
        title: a.displayName || 'Untitled',
        subject: cls.displayName || 'Other',
        dueDate: dueStr,
        priority: 'Medium',
        status: 'Pending',
        progress: 0,
        description: a.instructions?.content || '',
        grade: null,
        category: 'Homework',
        source: 'microsoft_365',
      });
    }
  }
  return assignments;
}

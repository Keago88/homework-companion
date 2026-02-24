import React, { useState, useMemo, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle2,
  BookOpen,
  Calculator,
  Trash2,
  Filter,
  X,
  Settings,
  Home,
  User,
  GraduationCap,
  Users,
  ArrowLeft,
  Mail,
  Lock,
  User as UserIcon,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Camera,
  Check,
  Menu,
  History,
  RefreshCw,
  Flame,
  Zap,
  Target,
  Sparkles,
  MessageSquare,
  LayoutGrid,
  TrendingUp,
  BarChart2,
  PieChart,
  Building2,
  Upload,
  Download
} from 'lucide-react';
import { getSubscriptionStatus, initiateProCheckout, verifyPayment } from './services/subscription';
import * as platformData from './lib/platformData';
import { computeRiskScore, getRiskBand } from './lib/riskEngine';
import { computeForecast } from './lib/forecastEngine';
import { checkAlertTriggers, getUnreadAlertsForUser, markAlertRead } from './lib/alerts';
import { createRecoveryTarget, getActiveRecoveryForStudent, logTeacherIntervention, updateRecoveryProgress } from './lib/interventions';
import { parseAssignmentsCSV } from './lib/csvImport';
import { fetchAllCoursework } from './lib/googleClassroom';
import { getGoogleClassroomToken } from './lib/oauthIntegration';

// --- Firebase Initialization (optional - works in demo mode without valid config) ---
let auth = null;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
  if (firebaseConfig?.apiKey && firebaseConfig.apiKey !== 'demo-api-key') {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    getFirestore(app);
  }
} catch (e) {
  console.warn('Firebase unavailable, running in demo mode');
}

// --- Global Styles & Wallpapers ---
const noScrollbarStyles = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

  /* Dynamic Wallpapers */
  .wallpaper-auth {
    background-image: url('https://images.unsplash.com/photo-1557672172-298e090bd0f1?q=80&w=2000&auto=format&fit=crop');
    background-size: cover;
    background-position: center;
  }

  .wallpaper-overview {
    background-image: url('https://images.unsplash.com/photo-1523821741446-edb2b68bb7a0?q=80&w=2000&auto=format&fit=crop');
    background-size: cover;
    background-position: center;
  }

  .wallpaper-planner {
    background-image: url('https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2000&auto=format&fit=crop');
    background-size: cover;
    background-position: center;
  }
  .wallpaper-planner::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px);
    background-size: 20px 20px;
    pointer-events: none;
  }

  .wallpaper-settings {
    background-image: url('https://images.unsplash.com/photo-1614850523060-8da1d56ae167?q=80&w=2000&auto=format&fit=crop');
    background-size: cover;
    background-position: center;
  }

  /* Glassmorphism Utilities */
  .glass-panel {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.5);
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.4);
  }

  @keyframes blob {
    0% { transform: translate(0px, 0px) scale(1); }
    33% { transform: translate(30px, -50px) scale(1.1); }
    66% { transform: translate(-20px, 20px) scale(0.9); }
    100% { transform: translate(0px, 0px) scale(1); }
  }
  .animate-blob {
    animation: blob 7s infinite;
  }
  .animation-delay-2000 { animation-delay: 2s; }
  .animation-delay-4000 { animation-delay: 4s; }
`;

// --- Local auth helpers (demo mode when Firebase not configured) ---
const DEMO_USERS_KEY = 'homework_companion_users';
const PROFILE_STORAGE_KEY = 'homework_companion_profile';
const ANALYTICS_HISTORY_KEY = 'homework_companion_analytics';
const MAX_ANALYTICS_DAYS = 90;

const getCompletionHistory = (userKey) => {
  try {
    const raw = localStorage.getItem(ANALYTICS_HISTORY_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const key = userKey || '_default';
    const comp = data[key]?.completions ?? data.completions ?? [];
    return Array.isArray(comp) ? comp : [];
  } catch { return []; }
};

const logCompletion = (assignment, userKey) => {
  try {
    const key = userKey || '_default';
    const raw = localStorage.getItem(ANALYTICS_HISTORY_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const byKey = data[key] || { completions: [] };
    byKey.completions = [...(byKey.completions || []), { date: getDate(0), subject: assignment.subject || 'Other', title: assignment.title }].slice(-500);
    data[key] = byKey;
    if (!data._default && key !== '_default') data._default = { completions: [] };
    localStorage.setItem(ANALYTICS_HISTORY_KEY, JSON.stringify(data));
  } catch {}
};
const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem(DEMO_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const storeUser = (user) => {
  const users = getStoredUsers();
  const existing = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (existing >= 0) users[existing] = user;
  else users.push(user);
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
};
const findUserByCredentials = (email, password) => {
  const users = getStoredUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
};

// --- Configuration & Mock Data ---
const ROLES = { STUDENT: 'Student', PARENT: 'Parent', TEACHER: 'Teacher', ADMIN: 'Admin' };
const TABS = { OVERVIEW: 'Overview', HOMEWORK: 'Homework', ANALYTICS: 'Analytics', SCHOOL: 'School', SETTINGS: 'Settings' };

const ROLE_COPY = {
  [ROLES.STUDENT]: {
    welcome: 'Welcome back',
    status: 'All set! Ready to learn.',
    navHome: 'Home',
    navHomework: 'My homework',
    navStats: 'My stats',
    navSettings: 'Settings',
    homeworkTitle: 'My homework',
    addHomework: 'Add homework',
    addHomeworkModal: 'Add homework',
    assignmentLabel: 'What is it?',
    assignmentPlaceholder: 'e.g. Math problems, Read chapter 3',
    notesLabel: 'Notes (optional)',
    notesPlaceholder: 'Add any details...',
    homeworkDetails: 'Homework details',
    completeBtn: 'I did it!',
    focusLabel: 'What to do now',
    recentLabel: 'What you did',
    comingUpLabel: 'Coming up',
    allCaughtUp: 'All caught up! 🎉',
    noHomework: 'No homework here.',
    emptyComingUp: 'Nothing due soon.',
    profileTitle: 'Edit profile',
    profileDesc: 'Change your picture and name',
    schoolPlaceholder: 'Your school',
    namePlaceholder: 'Your name',
    studyTimeLabel: 'Study time',
    quickActions: 'Quick actions',
    filterBy: 'Filter by subject',
    noTasks: 'No homework here.',
    analyticsTitle: 'My stats',
  },
  [ROLES.TEACHER]: {
    welcome: 'Class dashboard',
    status: 'Manage assignments and student progress.',
    navHome: 'Dashboard',
    navHomework: 'Assignments',
    navStats: 'Class analytics',
    navSettings: 'Settings',
    homeworkTitle: 'Assignments',
    addHomework: 'Create assignment',
    addHomeworkModal: 'Create assignment',
    assignmentLabel: 'Assignment title',
    assignmentPlaceholder: 'e.g. Chapter 4 Reading, Lab Report',
    notesLabel: 'Instructions (optional)',
    notesPlaceholder: 'Add instructions for students...',
    homeworkDetails: 'Assignment details',
    completeBtn: 'Mark complete',
    focusLabel: 'Priority task',
    recentLabel: 'Recent activity',
    comingUpLabel: 'Upcoming',
    allCaughtUp: 'All clear.',
    noHomework: 'No assignments yet.',
    emptyComingUp: 'Nothing upcoming.',
    profileTitle: 'Teacher profile',
    profileDesc: 'Update your account',
    schoolPlaceholder: 'School / institution',
    namePlaceholder: 'Your name',
    studyTimeLabel: 'Session time',
    quickActions: 'Quick actions',
    filterBy: 'Filter by subject',
    noTasks: 'No assignments.',
    analyticsTitle: 'Class analytics',
  },
  [ROLES.PARENT]: {
    welcome: 'Your child\'s progress',
    status: 'Track progress and support learning.',
    navHome: 'Overview',
    navHomework: 'Child\'s homework',
    navStats: 'Progress & stats',
    navSettings: 'Settings',
    homeworkTitle: 'Assignments',
    addHomework: 'Add task',
    addHomeworkModal: 'Add task',
    assignmentLabel: 'Task title',
    assignmentPlaceholder: 'e.g. Practice spelling',
    notesLabel: 'Notes (optional)',
    notesPlaceholder: 'Any notes...',
    homeworkDetails: 'Assignment details',
    completeBtn: 'Mark done',
    focusLabel: 'Current focus',
    recentLabel: 'Recent activity',
    comingUpLabel: 'Coming up',
    allCaughtUp: 'All done! 🎉',
    noHomework: 'No assignments.',
    emptyComingUp: 'Nothing due soon.',
    profileTitle: 'Parent profile',
    profileDesc: 'Update your account',
    schoolPlaceholder: 'School (optional)',
    namePlaceholder: 'Your name',
    studyTimeLabel: 'Session',
    quickActions: 'Actions',
    filterBy: 'Filter by subject',
    noTasks: 'No assignments.',
    analyticsTitle: 'Progress & stats',
  },
  [ROLES.ADMIN]: {
    welcome: 'School admin',
    status: 'Manage your school.',
    navHome: 'Dashboard',
    navHomework: 'Assignments',
    navStats: 'Analytics',
    navSettings: 'Settings',
    profileTitle: 'Admin profile',
    profileDesc: 'Account settings',
    schoolPlaceholder: 'School name',
    namePlaceholder: 'Name',
  },
};
const getCopy = (role) => ROLE_COPY[role] || ROLE_COPY[ROLES.STUDENT];
const HW_FILTERS = { OVERDUE: 'Overdue', DUE: 'Due', COMPLETED: 'Completed' };
const DEFAULT_SUBJECTS = ['Math', 'Science', 'History', 'English', 'Art', 'Coding'];

const getDate = (daysOffset) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const ASSIGNMENTS_STORAGE_KEY = 'hwc_assignments';
const getStoredAssignments = (userKey) => {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    return data[userKey] || null;
  } catch { return null; }
};
const saveStoredAssignments = (userKey, list) => {
  try {
    const raw = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[userKey] = list;
    localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

const INITIAL_ASSIGNMENTS = [
  { id: 1, category: 'Self-Study', title: "Finish Physics Lab", subject: "Science", dueDate: getDate(-1), priority: "High", status: "Pending", progress: 65, description: "Need to finish the data analysis part.", grade: null },
  { id: 2, category: 'Homework', title: "Read Chapter 4", subject: "English", dueDate: getDate(0), priority: "Medium", status: "Pending", progress: 20, description: "Read The Great Gatsby chapter 4 and take notes.", grade: null },
  { id: 3, category: 'Project', title: "History Presentation", subject: "History", dueDate: getDate(2), priority: "High", status: "Pending", progress: 5, description: "Prepare slides for the Roman Empire presentation.", grade: null },
];

const getAssignmentProgress = (a) => (a.status === 'Completed' || a.status === 'Submitted') ? 100 : (a.progress ?? 0);

const HISTORY_MOCK = [
  { id: 101, title: "Completed Math Set", type: "success", time: "2 hours ago" },
  { id: 102, title: "Added new task", type: "info", time: "5 hours ago" },
  { id: 103, title: "Study Goal Reached", type: "success", time: "Yesterday" }
];

const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free', price: 0, features: ['1 User', 'Basic Task Tracking', '200 MB Storage'] },
  { id: 'pro', name: 'Pro', price: 15, features: ['Everything in Free', '15 GB Storage', 'Advanced Stats', 'Priority Support'] }
];

// --- Helper Components ---
const AuthScreen = ({ onLogin, isLoading, useFirebase }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: ROLES.STUDENT });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    if (!useFirebase || !auth) return;
    setError("");
    setSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
      provider.addScope('https://www.googleapis.com/auth/classroom.coursework.me.readonly');
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const stored = getStoredUsers().find(u => u.email?.toLowerCase() === user.email?.toLowerCase());
      const role = stored?.role || ROLES.STUDENT;
      if (!stored) storeUser({ email: user.email, name: user.displayName || user.email?.split('@')[0] || 'User', role });
      onLogin({ name: user.displayName || user.email?.split('@')[0] || 'User', role, email: user.email });
    } catch (err) {
      setError(err?.message || 'Google sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!useFirebase || !auth) return;
    setError("");
    setSubmitting(true);
    try {
      const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common';
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({ tenant: tenantId });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const stored = getStoredUsers().find(u => u.email?.toLowerCase() === user.email?.toLowerCase());
      const role = stored?.role || ROLES.STUDENT;
      if (!stored) storeUser({ email: user.email, name: user.displayName || user.email?.split('@')[0] || 'User', role });
      onLogin({ name: user.displayName || user.email?.split('@')[0] || 'User', role, email: user.email });
    } catch (err) {
      setError(err?.message || 'Microsoft sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isSignUp) {
        if (!formData.name?.trim() || !formData.email?.trim() || !formData.password?.trim()) {
          setError("Please fill in all fields.");
          return;
        }
        if (formData.password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        if (useFirebase && auth) {
          const { user } = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
          storeUser({ email: formData.email.trim(), name: formData.name.trim(), role: formData.role, uid: user.uid });
          onLogin({ name: formData.name.trim(), role: formData.role, email: formData.email.trim() });
        } else {
          const users = getStoredUsers();
          if (users.some(u => u.email.toLowerCase() === formData.email.trim().toLowerCase())) {
            setError("An account with this email already exists. Sign in instead.");
            return;
          }
          storeUser({ email: formData.email.trim(), password: formData.password, name: formData.name.trim(), role: formData.role });
          onLogin({ name: formData.name.trim(), role: formData.role, email: formData.email.trim() });
        }
      } else {
        if (!formData.email?.trim() || !formData.password?.trim()) {
          setError("Please enter your email and password.");
          return;
        }
        if (useFirebase && auth) {
          await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
          const stored = getStoredUsers().find(u => u.email?.toLowerCase() === formData.email.trim().toLowerCase());
          onLogin({ name: stored?.name || "User", role: stored?.role || ROLES.STUDENT, email: stored?.email });
        } else {
          const found = findUserByCredentials(formData.email.trim(), formData.password);
          if (!found) {
            setError("Invalid email or password.");
            return;
          }
          onLogin({ name: found.name, role: found.role, email: found.email });
        }
      }
    } catch (err) {
      const msg = err?.code === 'auth/email-already-in-use' ? 'An account with this email already exists.' :
        err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' ? 'Invalid email or password.' :
        err?.message || 'Something went wrong.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen wallpaper-auth flex items-center justify-center p-4 relative overflow-y-auto overflow-x-hidden text-slate-800 transition-all duration-700">
      <style>{noScrollbarStyles}</style>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-20 right-20 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-48 h-48 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="glass-panel rounded-[32px] shadow-2xl relative w-full max-w-[800px] min-h-[550px] flex shrink-0 z-10 my-8 overflow-hidden">
        {/* Sign-up form - slides from left to right when active */}
        <div className={`absolute inset-y-0 left-0 w-1/2 flex flex-col items-center justify-center p-8 transition-all duration-700 ease-in-out z-20 ${isSignUp ? 'translate-x-[100%] opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600 mb-2">Join us</h1>
          <p className="text-xs text-slate-500 mb-6 text-center font-medium">Make an account to get started.</p>
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-violet-400 transition-all">
              <UserIcon size={18} className="text-violet-400" />
              <input type="text" placeholder="First Name" className="bg-transparent outline-none flex-1 text-sm font-bold text-slate-700 placeholder:text-slate-400" value={formData.name} onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))} required />
            </div>
            <div className="w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">I am a</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[ROLES.STUDENT, ROLES.PARENT, ROLES.TEACHER, ROLES.ADMIN].map(r => (
                  <button key={r} type="button" onClick={() => setFormData(prev => ({...prev, role: r}))} className={`flex items-center justify-center min-h-[44px] py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider border-2 transition-all shadow-sm w-full ${formData.role === r ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-transparent bg-white/50 text-slate-400 hover:bg-white'}`}>{r}</button>
                ))}
              </div>
            </div>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm">
              <Mail size={18} className="text-violet-400" />
              <input type="email" placeholder="Email Address" className="bg-transparent outline-none flex-1 text-sm font-medium" value={formData.email} onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} required />
            </div>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm">
              <Lock size={18} className="text-violet-400" />
              <input type="password" placeholder="Password (at least 6 letters)" className="bg-transparent outline-none flex-1 text-sm font-medium" value={formData.password} onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))} required minLength={6} />
            </div>
            {error && <p className="text-rose-600 text-xs font-bold">{error}</p>}
            <button type="submit" disabled={isLoading || submitting} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-xs mt-2 disabled:opacity-50 transition-all hover:scale-[1.02] shadow-lg shadow-violet-200">
              {submitting ? 'Creating...' : 'Create account'}
            </button>
          </form>
        </div>

        {/* Sign-in form - on left when active, slides out when sign-up active */}
        <div className={`absolute inset-y-0 left-0 w-1/2 flex flex-col items-center justify-center p-8 transition-all duration-700 ease-in-out z-20 ${isSignUp ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600 mb-2">Welcome back</h1>
          <p className="text-xs text-slate-500 mb-8 font-medium">Sign in to keep going.</p>
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm">
              <Mail size={18} className="text-violet-400" />
              <input type="email" placeholder="Email" className="bg-transparent outline-none flex-1 text-sm font-medium" value={formData.email} onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))} required />
            </div>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm">
              <Lock size={18} className="text-violet-400" />
              <input type="password" placeholder="Password" className="bg-transparent outline-none flex-1 text-sm font-medium" value={formData.password} onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))} required />
            </div>
            {error && <p className="text-rose-600 text-xs font-bold">{error}</p>}
            <button type="submit" disabled={isLoading || submitting} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-xs mt-2 disabled:opacity-50 transition-all hover:scale-[1.02] shadow-lg shadow-violet-200">
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
            {useFirebase && auth && (
              <div className="mt-6 space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Or sign in with</p>
                <div className="flex gap-2">
                  <button type="button" onClick={handleGoogleSignIn} disabled={isLoading || submitting} className="flex-1 py-3 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Google
                  </button>
                  <button type="button" onClick={handleMicrosoftSignIn} disabled={isLoading || submitting} className="flex-1 py-3 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#F25022" d="M1 1h10v10H1z"/><path fill="#00A4EF" d="M1 13h10v10H1z"/><path fill="#7FBA00" d="M13 1h10v10H13z"/><path fill="#FFB900" d="M13 13h10v10H13z"/></svg>
                    Microsoft
                  </button>
                </div>
              </div>
            )}
          </form>
          <button type="button" onClick={() => { setIsSignUp(true); setError(""); }} className="text-xs font-bold text-violet-400 hover:text-violet-600 mt-6 transition-colors">New here? Create account</button>
        </div>

        {/* Gradient overlay - on right when sign-in, slides left when sign-up; z-10 so forms (z-20) stay clickable */}
        <div className={`absolute inset-y-0 right-0 w-1/2 overflow-hidden transition-transform duration-700 ease-in-out z-10 ${isSignUp ? '-translate-x-full' : 'translate-x-0'}`}>
          <div className={`absolute inset-0 w-[200%] flex transition-transform duration-700 ease-in-out ${isSignUp ? 'translate-x-0' : '-translate-x-1/2'}`}>
            <div className="w-1/2 h-full bg-gradient-to-br from-violet-600 to-fuchsia-700 flex flex-col items-center justify-center px-12 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm"><Sparkles size={40} className="text-yellow-300" /></div>
              <h2 className="text-3xl font-black text-white mb-3">Hello!</h2>
              <p className="text-white/90 text-sm mb-8 leading-relaxed">Put in your name and make an account to start.</p>
              <button type="button" onClick={() => { setIsSignUp(false); setError(""); }} className="border-2 border-white/50 bg-white/10 backdrop-blur-md text-white px-10 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-white hover:text-violet-600 transition-all">Sign in</button>
            </div>
            <div className="w-1/2 h-full bg-gradient-to-br from-violet-600 to-fuchsia-700 flex flex-col items-center justify-center px-12 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm"><Target size={40} className="text-cyan-300" /></div>
              <h2 className="text-3xl font-black text-white mb-3">Welcome back!</h2>
              <p className="text-white/90 text-sm mb-8 leading-relaxed">Sign in with your email and password.</p>
              <button type="button" onClick={() => { setIsSignUp(true); setError(""); }} className="border-2 border-white/50 bg-white/10 backdrop-blur-md text-white px-10 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-white hover:text-violet-600 transition-all">Sign up</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SchoolDashboard = ({ schools, onRefresh }) => {
  const [newSchoolName, setNewSchoolName] = useState('');
  const [addTeacherFor, setAddTeacherFor] = useState(null);
  const [addClassFor, setAddClassFor] = useState(null);
  const [teacherForm, setTeacherForm] = useState({ email: '', name: '' });
  const [classForm, setClassForm] = useState({ name: '', teacherEmail: '' });

  const handleCreate = () => {
    if (!newSchoolName.trim()) return;
    platformData.createSchool(newSchoolName.trim(), 'admin@school.com');
    setNewSchoolName('');
    onRefresh?.();
  };

  const handleAddTeacher = () => {
    if (!addTeacherFor || !teacherForm.email?.trim()) return;
    platformData.addTeacherToSchool(addTeacherFor.id, teacherForm.email.trim(), (teacherForm.name || teacherForm.email).trim());
    setAddTeacherFor(null);
    setTeacherForm({ email: '', name: '' });
    onRefresh?.();
  };

  const handleAddClass = () => {
    if (!addClassFor || !classForm.name?.trim()) return;
    platformData.addClassToSchool(addClassFor.id, classForm.name.trim(), classForm.teacherEmail?.trim() || null);
    setAddClassFor(null);
    setClassForm({ name: '', teacherEmail: '' });
    onRefresh?.();
  };

  return (
    <div className="space-y-6 text-slate-800 animate-in fade-in">
      <div className="glass-panel px-4 py-2 rounded-xl inline-block"><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Building2 size={28} className="text-violet-500" /> School Management</h2></div>
      <div className="glass-card p-6 rounded-3xl">
        <h3 className="font-bold text-slate-800 text-lg mb-4">Create school</h3>
        <div className="flex gap-2">
          <input value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} placeholder="School name" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-medium" />
          <button onClick={handleCreate} className="px-6 py-3 bg-violet-500 text-white font-bold rounded-xl">Create</button>
        </div>
      </div>
      <div className="space-y-4">
        {schools.map(s => (
          <div key={s.id} className="glass-card p-6 rounded-3xl">
            <h4 className="font-bold text-lg text-slate-800">{s.name}</h4>
            <p className="text-xs text-slate-500 mb-3">{s.teachers?.length || 0} teachers • {s.classes?.length || 0} classes</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setAddTeacherFor(s); setTeacherForm({ email: '', name: '' }); }} className="px-3 py-1.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-lg hover:bg-violet-200 transition-colors">Add teacher</button>
              <button onClick={() => { setAddClassFor(s); setClassForm({ name: '', teacherEmail: (s.teachers?.[0]?.email) || '' }); }} className="px-3 py-1.5 bg-violet-100 text-violet-700 text-xs font-bold rounded-lg hover:bg-violet-200 transition-colors">Add class</button>
            </div>
          </div>
        ))}
      </div>

      {addTeacherFor && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Add teacher to {addTeacherFor.name}</h3>
              <button onClick={() => { setAddTeacherFor(null); setTeacherForm({ email: '', name: '' }); }} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Email</label>
                <input type="email" value={teacherForm.email} onChange={(e) => setTeacherForm(f => ({ ...f, email: e.target.value }))} placeholder="teacher@school.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Name (optional)</label>
                <input type="text" value={teacherForm.name} onChange={(e) => setTeacherForm(f => ({ ...f, name: e.target.value }))} placeholder="Teacher name" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setAddTeacherFor(null); setTeacherForm({ email: '', name: '' }); }} className="flex-1 py-3 text-slate-500 font-bold rounded-xl">Cancel</button>
              <button onClick={handleAddTeacher} disabled={!teacherForm.email?.trim()} className="flex-1 py-3 bg-violet-500 text-white font-bold rounded-xl disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}

      {addClassFor && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Add class to {addClassFor.name}</h3>
              <button onClick={() => { setAddClassFor(null); setClassForm({ name: '', teacherEmail: '' }); }} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Class name</label>
                <input type="text" value={classForm.name} onChange={(e) => setClassForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Math 101, Period 3" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Teacher email (optional)</label>
                <input type="email" value={classForm.teacherEmail} onChange={(e) => setClassForm(f => ({ ...f, teacherEmail: e.target.value }))} placeholder="teacher@school.com" className="w-full px-4 py-3 rounded-xl border border-slate-200 font-medium outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setAddClassFor(null); setClassForm({ name: '', teacherEmail: '' }); }} className="flex-1 py-3 text-slate-500 font-bold rounded-xl">Cancel</button>
              <button onClick={handleAddClass} disabled={!classForm.name?.trim()} className="flex-1 py-3 bg-violet-500 text-white font-bold rounded-xl disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ParentLinkInput = ({ onLink }) => {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const handle = () => {
    setErr('');
    const r = onLink(code);
    if (!r.ok) setErr(r.error || 'Invalid code');
  };
  return (
    <div className="flex gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. TEST-1234" className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium" />
      <button onClick={handle} className="px-4 py-2 bg-violet-500 text-white font-bold rounded-xl text-sm">Link</button>
      {err && <p className="text-rose-600 text-xs">{err}</p>}
    </div>
  );
};

const FloatingNavItem = ({ icon: Icon, label, isActive, onClick, badgeCount, badgeColor = "bg-rose-500" }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-2xl min-w-[60px] transition-all ${isActive ? 'text-violet-600 bg-violet-50' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}>
    <div className="relative">
      <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      {badgeCount > 0 && (
        <span className={`absolute -top-1.5 -right-1.5 ${badgeColor} text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-sm`}>
          {badgeCount}
        </span>
      )}
    </div>
    <span className="text-[10px] font-bold mt-1">{label}</span>
  </button>
);

// --- Main Application ---
export default function App() {
  const [user, setUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);

  const [assignments, setAssignments] = useState(INITIAL_ASSIGNMENTS);
  const [recentHistory, setRecentHistory] = useState(HISTORY_MOCK);
  const [hwFilter, setHwFilter] = useState(HW_FILTERS.DUE);

  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [profileData, setProfileData] = useState({ name: '', grade: '', school: '', favoriteSubject: '', email: '', gamificationLevel: 'simple' });
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterSubject, setFilterSubject] = useState('All');

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [teacherCommentDraft, setTeacherCommentDraft] = useState('');
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', subject: 'Math', dueDate: '', priority: 'Medium', description: '' });
  const [viewMode, setViewMode] = useState('list');
  const [homeworkLayout, setHomeworkLayout] = useState('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getDate(0));

  const [studyStreak, setStudyStreak] = useState(12);
  const [pairingCode, setPairingCode] = useState("");
  const [linkedStudents, setLinkedStudents] = useState([]);
  const [selectedChildEmail, setSelectedChildEmail] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [schoolsRefresh, setSchoolsRefresh] = useState(0);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isGoogleClassroomImporting, setIsGoogleClassroomImporting] = useState(false);
  const [integrationMessage, setIntegrationMessage] = useState(null);
  const [csvImportText, setCsvImportText] = useState('');
  const [localTime, setLocalTime] = useState('');
  const [sessionTime, setSessionTime] = useState('00:00:00');
  const sessionStartRef = useRef(Date.now());

  const profileImageInputRef = useRef(null);
  const assignmentFileInputRef = useRef(null);
  const csvFileInputRef = useRef(null);

  const motivationalQuote = useMemo(() => {
    const quotes = [
      "Small steps count. Keep going!",
      "You can do it!",
      "Keep going. You're doing great!",
      "Little by little adds up.",
      "Just start. That's the hardest part.",
      "Do one thing at a time.",
      "You are doing your best.",
      "It's okay to make mistakes. Try again!",
      "Take a deep breath. You got this!",
      "Keep trying. You're learning."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLocalTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setSessionTime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const getBackgroundClass = () => {
    switch(activeTab) {
      case TABS.OVERVIEW: return 'wallpaper-overview';
      case TABS.HOMEWORK: return 'wallpaper-planner';
      case TABS.ANALYTICS: return 'wallpaper-overview';
      case TABS.SCHOOL: return 'wallpaper-settings';
      case TABS.SETTINGS: return 'wallpaper-settings';
      default: return 'wallpaper-overview';
    }
  };

  const subscriptionUserId = profileData.email || appUser?.name || 'anonymous';
  const currentUserKey = profileData.email || appUser?.name || 'anonymous';
  const viewingStudentKey = appUser?.role === ROLES.PARENT ? selectedChildEmail : currentUserKey;
  const copy = getCopy(appUser?.role || ROLES.STUDENT);
  const displayAssignments = assignments;

  useEffect(() => {
    if (appUser?.role === ROLES.PARENT && selectedChildEmail) {
      saveStoredAssignments(selectedChildEmail, assignments);
    } else if (currentUserKey && appUser?.role !== ROLES.PARENT) {
      saveStoredAssignments(currentUserKey, assignments);
    }
  }, [assignments, currentUserKey, appUser?.role, selectedChildEmail]);

  useEffect(() => {
    if (appUser?.role === ROLES.PARENT) {
      if (selectedChildEmail) {
        const stored = getStoredAssignments(selectedChildEmail);
        setAssignments(stored && stored.length > 0 ? stored : INITIAL_ASSIGNMENTS.map(a => ({ ...a, grade: null })));
      } else {
        setAssignments([]);
      }
    }
  }, [selectedChildEmail, appUser?.role]);

  useEffect(() => {
    const userKey = appUser?.role === ROLES.PARENT ? selectedChildEmail : currentUserKey;
    if (!userKey) return;
    const as = appUser?.role === ROLES.PARENT ? getStoredAssignments(selectedChildEmail) || [] : assignments;
    const completions = getCompletionHistory(userKey);
    const rec = getActiveRecoveryForStudent(userKey);
    const hist = platformData.getRiskHistory();
    const prevEntry = hist.filter(h => h.userKey === userKey && h.date !== getDate(0)).sort((a, b) => b.date.localeCompare(a.date))[0];
    const prevRisk = prevEntry?.score;
    const streak = (() => {
      let s = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        if (completions.some(c => c.date === ds)) s++;
        else break;
      }
      return s;
    })();
    const score = computeRiskScore({
      assignments: as,
      completionHistory: completions,
      streak,
      recoveryTarget: rec ? { targetCompletion: rec.requiredCompletions, achieved: rec.achievedCompletions } : null,
    });
    const fore = computeForecast(as, completions);
    setRiskScore(score);
    setForecast(fore);
    const rest = hist.filter(h => h.userKey !== userKey || h.date !== getDate(0));
    platformData.saveRiskHistory([...rest, { userKey, score, date: getDate(0) }]);
    checkAlertTriggers({ studentEmail: userKey, currentRisk: score, previousRisk: prevRisk, assignments: as, gradeSlope: fore?.trendDirection === 'Downward' ? -15 : null });
    setAlerts(getUnreadAlertsForUser(profileData.email, linkedStudents, appUser?.role));
  }, [assignments, selectedChildEmail, appUser?.role, currentUserKey]);

  useEffect(() => {
    if (!appUser) return;
    getSubscriptionStatus(subscriptionUserId).then(({ plan }) => setSubscriptionPlan(plan));
  }, [appUser?.name, subscriptionUserId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('tid') || params.get('transaction_id');
    if (tid && appUser) {
      verifyPayment(tid, subscriptionUserId).then(({ ok }) => {
        if (ok) setSubscriptionPlan('pro');
        window.history.replaceState({}, '', window.location.pathname);
      });
    }
  }, [appUser?.name]);

  const handleConfirmPlan = async () => {
    if (selectedPlan === 'free') {
      setIsSubscriptionOpen(false);
      return;
    }
    setCheckoutLoading(true);
    try {
      const result = await initiateProCheckout(subscriptionUserId, profileData.email);
      if (result.demo) {
        setSubscriptionPlan('pro');
        setIsSubscriptionOpen(false);
        addToHistory('Pro activated (demo)', 'success');
        return;
      }
      if (result.capture_url) {
        window.location.href = result.capture_url;
        return;
      }
      addToHistory(result.error || 'Checkout failed', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  useEffect(() => {
    if (!appUser) return;
    const key = viewingStudentKey || currentUserKey;
    const completions = getCompletionHistory(key);
    if (completions.length === 0) {
      const as = appUser?.role === ROLES.PARENT ? getStoredAssignments(selectedChildEmail) || [] : assignments;
      const completed = as.filter(a => a.status === 'Completed' || a.status === 'Submitted');
      if (completed.length > 0 && key) {
        const toSeed = completed.map(a => ({ date: getDate(0), subject: a.subject || 'Other', title: a.title }));
        try {
          const raw = localStorage.getItem(ANALYTICS_HISTORY_KEY);
          const data = raw ? JSON.parse(raw) : {};
          data[key] = { completions: toSeed };
          localStorage.setItem(ANALYTICS_HISTORY_KEY, JSON.stringify(data));
        } catch {}
      }
    }
  }, [appUser?.name, viewingStudentKey, selectedChildEmail]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        if (auth) {
          let userCred;
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            userCred = await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            userCred = await signInAnonymously(auth);
          }
          if (isMounted) setUser(userCred.user);
        }
      } catch (e) {
        console.warn('Auth init (demo mode):', e?.message);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  const handleB2CLogin = (userData) => {
    if (!userData) return;
    const newAppUser = {
      name: userData.name || "Student",
      role: userData.role || ROLES.STUDENT,
    };
    setAppUser(newAppUser);
    const email = userData.email || '';
    try {
      const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      setProfileData({
        name: parsed?.name ?? newAppUser.name,
        grade: parsed?.grade ?? '',
        school: parsed?.school ?? '',
        favoriteSubject: parsed?.favoriteSubject ?? '',
        email: parsed?.email ?? email,
        gamificationLevel: parsed?.gamificationLevel ?? 'simple',
      });
        const userKey = (parsed?.email ?? email) || newAppUser.name;
      const storedAssignments = getStoredAssignments(userKey);
      if (storedAssignments && Array.isArray(storedAssignments) && storedAssignments.length > 0) {
        setAssignments(storedAssignments);
      }
      if (newAppUser.role === ROLES.PARENT) {
        setLinkedStudents(platformData.getLinkedStudentsForParent(userKey));
        setSelectedChildEmail(platformData.getLinkedStudentsForParent(userKey)[0] || null);
      }
      if (newAppUser.role === ROLES.STUDENT && userKey) {
        const code = platformData.getPairingCodeForStudent(userKey) || platformData.generatePairingCode(userKey);
        setPairingCode(code);
      }
    } catch {
      setProfileData({ name: newAppUser.name, grade: '', school: '', favoriteSubject: '', email, gamificationLevel: 'simple' });
    }
  };

  const saveProfile = () => {
    if (!profileData.name?.trim()) return;
    setAppUser(prev => prev ? { ...prev, name: profileData.name.trim() } : null);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profileData));
    } catch {}
    setIsProfileSettingsOpen(false);
  };

  const handleSignOut = () => {
    setAppUser(null);
    setActiveTab(TABS.OVERVIEW);
  };

  const addToHistory = (title, type = 'info') => {
    setRecentHistory(prev => [{ id: Date.now(), title, type, time: "Just now" }, ...prev].slice(0, 5));
  };

  const handleCreateAssignment = (e) => {
    e.preventDefault();
    if (!newAssignment.title) return;
    const effectiveDueDate = newAssignment.dueDate || getDate(0);
    const assignment = { id: Date.now(), category: 'Homework', status: 'Pending', progress: 0, ...newAssignment, dueDate: effectiveDueDate };
    setAssignments(prev => [assignment, ...prev]);
    setIsCreateAssignmentModalOpen(false);
    addToHistory(`Submitted: ${newAssignment.title}`, 'success');
    setNewAssignment({ title: '', subject: 'Math', dueDate: '', priority: 'Medium', description: '' });
  };

  const handleDayClick = (dateStr) => setSelectedDate(dateStr);

  const handleGoogleClassroomImport = async () => {
    setIntegrationMessage(null);
    setIsGoogleClassroomImporting(true);
    try {
      const token = await getGoogleClassroomToken();
      if (!token) {
        const hasClientId = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const msg = hasClientId ? 'Sign-in was cancelled or the popup was blocked.' : 'Google Classroom is not configured. Add VITE_GOOGLE_CLIENT_ID to your .env file. See docs/PHASE2_SETUP.md for setup.';
        setIntegrationMessage(msg);
        addToHistory('Google Classroom: ' + (hasClientId ? 'cancelled' : 'not configured'), 'error');
        return;
      }
      const items = await fetchAllCoursework(token);
      if (items.length === 0) {
        setIntegrationMessage('No assignments found in your Google Classroom.');
        addToHistory('No assignments found in Google Classroom', 'info');
        return;
      }
      setAssignments(prev => [...items.map(a => ({ ...a, id: a.id || Date.now() + Math.random() })), ...prev]);
      setIntegrationMessage(`Synced ${items.length} assignments from Google Classroom.`);
      addToHistory(`Imported ${items.length} assignments from Google Classroom`, 'success');
    } catch (err) {
      const msg = err?.message || 'Google Classroom sync failed.';
      setIntegrationMessage(msg);
      addToHistory(msg, 'error');
    } finally {
      setIsGoogleClassroomImporting(false);
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setProfileImage(reader.result); addToHistory('Profile picture updated', 'success'); };
      reader.readAsDataURL(file);
    }
  };

  const handleAssignmentFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedAssignment) return;
    if (file.size > 20 * 1024 * 1024) { addToHistory("File too large (Max 20MB)", "error"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedAssignment = { ...selectedAssignment, status: 'Submitted', submittedFile: file.name, submittedFileType: file.type || 'application/octet-stream', submittedPreview: reader.result };
      setAssignments(prev => prev.map(a => a.id === selectedAssignment.id ? updatedAssignment : a));
      setSelectedAssignment(updatedAssignment);
      addToHistory(`Uploaded ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteTask = (taskId) => {
    setAssignments(prev => prev.filter(a => a.id !== taskId));
    setIsUploadModalOpen(false);
    addToHistory("Task cancelled", "info");
  };

  useEffect(() => {
    if (selectedAssignment) setTeacherCommentDraft(selectedAssignment.teacherComments || '');
  }, [selectedAssignment?.id]);

  const handleSaveTeacherComment = () => {
    if (!selectedAssignment || appUser?.role !== ROLES.TEACHER) return;
    const updated = { ...selectedAssignment, teacherComments: teacherCommentDraft.trim() };
    setAssignments(prev => prev.map(a => a.id === selectedAssignment.id ? updated : a));
    setSelectedAssignment(updated);
    addToHistory('Comment saved', 'success');
  };

  const stats = useMemo(() => {
    const today = getDate(0);
    const overdue = assignments.filter(a => a.status !== 'Completed' && a.status !== 'Submitted' && a.dueDate < today).length;
    const dueTodayOrFuture = assignments.filter(a => a.status !== 'Completed' && a.status !== 'Submitted' && a.dueDate >= today).length;
    const completed = assignments.filter(a => a.status === 'Completed' || a.status === 'Submitted').length;
    return { overdue, dueToday: dueTodayOrFuture, completed };
  }, [assignments]);

  const analyticsData = useMemo(() => {
    const completions = getCompletionHistory(viewingStudentKey || currentUserKey);
    const today = getDate(0);
    const last7 = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const byDay = last7.map(d => ({ date: d, count: completions.filter(c => c.date === d).length }));
    const maxCount = Math.max(1, ...byDay.map(x => x.count));
    const subjectCounts = DEFAULT_SUBJECTS.reduce((acc, s) => {
      acc[s] = completions.filter(c => c.subject === s).length;
      return acc;
    }, {});
    const totalBySubject = Object.values(subjectCounts).reduce((a, b) => a + b, 0);
    const maxSubj = Math.max(1, ...Object.values(subjectCounts));
    const thisWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; })();
    const lastWeekStart = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay() - 7); return d.toISOString().split('T')[0]; })();
    const thisWeek = completions.filter(c => c.date >= thisWeekStart).length;
    const lastWeek = completions.filter(c => c.date >= lastWeekStart && c.date < thisWeekStart).length;
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (completions.some(c => c.date === ds)) streak++;
      else break;
    }
    const total = assignments.length;
    const done = assignments.filter(a => a.status === 'Completed' || a.status === 'Submitted').length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { byDay, maxCount, subjectCounts, totalBySubject, maxSubj, thisWeek, lastWeek, streak, completionRate, done, total };
  }, [assignments, viewingStudentKey, currentUserKey]);

  const homeworkForSelectedDate = useMemo(() => {
    return assignments.filter(a => a.dueDate === selectedDate);
  }, [assignments, selectedDate]);

  const nextUpAssignments = useMemo(() => {
    const today = getDate(0);
    return assignments
      .filter(a => a.status !== 'Completed' && a.status !== 'Submitted' && a.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 3);
  }, [assignments]);

  const getTimeUntilDeadline = (dueDateStr) => {
    const due = new Date(dueDateStr + 'T23:59:59');
    const now = new Date();
    if (due < now) return 'Late';
    const diff = Math.floor((due - now) / 60000);
    if (diff < 60) return `Due in ${diff} min`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (m === 0) return `Due in ${h} ${h === 1 ? 'hour' : 'hours'}`;
    return `Due in ${h}h ${m}m`;
  };

  if (authLoading) return (
    <div className="h-[100dvh] wallpaper-auth flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
      <RefreshCw className="text-white animate-spin" size={32} />
      <p className="text-sm font-bold text-white animate-pulse tracking-widest uppercase">Launching...</p>
    </div>
  );

  if (!appUser) return <AuthScreen onLogin={handleB2CLogin} isLoading={auth ? !user : false} useFirebase={!!auth} />;

  if (appUser.role === ROLES.ADMIN) {
    return (
      <div className={`h-[100dvh] w-full ${getBackgroundClass()} font-sans relative flex flex-col overflow-hidden`}>
        <style>{noScrollbarStyles}</style>
        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto">
          {activeTab === TABS.SCHOOL && <SchoolDashboard schools={platformData.getSchools()} key={schoolsRefresh} onRefresh={() => setSchoolsRefresh(Date.now())} />}
          {activeTab === TABS.SETTINGS && (
            <div className="space-y-6 text-slate-800">
              <div className="glass-panel px-4 py-2 rounded-xl mb-4 inline-block"><h2 className="text-2xl font-black text-slate-800">Settings</h2></div>
              <button onClick={handleSignOut} className="w-full glass-card p-4 rounded-2xl text-rose-500 font-bold flex items-center gap-3 shadow-sm hover:bg-white"><LogOut size={16} /> Log out</button>
            </div>
          )}
        </div>
        <div className="fixed bottom-6 right-6 z-50 flex gap-2">
          <button onClick={() => setActiveTab(TABS.SCHOOL)} className={`px-6 py-3 rounded-2xl font-bold ${activeTab === TABS.SCHOOL ? 'bg-violet-500 text-white' : 'bg-white/80 text-slate-600'}`}><Building2 size={20} /> School</button>
          <button onClick={() => setActiveTab(TABS.SETTINGS)} className={`px-6 py-3 rounded-2xl font-bold ${activeTab === TABS.SETTINGS ? 'bg-violet-500 text-white' : 'bg-white/80 text-slate-600'}`}><Settings size={20} /> Settings</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-[100dvh] w-full ${getBackgroundClass()} font-sans relative flex flex-col overflow-hidden transition-all duration-1000`}>
      <style>{noScrollbarStyles}</style>

      <input type="file" ref={profileImageInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleProfileImageChange} />
      <input type="file" ref={assignmentFileInputRef} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.xls,.xlsx,.ppt,.pptx" onChange={handleAssignmentFileChange} />
      <input type="file" ref={csvFileInputRef} style={{ display: 'none' }} accept=".csv,text/csv,text/plain" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => { setCsvImportText(r.result || ''); }; r.readAsText(f); e.target.value = ''; }} />

      <div className={`flex-1 flex flex-col min-h-0 z-10 no-scrollbar overflow-y-auto w-full max-w-5xl mx-auto px-8 md:px-20 pb-40 pt-12 md:pt-16`}>

        {activeTab === TABS.OVERVIEW && (
          <div className="space-y-6 animate-in fade-in text-slate-800">
            {/* Top bar: status, welcome, time, streak, profile */}
            <p className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {copy.status}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-black text-slate-800">{copy.welcome}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600">{appUser.name.split(' ')[0]?.toUpperCase() || appUser.name}</span></h1>
                {appUser.role === ROLES.STUDENT && (
                  <div className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 rounded-lg text-white shadow-md">
                    <Flame size={14} fill="currentColor" />
                    <span className="text-xs font-black">Streak: {studyStreak} Days</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="glass-card px-3 py-2 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Time</p>
                  <p className="text-sm font-black text-slate-700 tabular-nums">{localTime || '--:--:--'}</p>
                </div>
                <div className="glass-card px-3 py-2 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{copy.studyTimeLabel}</p>
                  <p className="text-sm font-black text-violet-600 tabular-nums">{sessionTime}</p>
                </div>
                <button onClick={() => setIsProfileSettingsOpen(true)} className="w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-violet-500 overflow-hidden border-2 border-white transition-transform hover:scale-105 shrink-0">
                  {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : (appUser.role === ROLES.STUDENT ? <User /> : appUser.role === ROLES.TEACHER ? <GraduationCap /> : <Users />)}
                </button>
              </div>
            </div>

            {/* Summary cards - NEXUS style with violet scheme */}
            <div className="grid grid-cols-3 gap-4">
              <div onClick={() => { setActiveTab(TABS.HOMEWORK); setHwFilter(HW_FILTERS.OVERDUE); }} className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-white/90 transition-all group relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-20"><Target size={32} className="text-rose-500" /></div>
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">Late</p>
                <p className="text-3xl font-black text-rose-600">{stats.overdue}</p>
                <p className="text-[10px] font-bold text-rose-500 mt-1">{stats.overdue > 0 ? 'Needs attention' : 'All clear'}</p>
              </div>
              <div onClick={() => { setActiveTab(TABS.HOMEWORK); setHwFilter(HW_FILTERS.DUE); }} className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-white/90 transition-all group relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-20"><Calendar size={32} className="text-violet-500" /></div>
                <p className="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-1">To do</p>
                <p className="text-3xl font-black text-violet-600">{stats.dueToday}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1">On track</p>
              </div>
              <div onClick={() => { setActiveTab(TABS.HOMEWORK); setHwFilter(HW_FILTERS.COMPLETED); }} className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-white/90 transition-all group relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-20"><CheckCircle2 size={32} className="text-emerald-500" /></div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-1">Done</p>
                <p className="text-3xl font-black text-emerald-600">{stats.completed}</p>
                <p className="text-[10px] font-bold text-emerald-500 mt-1">All done</p>
              </div>
            </div>

            {/* Active recovery target */}
            {(appUser.role === ROLES.STUDENT || (appUser.role === ROLES.PARENT && selectedChildEmail)) && (() => { const r = getActiveRecoveryForStudent(viewingStudentKey); return r; })() && (
              <div className="glass-card p-4 rounded-2xl border-l-4 border-violet-500">
                <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider mb-2">Recovery plan</p>
                {(() => { const rec = getActiveRecoveryForStudent(viewingStudentKey); return rec ? <p className="text-sm font-medium text-slate-700">{rec.achievedCompletions} of {rec.requiredCompletions} days completed • {rec.targetCompletionPct}% target</p> : null; })()}
              </div>
            )}

            {/* Risk Score & Forecast */}
            {(appUser.role === ROLES.STUDENT || (appUser.role === ROLES.PARENT && selectedChildEmail)) && riskScore != null && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className={`glass-card p-6 rounded-2xl border-l-4 ${riskScore >= 80 ? 'border-emerald-500' : riskScore >= 60 ? 'border-amber-500' : riskScore >= 40 ? 'border-orange-500' : 'border-rose-500'}`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Risk Score</p>
                  <p className="text-3xl font-black text-slate-800">{riskScore}</p>
                  <p className="text-xs font-bold text-slate-600 mt-1">{getRiskBand(riskScore).label}</p>
                </div>
                {forecast && (forecast.projectedGrade != null || forecast.trendDirection) && (
                  <div className="glass-card p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Forecast</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      {forecast.projectedGrade != null && <p className="text-2xl font-black text-slate-800">{forecast.projectedGrade}% <span className="text-sm font-normal text-slate-500">projected</span></p>}
                      {forecast.trendDirection && <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${forecast.trendDirection === 'Upward' ? 'bg-emerald-100 text-emerald-700' : forecast.trendDirection === 'Downward' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{forecast.trendDirection}</span>}
                      {(appUser.role === ROLES.STUDENT || appUser.role === ROLES.PARENT) && riskScore < 60 && !getActiveRecoveryForStudent(viewingStudentKey) && (
                        <button onClick={() => { createRecoveryTarget(viewingStudentKey, 95, 7); }} className="px-3 py-1.5 bg-violet-500 text-white text-xs font-bold rounded-lg">Create recovery plan</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="glass-card p-4 rounded-2xl border-l-4 border-amber-500">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-2">Alerts</p>
                {alerts.slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm py-1">
                    <span className="font-medium text-slate-700">{a.message}</span>
                    <button onClick={() => { markAlertRead(a.id, profileData.email); setAlerts(getUnreadAlertsForUser(profileData.email, linkedStudents, appUser?.role)); }} className="text-[10px] text-violet-500 font-bold">Dismiss</button>
                  </div>
                ))}
              </div>
            )}

            {/* Parent: Child selector */}
            {appUser.role === ROLES.PARENT && (
              <div className="glass-card p-4 rounded-2xl">
                {linkedStudents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase w-full mb-2">Viewing</p>
                    {linkedStudents.map(em => (
                      <button key={em} onClick={() => setSelectedChildEmail(em)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${selectedChildEmail === em ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{em}</button>
                    ))}
                  </div>
                ) : (
                  <ParentLinkInput onLink={(code) => { const r = platformData.linkParentToStudent(code, profileData.email); if (r.ok) { setLinkedStudents(platformData.getLinkedStudentsForParent(profileData.email)); setSelectedChildEmail(r.studentEmail); } return r; }} />
                )}
              </div>
            )}

            {/* Two-column: Focus Area (left) + Recent Vibes & Next Up (right) */}
            <div className="grid md:grid-cols-5 gap-6">
              {/* Left: Focus Area + Active Mission */}
              <div className="md:col-span-3 space-y-4">
                <div className="glass-panel rounded-2xl p-6 shadow-lg border-l-4 border-violet-500">
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-4">{copy.focusLabel}</p>
                  <div className="mb-4 bg-violet-50 p-3 rounded-xl border border-violet-100 flex items-center gap-3">
                    <div className="bg-white p-2 rounded-full text-violet-500 shadow-sm shrink-0"><Sparkles size={14} fill="currentColor" /></div>
                    <p className="text-xs font-bold text-slate-700 leading-snug">"{motivationalQuote}"</p>
                  </div>
                  {(() => {
                    const next = assignments.find(a => a.status === 'Pending');
                    if (!next) return (
                      <div className="text-center py-8 text-slate-400 rounded-2xl bg-white/50">
                        <p className="font-bold">{copy.allCaughtUp}</p>
                        <p className="text-xs mt-1">Great job clearing your list.</p>
                      </div>
                    );
                    return (
                      <div className="glass-card rounded-2xl p-6 border-l-4 border-violet-500">
                        <div className="flex items-start gap-4">
                          <div className="relative w-20 h-20 shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path fill="none" stroke="rgb(203 213 225)" strokeWidth="3" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <path fill="none" stroke="url(#violetGrad)" strokeWidth="3" strokeDasharray="25, 75" strokeLinecap="round" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                              <defs><linearGradient id="violetGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#d946ef" /></linearGradient></defs>
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-slate-700">25%</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[10px] font-black uppercase mb-2">Up next</span>
                            <p className="text-[10px] text-violet-500 font-medium mb-0.5">{next.subject}</p>
                            <h4 className="font-black text-slate-800 text-lg leading-tight">{next.title}</h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{next.description || 'No description.'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                              <span className="text-[10px] font-bold text-violet-600">{getTimeUntilDeadline(next.dueDate)}</span>
                              <span className="text-[10px] font-black text-slate-600">{next.priority === 'High' ? 'Important' : 'Do soon'}</span>
                            </div>
                            <button onClick={() => { setSelectedAssignment(next); setIsUploadModalOpen(true); }} className="mt-4 w-full py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity">Open</button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Right: Recent Vibes + Next Up */}
              <div className="md:col-span-2 space-y-4">
                <div className="glass-panel rounded-2xl p-6 shadow-lg">
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-4">{copy.recentLabel}</p>
                  <div className="space-y-3">
                    {recentHistory.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-100 text-violet-600'}`}>
                          {item.type === 'success' ? <CheckCircle2 size={16} /> : <History size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-700">{item.title}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-panel rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest">{copy.comingUpLabel}</p>
                    <Calendar size={14} className="text-violet-500" />
                  </div>
                  <div className="space-y-3">
                    {nextUpAssignments.length > 0 ? nextUpAssignments.map((a) => (
                      <div key={a.id} onClick={() => { setSelectedAssignment(a); setIsUploadModalOpen(true); }} className="flex items-center gap-3 cursor-pointer hover:bg-white/50 p-2 rounded-xl -mx-2 transition-colors">
                        <span className="text-[10px] font-black text-violet-600 shrink-0">{new Date(a.dueDate).getDate()} {new Date(a.dueDate).toLocaleString('default',{month:'short'}).toUpperCase()}</span>
                        <p className="text-sm font-bold text-slate-700 truncate">{a.title}</p>
                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                      </div>
                    )) : (
                      <p className="text-xs text-slate-400">{copy.emptyComingUp}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === TABS.HOMEWORK && (
          <div className="animate-in slide-in-from-bottom-4 text-slate-800">
            {/* Top bar - full width */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-black text-slate-800">{copy.homeworkTitle}</h1>
              <p className="text-[10px] font-bold text-violet-500 uppercase hidden sm:block">Ready</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Main content - first on mobile so homework list is visible */}
              <div className="flex-1 min-w-0 order-1 lg:order-2">
                {viewMode === 'list' ? (
                  <>
                    <div className="flex items-center justify-end mb-4">
                      <div className="flex gap-1 bg-white/80 rounded-xl p-1">
                        <button onClick={() => setHomeworkLayout('list')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${homeworkLayout === 'list' ? 'bg-violet-500 text-white' : 'text-slate-500'}`}>List</button>
                        <button onClick={() => setHomeworkLayout('grid')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${homeworkLayout === 'grid' ? 'bg-violet-500 text-white' : 'text-slate-500'}`}><LayoutGrid size={14} /> Grid</button>
                      </div>
                    </div>

                    {/* Filter tabs */}
                    <div className="glass-panel p-1 rounded-xl flex mb-4">
                      {Object.values(HW_FILTERS).map(f => (
                        <button key={f} onClick={() => setHwFilter(f)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${hwFilter === f ? 'bg-violet-500 text-white' : 'text-slate-500 hover:bg-white/50'}`}>{f}</button>
                      ))}
                    </div>

                    {homeworkLayout === 'list' ? (
                      <div className="space-y-3">
                        {assignments
                          .filter(a => {
                            const today = getDate(0);
                            const isDone = a.status === 'Completed' || a.status === 'Submitted';
                            const subjectOk = (filterSubject === 'All' || a.subject === filterSubject);
                            if (!subjectOk) return false;
                            if (hwFilter === HW_FILTERS.OVERDUE) return a.dueDate < today && !isDone;
                            if (hwFilter === HW_FILTERS.DUE) return a.dueDate >= today && !isDone;
                            return isDone;
                          })
                          .map(a => {
                            const progress = getAssignmentProgress(a);
                            return (
                              <div key={a.id} onClick={() => { setSelectedAssignment(a); setIsUploadModalOpen(true); }} className="glass-card p-4 rounded-2xl shadow-sm cursor-pointer hover:bg-white transition-colors border-0 flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(a.dueDate).toLocaleString('default',{month:'short'}).toUpperCase()} {a.dueDate.split('-')[2]} • {a.subject.toUpperCase()}</p>
                                  <p className="text-[10px] text-violet-500 font-medium">{a.subject}</p>
                                  <h4 className="font-bold text-slate-800 mt-0.5">{a.title}</h4>
                                  <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                      <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-600">{progress}%</span>
                                  </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  {a.status !== 'Completed' && a.status !== 'Submitted' && (
                                    <button onClick={(e) => { e.stopPropagation(); const now = getDate(0); setAssignments(prev => prev.map(x => x.id === a.id ? { ...x, status: 'Completed', progress: 100, submittedAt: now } : x)); logCompletion(a, viewingStudentKey); updateRecoveryProgress(viewingStudentKey, 1); addToHistory(`Completed: ${a.title}`, 'success'); }} className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl">{copy.completeBtn}</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        {assignments.filter(a => {
                          const today = getDate(0);
                          const isDone = a.status === 'Completed' || a.status === 'Submitted';
                          const subjectOk = (filterSubject === 'All' || a.subject === filterSubject);
                          if (!subjectOk) return false;
                          if (hwFilter === HW_FILTERS.OVERDUE) return a.dueDate < today && !isDone;
                          if (hwFilter === HW_FILTERS.DUE) return a.dueDate >= today && !isDone;
                          return isDone;
                        }).length === 0 && <div className="glass-card p-8 rounded-2xl text-center text-slate-500">{copy.noHomework}</div>}
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {assignments
                          .filter(a => {
                            const today = getDate(0);
                            const isDone = a.status === 'Completed' || a.status === 'Submitted';
                            const subjectOk = (filterSubject === 'All' || a.subject === filterSubject);
                            if (!subjectOk) return false;
                            if (hwFilter === HW_FILTERS.OVERDUE) return a.dueDate < today && !isDone;
                            if (hwFilter === HW_FILTERS.DUE) return a.dueDate >= today && !isDone;
                            return isDone;
                          })
                          .map(a => {
                            const progress = getAssignmentProgress(a);
                            return (
                              <div key={a.id} onClick={() => { setSelectedAssignment(a); setIsUploadModalOpen(true); }} className="glass-card p-4 rounded-2xl shadow-sm cursor-pointer hover:bg-white transition-colors border-0">
                                <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold mb-2 ${a.priority === 'High' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-600'}`}>{a.subject}</span>
                                <h4 className="font-bold text-slate-800">{a.title}</h4>
                                <p className="text-[10px] text-slate-500 mt-1">Due {a.dueDate}</p>
                                <div className="mt-3 flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" style={{ width: `${progress}%` }} />
                                  </div>
                                  <span className="text-[10px] font-bold">{progress}%</span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* System Calendar Grid */}
                    <div className="glass-panel rounded-2xl p-6 mt-6 shadow-sm">
                      <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-3">Calendar</p>
                      <div className="flex gap-4 mb-2 text-[10px]">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" /> Important</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-300" /> Do soon</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['M','T','W','T','F','S','S'].map((d,i)=><div key={i} className="text-[10px] font-bold text-slate-400">{d}</div>)}
                        {(()=>{
                          const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth()+1,0).getDate();
                          const firstDay = (new Date(calendarDate.getFullYear(), calendarDate.getMonth(),1).getDay()+6)%7;
                          const today = getDate(0);
                          const days = [];
                          for(let i=0;i<firstDay;i++) days.push(<div key={`e${i}`} className="aspect-square" />);
                          for(let i=1;i<=daysInMonth;i++){
                            const ds = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                            const tasks = assignments.filter(x=>x.dueDate===ds);
                            const hasHigh = tasks.some(t=>t.priority==='High');
                            const hasMid = tasks.some(t=>t.priority==='Medium');
                            let cls = 'aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold cursor-pointer ';
                            if(today===ds) cls += 'ring-2 ring-violet-500 ';
                            cls += hasHigh ? 'bg-violet-100 text-violet-700' : hasMid ? 'bg-violet-50 text-violet-600' : 'text-slate-500 hover:bg-white/50';
                            days.push(<div key={i} onClick={()=>{setSelectedDate(ds);setViewMode('calendar');}} className={cls}>{i}{tasks.length>0 && <span className="text-[10px]">{tasks.length} task{tasks.length>1?'s':''}</span>}</div>);
                          }
                          return days;
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                <div className="flex flex-col space-y-6">
                <div className="glass-panel p-6 rounded-[32px] shadow-lg relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-black text-slate-800">{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                      <button onClick={() => { setCalendarDate(new Date()); setSelectedDate(getDate(0)); }} className="text-[10px] font-black text-violet-500 uppercase tracking-widest text-left mt-0.5 hover:text-violet-700 transition-colors">Today</button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                      <button onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-[10px] font-bold text-slate-300 uppercase">{d}</div>)}
                  </div>
                  {(() => {
                    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
                    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();
                    const totalWeeks = Math.ceil((daysInMonth + firstDay) / 7);
                    return (
                      <div className="grid grid-cols-7 gap-1" style={{ gridTemplateRows: `repeat(${totalWeeks}, minmax(40px, 1fr))` }}>
                        {(() => {
                          const days = [];
                          for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-full h-full opacity-0 pointer-events-none" />);
                          for (let i = 1; i <= daysInMonth; i++) {
                            const currentDateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                            const tasks = assignments.filter(a => a.dueDate === currentDateStr);
                            const today = getDate(0);
                            const isSelected = selectedDate === currentDateStr;
                            const isToday = today === currentDateStr;
                            let styleClasses = 'rounded-2xl flex flex-col items-center justify-center text-xs font-bold cursor-pointer transition-all w-full h-full relative p-2 ';
                            if (isSelected) {
                              styleClasses += 'bg-slate-800 text-white ring-4 ring-slate-100 z-10 scale-105 shadow-xl';
                            } else if (tasks.length > 0) {
                              const hasOverdue = tasks.some(t => (t.status !== 'Completed' && t.status !== 'Submitted') && t.dueDate < today);
                              styleClasses += hasOverdue ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700';
                            } else if (isToday) {
                              styleClasses += 'bg-violet-50 text-violet-600 ring-1 ring-violet-200';
                            } else {
                              styleClasses += 'text-slate-400 hover:bg-slate-50';
                            }
                            days.push(
                              <div key={i} onClick={() => handleDayClick(currentDateStr)} className={styleClasses}>
                                {i}
                                {tasks.length > 0 && <div className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : (tasks.some(t => t.dueDate < today && t.status !== 'Completed') ? 'bg-rose-500' : 'bg-emerald-500')}`} />}
                              </div>
                            );
                          }
                          return days;
                        })()}
                      </div>
                    );
                  })()}
                </div>

                <div className="animate-in fade-in slide-in-from-top-2 pb-12">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock size={18} className="text-violet-500" />
                      <h3 className="font-bold text-slate-500 text-base">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
                    </div>
                    <button onClick={() => setIsCreateAssignmentModalOpen(true)} className="text-xs font-black text-violet-500 uppercase tracking-widest hover:bg-violet-50 px-3 py-1.5 rounded-xl transition-colors">+ {copy.addHomework}</button>
                  </div>
                  <div className="space-y-3">
                    {homeworkForSelectedDate.length > 0 ? (
                      homeworkForSelectedDate.map(a => (
                        <div key={a.id} onClick={() => { setSelectedAssignment(a); setIsUploadModalOpen(true); }} className="glass-card p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl text-white ${a.status === 'Completed' ? 'bg-emerald-400' : 'bg-violet-400'}`}>
                              {a.subject === 'Math' ? <Calculator size={16} /> : <BookOpen size={16} />}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{a.title}</h4>
                              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{a.subject}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${a.status === 'Completed' ? 'text-emerald-500' : 'text-violet-500'}`}>{a.status}</span>
                        </div>
                      ))
                    ) : (
                      <div className="glass-card p-8 rounded-[32px] text-center text-slate-400 shadow-sm">
                        <p className="text-sm font-bold">{copy.noTasks}</p>
                        <p className="text-[10px] mt-1 font-medium">Nice! 🎉</p>
                      </div>
                    )}
                  </div>
                </div>
                </div>
                )}
              </div>

              {/* Sidebar - second on mobile, left on lg */}
              <div className="lg:w-56 shrink-0 space-y-4 order-2 lg:order-1">
                <div className="glass-panel rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-3">{copy.quickActions}</p>
                  <button onClick={() => setIsCreateAssignmentModalOpen(true)} className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-2">
                    <Plus size={18} /> {copy.addHomework}
                  </button>
                  <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className="w-full py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:border-violet-300 transition-colors">
                    <Calendar size={16} /> Calendar
                  </button>
                  <button onClick={() => setIsCsvImportOpen(true)} className="w-full py-2.5 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:border-violet-300 transition-colors">
                    <Plus size={16} /> Import CSV
                  </button>
                  <p className="text-[10px] text-slate-400 mt-2">V.2.0.4</p>
                </div>
                <div className="glass-panel rounded-2xl p-4 shadow-sm">
                  <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-3">{copy.filterBy}</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setFilterSubject('All')} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${filterSubject === 'All' ? 'bg-violet-500 text-white' : 'bg-white/70 text-slate-500 hover:bg-violet-50'}`}>All</button>
                    {DEFAULT_SUBJECTS.map(sub => (
                      <button key={sub} onClick={() => setFilterSubject(sub)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${filterSubject === sub ? 'bg-violet-500 text-white' : 'bg-white/70 text-slate-500 hover:bg-violet-50'}`}>#{sub}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === TABS.ANALYTICS && (
          <div className="space-y-6 text-slate-800 animate-in fade-in">
            {subscriptionPlan !== 'pro' ? (
              <div className="glass-card p-8 rounded-3xl text-center">
                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4"><Lock size={32} className="text-violet-500" /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{copy.analyticsTitle || 'Advanced Stats'}</h3>
                <p className="text-sm text-slate-600 mb-6 max-w-sm mx-auto">See completion trends, streaks, and subject breakdown. Upgrade to Pro to unlock.</p>
                <button onClick={() => setIsSubscriptionOpen(true)} className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-2xl shadow-lg hover:scale-[1.02] transition-all">Upgrade to Pro</button>
              </div>
            ) : (
              <>
            <div className="glass-panel px-4 py-2 rounded-xl mb-2 inline-block">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><TrendingUp size={28} className="text-violet-500" /> {copy.analyticsTitle || 'Advanced Stats'}</h2>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card p-5 rounded-2xl">
                <p className="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-1">Completion rate</p>
                <p className="text-2xl font-black text-slate-800">{analyticsData.completionRate}%</p>
                <p className="text-[10px] text-slate-500">{analyticsData.done} of {analyticsData.total} tasks done</p>
              </div>
              <div className="glass-card p-5 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-1">Streak</p>
                  <p className="text-2xl font-black text-slate-800">{analyticsData.streak} <span className="text-sm font-bold text-slate-500">days</span></p>
                  <p className="text-[10px] text-slate-500">Completed at least 1 task</p>
                  {profileData.gamificationLevel !== 'off' && analyticsData.streak >= 7 && <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">7-day badge</span>}
              </div>
              <div className="glass-card p-5 rounded-2xl">
                <p className="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-1">This week</p>
                <p className="text-2xl font-black text-slate-800">{analyticsData.thisWeek}</p>
                <p className="text-[10px] text-slate-500">Tasks completed</p>
              </div>
              <div className="glass-card p-5 rounded-2xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Last week</p>
                <p className="text-2xl font-black text-slate-800">{analyticsData.lastWeek}</p>
                <p className="text-[10px] text-slate-500">Tasks completed</p>
              </div>
            </div>

            {/* 7-day trend bar chart */}
            <div className="glass-card p-6 rounded-3xl">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart2 size={18} className="text-violet-500" /> Completions (last 7 days)</h3>
              <div className="flex items-end justify-between gap-2 h-32">
                {analyticsData.byDay.map(({ date, count }) => (
                  <div key={date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex flex-col justify-end h-24" style={{ minHeight: 96 }}>
                      <div className="w-full bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-t-xl transition-all" style={{ height: `${(count / analyticsData.maxCount) * 100}%`, minHeight: count > 0 ? 8 : 0 }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject breakdown */}
            <div className="glass-card p-6 rounded-3xl">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChart size={18} className="text-violet-500" /> By subject</h3>
              <div className="space-y-3">
                {DEFAULT_SUBJECTS.map(sub => {
                  const n = analyticsData.subjectCounts[sub] || 0;
                  const pct = analyticsData.totalBySubject > 0 ? Math.round((n / analyticsData.totalBySubject) * 100) : 0;
                  return (
                    <div key={sub} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-700 w-20">{sub}</span>
                      <div className="flex-1 h-6 bg-slate-100 rounded-xl overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl transition-all" style={{ width: `${(n / analyticsData.maxSubj) * 100}%`, minWidth: n > 0 ? 4 : 0 }} />
                      </div>
                      <span className="text-xs font-black text-slate-600 w-12 text-right">{n} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {activeTab === TABS.SCHOOL && appUser?.role === ROLES.ADMIN && (
          <SchoolDashboard schools={platformData.getSchools()} key={schoolsRefresh} onRefresh={() => setSchoolsRefresh(Date.now())} />
        )}

        {activeTab === TABS.SETTINGS && (
          <div className="space-y-6 text-slate-800">
            <div className="glass-panel px-4 py-2 rounded-xl mb-4 inline-block"><h2 className="text-2xl font-black text-slate-800">Settings</h2></div>
            <div onClick={() => setIsProfileSettingsOpen(true)} className="glass-card p-6 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer hover:bg-white/90 transition-all border-0">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-2xl font-bold overflow-hidden border-4 border-white shadow-md">
                {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : appUser.role[0]}
              </div>
              <div><h3 className="font-bold text-slate-800 text-lg">{copy.profileTitle}</h3><p className="text-xs text-slate-500 font-medium">{copy.profileDesc}</p></div>
              <div className="ml-auto text-violet-300"><ChevronRight size={24} /></div>
            </div>
            {appUser.role === ROLES.STUDENT && pairingCode && (
              <div className="glass-card p-6 rounded-3xl shadow-sm">
                <h3 className="font-bold text-slate-800 text-lg mb-1">Pairing code</h3>
                <p className="text-xs text-slate-500 font-medium mb-3">Share this code with a parent to link accounts</p>
                <p className="text-2xl font-black text-violet-600 tracking-widest">{pairingCode}</p>
              </div>
            )}
            <div className="space-y-2">
              <button type="button" onClick={handleGoogleClassroomImport} disabled={isGoogleClassroomImporting} className={`w-full text-left glass-card p-6 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer hover:bg-white/90 transition-all border-0 disabled:opacity-75 disabled:cursor-wait ${integrationMessage ? 'ring-2 ring-violet-300' : ''}`}>
                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0"><BookOpen size={28} /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-700 text-lg">Integrations</h3>
                  <p className="text-xs text-slate-500 font-medium">{isGoogleClassroomImporting ? 'Syncing…' : 'Connect Google Classroom to sync assignments'}</p>
                </div>
                <ChevronRight size={24} className="text-violet-300 shrink-0" />
              </button>
              {integrationMessage && (
                <p className="text-xs font-medium text-slate-600 px-2">{integrationMessage}</p>
              )}
            </div>
            <div onClick={() => setIsSubscriptionOpen(true)} className="glass-card p-6 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer hover:bg-white/90 transition-all border-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-md"><Sparkles size={28} /></div>
              <div><h3 className="font-bold text-slate-800 text-lg">Premium</h3><p className="text-xs text-slate-500 font-medium">Get more features</p></div>
              <div className="ml-auto text-violet-300"><ChevronRight size={24} /></div>
            </div>
            <button onClick={handleSignOut} className="w-full glass-card p-4 rounded-2xl text-rose-500 font-bold flex items-center gap-3 shadow-sm hover:bg-white transition-all border-0"><LogOut size={16} /> Log out</button>
          </div>
        )}
      </div>

      <>
        {isNavOpen && <div className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm" onClick={() => setIsNavOpen(false)} />}
        <div className="fixed bottom-6 right-6 z-50 flex flex-row-reverse items-center gap-3">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className="w-16 h-16 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-full text-white shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-50 ring-4 ring-white/30">
            {isNavOpen ? <X size={28} strokeWidth={2.5} /> : <Menu size={28} strokeWidth={2.5} />}
          </button>
          <div className={`flex gap-2 transition-all duration-300 origin-right ${isNavOpen ? 'scale-x-100 opacity-100 translate-x-0' : 'scale-x-0 opacity-0 translate-x-10 pointer-events-none'}`}>
            <div className="glass-panel rounded-full shadow-2xl p-2 flex gap-1 items-center pr-4">
              <FloatingNavItem icon={Home} label={copy.navHome} isActive={activeTab === TABS.OVERVIEW} onClick={() => { setActiveTab(TABS.OVERVIEW); setIsNavOpen(false); }} />
              <FloatingNavItem icon={BookOpen} label={copy.navHomework} isActive={activeTab === TABS.HOMEWORK} onClick={() => { setActiveTab(TABS.HOMEWORK); setIsNavOpen(false); }} badgeCount={stats.overdue} badgeColor="bg-rose-500" />
              <FloatingNavItem icon={BarChart2} label={copy.navStats} isActive={activeTab === TABS.ANALYTICS} onClick={() => { setActiveTab(TABS.ANALYTICS); setIsNavOpen(false); }} />
              {appUser?.role === ROLES.ADMIN && <FloatingNavItem icon={Building2} label="School" isActive={activeTab === TABS.SCHOOL} onClick={() => { setActiveTab(TABS.SCHOOL); setIsNavOpen(false); }} />}
              <FloatingNavItem icon={Settings} label={copy.navSettings} isActive={activeTab === TABS.SETTINGS} onClick={() => { setActiveTab(TABS.SETTINGS); setIsNavOpen(false); }} />
            </div>
          </div>
        </div>
      </>

      {isCreateAssignmentModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800">Add homework</h2>
              <button onClick={() => setIsCreateAssignmentModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">What is it?</label><input type="text" required value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Subject</label><select value={newAssignment.subject} onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none">{DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">{copy.notesLabel}</label><textarea value={newAssignment.description} onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })} placeholder={copy.notesPlaceholder} className="w-full bg-slate-50 p-4 rounded-2xl font-medium text-slate-700 outline-none h-24 placeholder:text-slate-400" /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCreateAssignmentModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold rounded-2xl">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-2xl">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-800">{copy.homeworkDetails}</h2><button onClick={() => setIsUploadModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button></div>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-violet-500 text-white shadow-md"><BookOpen size={24} /></div>
                <div><h3 className="font-bold text-lg text-slate-800 leading-tight">{selectedAssignment.title}</h3><p className="text-sm text-slate-500">{selectedAssignment.subject}</p></div>
              </div>
              <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-sm text-slate-600 leading-relaxed">{selectedAssignment.description || "No notes for this one."}</p></div>

              {/* Document upload / download */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">Document</h4>
                {selectedAssignment.submittedFile ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                    <span className="text-sm font-bold text-slate-700 truncate flex-1">{selectedAssignment.submittedFile}</span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => { if (!selectedAssignment.submittedPreview) return; const a = document.createElement('a'); a.href = selectedAssignment.submittedPreview; a.download = selectedAssignment.submittedFile || 'document'; a.click(); }} className="flex items-center gap-2 px-4 py-2 bg-violet-500 text-white font-bold rounded-xl text-sm hover:bg-violet-600 transition-colors">
                        <Download size={16} /> Download
                      </button>
                      <button onClick={() => { const u = { ...selectedAssignment, submittedFile: null, submittedFileType: null, submittedPreview: null, status: 'Pending' }; setSelectedAssignment(u); setAssignments(prev => prev.map(a => a.id === selectedAssignment.id ? u : a)); }} className="px-4 py-2 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-100 transition-colors">Replace</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => assignmentFileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl font-bold text-slate-600 text-sm flex items-center justify-center gap-2 hover:border-violet-300 hover:bg-violet-50/50 transition-colors">
                    <Upload size={18} /> Upload document (max 20MB)
                  </button>
                )}
              </div>

              {/* Teacher comments section */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><MessageSquare size={14} /> Note from teacher</h4>
                {appUser?.role === ROLES.TEACHER ? (
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Grade (optional)</label>
                      <input type="number" min="0" max="100" value={selectedAssignment.grade ?? ''} onChange={(e) => { const v = e.target.value; setSelectedAssignment(prev => ({ ...prev, grade: v === '' ? null : Number(v) })); setAssignments(prev => prev.map(a => a.id === selectedAssignment.id ? { ...a, grade: v === '' ? null : Number(v) } : a)); }} placeholder="0–100" className="w-full bg-slate-50 p-3 rounded-xl text-sm font-medium border border-slate-200" />
                    </div>
                    <textarea value={teacherCommentDraft} onChange={(e) => setTeacherCommentDraft(e.target.value)} placeholder="Write a note for the student..." className="w-full bg-slate-50 p-4 rounded-2xl text-sm text-slate-700 outline-none resize-none h-24 placeholder:text-slate-400 border border-slate-200 focus:border-violet-400" />
                    <button onClick={handleSaveTeacherComment} className="w-full py-2.5 bg-violet-600 text-white font-bold rounded-xl text-sm hover:bg-violet-700 transition-colors">Save note</button>
                    <button onClick={() => { logTeacherIntervention(viewingStudentKey, profileData.email, 'Comment/feedback', teacherCommentDraft); addToHistory('Intervention logged', 'success'); }} className="w-full py-2.5 bg-amber-100 text-amber-800 font-bold rounded-xl text-sm hover:bg-amber-200 transition-colors">Log intervention</button>
                  </div>
                ) : (
                  <div className="bg-amber-50/80 border border-amber-100 p-4 rounded-2xl">
                    {selectedAssignment.teacherComments ? (
                      <p className="text-sm text-slate-700 leading-relaxed">{selectedAssignment.teacherComments}</p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No note yet.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {selectedAssignment.status !== 'Completed' && <button onClick={() => { const now = getDate(0); setAssignments(prev => prev.map(x => x.id === selectedAssignment.id ? { ...x, status: 'Completed', submittedAt: now } : x)); logCompletion(selectedAssignment, viewingStudentKey); updateRecoveryProgress(viewingStudentKey, 1); setIsUploadModalOpen(false); addToHistory(`Completed: ${selectedAssignment.title}`, 'success'); }} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg hover:scale-[1.02] transition-all">{copy.completeBtn}</button>}
              <button onClick={() => handleDeleteTask(selectedAssignment.id)} className="w-full py-3 text-rose-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors"><Trash2 size={16} /> Remove</button>
            </div>
          </div>
        </div>
      )}

      {isProfileSettingsOpen && (
        <div className="fixed inset-0 z-[400] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-white pt-safe"><button onClick={() => setIsProfileSettingsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full"><ArrowLeft size={24} className="text-slate-800" /></button><h2 className="text-xl font-bold text-slate-800">{copy.profileTitle}</h2></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={() => profileImageInputRef.current?.click()}>
                <div className="w-32 h-32 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">{profileImage ? <img src={profileImage} className="w-full h-full object-cover" alt="Profile" /> : <User size={56} className="text-violet-300" />}</div>
                <div className="absolute bottom-0 right-0 bg-slate-800 text-white p-2.5 rounded-full shadow-md"><Camera size={18} /></div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Name</label>
                <input type="text" value={profileData.name} onChange={(e) => setProfileData(p => ({ ...p, name: e.target.value }))} placeholder={copy.namePlaceholder} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border border-slate-100 focus:ring-2 focus:ring-violet-300 outline-none placeholder:text-slate-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Role</label>
                <input type="text" value={appUser?.role ?? ''} readOnly disabled className="w-full bg-slate-100 p-4 rounded-2xl font-bold border border-slate-200 text-slate-600 cursor-not-allowed" />
              </div>
              {appUser?.role === ROLES.STUDENT && (
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Grade</label>
                  <select value={profileData.grade} onChange={(e) => setProfileData(p => ({ ...p, grade: e.target.value }))} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border border-slate-100 focus:ring-2 focus:ring-violet-300 outline-none appearance-none cursor-pointer" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23475569' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center' }}>
                    <option value="">Select grade</option>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">School</label>
                <input type="text" value={profileData.school} onChange={(e) => setProfileData(p => ({ ...p, school: e.target.value }))} placeholder={copy.schoolPlaceholder} className="w-full bg-slate-50 p-4 rounded-2xl font-medium border border-slate-100 focus:ring-2 focus:ring-violet-300 outline-none placeholder:text-slate-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Email</label>
                <input type="email" value={profileData.email} onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" className="w-full bg-slate-50 p-4 rounded-2xl font-medium border border-slate-100 focus:ring-2 focus:ring-violet-300 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Gamification</label>
                <select value={profileData.gamificationLevel} onChange={(e) => setProfileData(p => ({ ...p, gamificationLevel: e.target.value }))} className="w-full bg-slate-50 p-4 rounded-2xl font-medium border border-slate-100 focus:ring-2 focus:ring-violet-300 outline-none">
                  <option value="off">Off</option>
                  <option value="simple">Simple (badges)</option>
                  <option value="full">Full (badges + leaderboard)</option>
                </select>
              </div>
              {appUser?.role === ROLES.STUDENT && (
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Favorite subject</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_SUBJECTS.map(sub => (
                      <button key={sub} type="button" onClick={() => setProfileData(p => ({ ...p, favoriteSubject: p.favoriteSubject === sub ? '' : sub }))} className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border ${profileData.favoriteSubject === sub ? 'bg-violet-500 text-white border-violet-500' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{sub}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex gap-3">
            <button onClick={() => setIsProfileSettingsOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl">Cancel</button>
            <button onClick={saveProfile} className="flex-1 py-4 bg-slate-800 text-white font-bold rounded-2xl">Save</button>
          </div>
        </div>
      )}

      {isCsvImportOpen && (
        <div className="fixed inset-0 z-[300] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-black text-slate-800">Import from CSV</h2><button onClick={() => setIsCsvImportOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button></div>
            <p className="text-xs text-slate-500 mb-2">Columns: title, subject, dueDate, status, grade</p>
            <button type="button" onClick={() => csvFileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl font-bold text-slate-600 text-sm flex items-center justify-center gap-2 hover:border-violet-300 hover:bg-violet-50/50 transition-colors mb-3">
              <Upload size={18} /> Choose CSV file
            </button>
            <p className="text-[10px] text-slate-400 text-center mb-2">or paste below</p>
            <textarea value={csvImportText} onChange={(e) => setCsvImportText(e.target.value)} placeholder="title,subject,dueDate,status,grade&#10;Math homework,Math,2025-02-25,Pending,&#10;Read ch 3,English,2025-02-24,Completed,85" className="w-full h-32 p-4 rounded-xl border border-slate-200 text-sm font-mono mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setIsCsvImportOpen(false)} className="flex-1 py-3 text-slate-500 font-bold rounded-xl">Cancel</button>
              <button onClick={() => { const r = parseAssignmentsCSV(csvImportText); if (r.ok && r.items.length) { setAssignments(prev => [...r.items, ...prev]); addToHistory(`Imported ${r.items.length} assignments`, 'success'); setIsCsvImportOpen(false); setCsvImportText(''); } else if (!r.ok) addToHistory(r.error || 'Import failed', 'error'); }} className="flex-1 py-3 bg-violet-500 text-white font-bold rounded-xl">Import</button>
            </div>
          </div>
        </div>
      )}

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[400] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md h-auto rounded-t-[32px] sm:rounded-[32px] p-6 flex flex-col shadow-2xl duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-800">Filter by subject</h2><button onClick={() => setIsFilterModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button></div>
            <div className="space-y-6 mb-6">
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Subject</label><div className="flex flex-wrap gap-2"><button onClick={() => setFilterSubject('All')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border ${filterSubject === 'All' ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-slate-600 border-slate-200'}`}>All</button>{DEFAULT_SUBJECTS.map(sub => (<button key={sub} onClick={() => setFilterSubject(sub)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors border ${filterSubject === sub ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-slate-600 border-slate-200'}`}>{sub}</button>))}</div></div>
            </div>
            <div className="flex gap-3"><button onClick={() => setFilterSubject('All')} className="flex-1 py-3 font-bold text-slate-500">Reset</button><button onClick={() => setIsFilterModalOpen(false)} className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl">Apply</button></div>
          </div>
        </div>
      )}
      {isSubscriptionOpen && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-5xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 md:h-[85vh] h-auto relative">
              <div className="flex-1 p-8 md:overflow-y-auto no-scrollbar bg-slate-50">
                <div className="flex items-center gap-2 mb-2"><button onClick={() => setIsSubscriptionOpen(false)} className="md:hidden p-2 -ml-2"><ArrowLeft size={24} /></button><h2 className="text-2xl font-black text-slate-800">Unlock Potential</h2></div>
                <div className="space-y-4 mt-8">{SUBSCRIPTION_PLANS.map(plan => (<div key={plan.id} onClick={() => setSelectedPlan(plan.id)} className={`p-6 rounded-3xl border-2 cursor-pointer transition-all relative ${selectedPlan === plan.id ? 'border-violet-500 bg-white shadow-xl scale-[1.02]' : 'border-transparent bg-white shadow-sm hover:scale-[1.01]'}`}><div className="flex justify-between items-start mb-4"><div><h3 className="font-bold text-lg text-slate-800">{plan.name}</h3><p className="text-2xl font-black text-violet-600 mt-1">${plan.price}<span className="text-sm font-normal text-slate-400">/mo</span></p></div><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === plan.id ? 'bg-violet-500 border-violet-500' : 'border-slate-300'}`}>{selectedPlan === plan.id && <Check size={14} className="text-white" strokeWidth={3} />}</div></div><div className="space-y-2">{plan.features.map((f, i) => (<div key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium"><CheckCircle2 size={16} className="text-emerald-400" /> {f}</div>))}</div></div>))}</div>
              </div>
              <div className="w-full md:w-[350px] bg-slate-900 text-white p-8 flex flex-col justify-between wallpaper-auth shrink-0"><div className="backdrop-blur-sm bg-black/20 p-6 rounded-3xl"><h3 className="text-xl font-bold mb-6">Summary</h3><div className="flex justify-between items-center mb-4 text-sm"><span className="text-white/70">Selected</span><span className="font-bold">{SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan).name}</span></div><div className="border-t border-white/20 pt-4 flex justify-between items-end"><span className="text-white/70 mb-1">Total</span><span className="text-3xl font-black">${SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan).price}</span></div></div><button onClick={handleConfirmPlan} disabled={checkoutLoading} className="w-full py-4 bg-white text-violet-900 font-black rounded-2xl shadow-lg mt-8 disabled:opacity-60">{checkoutLoading ? 'Redirecting...' : 'Confirm Plan'}</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

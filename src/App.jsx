import React, { useState, useMemo, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken
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
  Sparkles
} from 'lucide-react';

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

// --- Configuration & Mock Data ---
const ROLES = { STUDENT: 'Student', PARENT: 'Parent', TEACHER: 'Teacher' };
const TABS = { OVERVIEW: 'Overview', HOMEWORK: 'Homework', SETTINGS: 'Settings' };
const HW_FILTERS = { OVERDUE: 'Overdue', DUE: 'Due', COMPLETED: 'Completed' };
const DEFAULT_SUBJECTS = ['Math', 'Science', 'History', 'English', 'Art', 'Coding'];

const getDate = (daysOffset) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const INITIAL_ASSIGNMENTS = [
  { id: 1, category: 'Self-Study', title: "Finish Physics Lab", subject: "Science", dueDate: getDate(-1), priority: "High", status: "Pending", description: "Need to finish the data analysis part." },
  { id: 2, category: 'Homework', title: "Read Chapter 4", subject: "English", dueDate: getDate(0), priority: "Medium", status: "Pending", description: "Read The Great Gatsby chapter 4 and take notes." },
  { id: 3, category: 'Project', title: "History Presentation", subject: "History", dueDate: getDate(2), priority: "High", status: "Pending", description: "Prepare slides for the Roman Empire presentation." },
];

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
const AuthScreen = ({ onLogin, isLoading }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: ROLES.STUDENT });

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin({ name: formData.name, role: formData.role, isNewUser: isSignUp });
  };

  return (
    <div className="min-h-screen wallpaper-auth flex items-center justify-center p-4 relative overflow-y-auto overflow-x-hidden text-slate-800 transition-all duration-700">
      <style>{noScrollbarStyles}</style>

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-20 right-20 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-48 h-48 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="glass-panel rounded-[32px] shadow-2xl relative overflow-hidden w-full max-w-[800px] min-h-[550px] flex shrink-0 z-10 my-8">
        <div className={`absolute top-0 h-full w-1/2 transition-all duration-700 ease-in-out left-0 flex flex-col items-center justify-center p-8 z-10 ${isSignUp ? 'translate-x-[100%] opacity-100' : 'opacity-0 z-0'}`}>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600 mb-2">Join the Club</h1>
          <p className="text-xs text-slate-500 mb-6 text-center font-medium">Your ultimate study upgrade starts here.</p>
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm focus-within:ring-2 focus-within:ring-violet-400 transition-all">
              <UserIcon size={18} className="text-violet-400" />
              <input type="text" placeholder="First Name" className="bg-transparent outline-none flex-1 text-sm font-bold text-slate-700 placeholder:text-slate-400" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Object.values(ROLES).map(r => (
                <button key={r} type="button" onClick={() => setFormData({...formData, role: r})} className={`p-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border-2 transition-all shadow-sm ${formData.role === r ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-transparent bg-white/50 text-slate-400 hover:bg-white'}`}>{r}</button>
              ))}
            </div>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm"><Mail size={18} className="text-violet-400" /><input type="email" placeholder="Email Address" className="bg-transparent outline-none flex-1 text-sm font-medium" /></div>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm"><Lock size={18} className="text-violet-400" /><input type="password" placeholder="Create Password" className="bg-transparent outline-none flex-1 text-sm font-medium" /></div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-xs mt-2 disabled:opacity-50 transition-all hover:scale-[1.02] shadow-lg shadow-violet-200">
              {isLoading ? 'Creating Space...' : 'Create Account'}
            </button>
          </form>
        </div>

        <div className={`absolute top-0 h-full w-1/2 transition-all duration-700 ease-in-out left-0 flex flex-col items-center justify-center p-8 z-20 ${isSignUp ? 'translate-x-[100%] opacity-0' : 'opacity-100'}`}>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600 mb-2">Welcome Back</h1>
          <p className="text-xs text-slate-500 mb-8 font-medium">Ready to crush your goals?</p>
          <form className="w-full space-y-4" onSubmit={handleSubmit}>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm"><Mail size={18} className="text-violet-400" /><input type="email" placeholder="Email" className="bg-transparent outline-none flex-1 text-sm font-medium" /></div>
            <div className="bg-white/50 border border-white p-3 rounded-2xl flex items-center gap-3 shadow-sm"><Lock size={18} className="text-violet-400" /><input type="password" placeholder="Password" className="bg-transparent outline-none flex-1 text-sm font-medium" /></div>
            <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-black uppercase tracking-wider text-xs mt-2 disabled:opacity-50 transition-all hover:scale-[1.02] shadow-lg shadow-violet-200">
              {isLoading ? 'Accessing...' : 'Sign In'}
            </button>
          </form>
          <button onClick={() => setIsSignUp(true)} className="text-xs font-bold text-violet-400 hover:text-violet-600 mt-6 transition-colors">New here? Create Account</button>
        </div>

        <div className={`absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-30 ${isSignUp ? '-translate-x-full' : ''}`}>
          <div className={`bg-gradient-to-br from-violet-600 to-fuchsia-700 text-white relative -left-full h-full w-[200%] transform transition-transform duration-700 ease-in-out ${isSignUp ? 'translate-x-1/2' : 'translate-x-0'}`}>
            <div className={`absolute top-0 flex flex-col items-center justify-center w-1/2 h-full px-12 text-center transform transition-transform duration-700 ease-in-out ${isSignUp ? 'translate-x-0' : '-translate-x-[20%]'}`}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm"><Sparkles size={40} className="text-yellow-300" /></div>
              <h2 className="text-3xl font-black mb-3">Hello, Friend!</h2>
              <p className="text-white/90 text-sm mb-8 leading-relaxed">Enter your personal details and start your journey with us.</p>
              <button onClick={() => setIsSignUp(false)} className="border-2 border-white/50 bg-white/10 backdrop-blur-md text-white px-10 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-white hover:text-violet-600 transition-all">Sign In</button>
            </div>
            <div className={`absolute top-0 right-0 flex flex-col items-center justify-center w-1/2 h-full px-12 text-center transform transition-transform duration-700 ease-in-out ${isSignUp ? 'translate-x-[20%]' : 'translate-x-0'}`}>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-sm"><Target size={40} className="text-cyan-300" /></div>
              <h2 className="text-3xl font-black mb-3">Welcome Back!</h2>
              <p className="text-white/90 text-sm mb-8 leading-relaxed">To keep connected with us please login with your personal info.</p>
              <button onClick={() => setIsSignUp(true)} className="border-2 border-white/50 bg-white/10 backdrop-blur-md text-white px-10 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-white hover:text-violet-600 transition-all">Sign Up</button>
            </div>
          </div>
        </div>
      </div>
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
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro');

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterSubject, setFilterSubject] = useState('All');

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateAssignmentModalOpen, setIsCreateAssignmentModalOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', subject: 'Math', dueDate: '', priority: 'Medium', description: '' });
  const [viewMode, setViewMode] = useState('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(getDate(0));

  const [studyStreak, setStudyStreak] = useState(12);
  const [pairingCode] = useState("ALEX-8821");

  const profileImageInputRef = useRef(null);
  const assignmentFileInputRef = useRef(null);

  const motivationalQuote = useMemo(() => {
    const quotes = [
      "Small progress is still progress. Keep going!",
      "Believe you can and you're halfway there.",
      "Don't watch the clock; do what it does. Keep going.",
      "Success is the sum of small efforts, repeated.",
      "The secret of getting ahead is getting started.",
      "Focus on being productive instead of busy.",
      "You are capable of amazing things.",
      "Mistakes are proof that you are trying.",
      "Take a deep breath. You got this!",
      "Work hard in silence, let your success be your noise."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, []);

  const getBackgroundClass = () => {
    switch(activeTab) {
      case TABS.OVERVIEW: return 'wallpaper-overview';
      case TABS.HOMEWORK: return 'wallpaper-planner';
      case TABS.SETTINGS: return 'wallpaper-settings';
      default: return 'wallpaper-overview';
    }
  };

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
    const assignment = { id: Date.now(), category: 'Homework', status: 'Pending', ...newAssignment, dueDate: effectiveDueDate };
    setAssignments(prev => [assignment, ...prev]);
    setIsCreateAssignmentModalOpen(false);
    addToHistory(`Submitted: ${newAssignment.title}`, 'success');
    setNewAssignment({ title: '', subject: 'Math', dueDate: '', priority: 'Medium', description: '' });
  };

  const handleDayClick = (dateStr) => setSelectedDate(dateStr);

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

  const stats = useMemo(() => {
    const today = getDate(0);
    const overdue = assignments.filter(a => a.status !== 'Completed' && a.status !== 'Submitted' && a.dueDate < today).length;
    const dueTodayOrFuture = assignments.filter(a => a.status !== 'Completed' && a.status !== 'Submitted' && a.dueDate >= today).length;
    const completed = assignments.filter(a => a.status === 'Completed' || a.status === 'Submitted').length;
    return { overdue, dueToday: dueTodayOrFuture, completed };
  }, [assignments]);

  const homeworkForSelectedDate = useMemo(() => {
    return assignments.filter(a => a.dueDate === selectedDate);
  }, [assignments, selectedDate]);

  if (authLoading) return (
    <div className="h-[100dvh] wallpaper-auth flex flex-col items-center justify-center space-y-4 relative overflow-hidden">
      <RefreshCw className="text-white animate-spin" size={32} />
      <p className="text-sm font-bold text-white animate-pulse tracking-widest uppercase">Launching...</p>
    </div>
  );

  if (!appUser) return <AuthScreen onLogin={handleB2CLogin} isLoading={auth ? !user : false} />;

  return (
    <div className={`h-[100dvh] w-full ${getBackgroundClass()} font-sans relative flex flex-col overflow-hidden transition-all duration-1000`}>
      <style>{noScrollbarStyles}</style>

      <input type="file" ref={profileImageInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleProfileImageChange} />
      <input type="file" ref={assignmentFileInputRef} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.txt,.jpg,.png" onChange={handleAssignmentFileChange} />

      <div className={`flex-1 flex flex-col min-h-0 z-10 no-scrollbar overflow-y-auto w-full max-w-5xl mx-auto px-8 md:px-20 pb-40 pt-12 md:pt-16`}>

        {activeTab === TABS.OVERVIEW && (
          <div className="space-y-8 animate-in fade-in text-slate-800">
            <div className="flex items-center justify-between mb-8">
              <div className="glass-panel px-6 py-3 rounded-2xl">
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-700 to-fuchsia-600">My Space</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-slate-600 font-bold text-sm">Hi, {appUser.name}</p>
                  {appUser.role === ROLES.STUDENT && (
                    <div className="flex items-center gap-1 bg-gradient-to-r from-orange-400 to-red-500 px-2 py-0.5 rounded-full text-white shadow-sm">
                      <Flame size={10} fill="currentColor" />
                      <span className="text-[10px] font-black">{studyStreak} Day Streak</span>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setIsProfileSettingsOpen(true)} className="w-14 h-14 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-violet-500 overflow-hidden border-2 border-white transition-transform hover:scale-105">
                {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : (appUser.role === ROLES.STUDENT ? <User /> : appUser.role === ROLES.TEACHER ? <GraduationCap /> : <Users />)}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div onClick={() => { setActiveTab(TABS.HOMEWORK); setHwFilter(HW_FILTERS.OVERDUE); }} className="glass-card p-10 rounded-3xl shadow-sm cursor-pointer hover:bg-white/80 transition-all group">
                <h3 className="text-xs font-bold text-rose-500 mb-2 group-hover:scale-105 transition-transform origin-left uppercase tracking-wider">Missed</h3>
                <p className="text-2xl font-black text-rose-600">{stats.overdue}</p>
              </div>
              <div onClick={() => { setActiveTab(TABS.HOMEWORK); setHwFilter(HW_FILTERS.DUE); }} className="glass-card p-10 rounded-3xl shadow-sm cursor-pointer hover:bg-white/80 transition-all group">
                <h3 className="text-xs font-bold text-violet-500 mb-2 group-hover:scale-105 transition-transform origin-left uppercase tracking-wider">To Do</h3>
                <p className="text-2xl font-black text-violet-600">{stats.dueToday}</p>
              </div>
              <div onClick={() => { setActiveTab(TABS.HOMEWORK); setHwFilter(HW_FILTERS.COMPLETED); }} className="glass-card p-10 rounded-3xl shadow-sm col-span-2 md:col-span-1 cursor-pointer hover:bg-white/80 transition-all group">
                <h3 className="text-xs font-bold text-emerald-500 mb-2 group-hover:scale-105 transition-transform origin-left uppercase tracking-wider">Done</h3>
                <p className="text-2xl font-black text-emerald-600">{stats.completed}</p>
              </div>
            </div>

            <div className="glass-panel rounded-[32px] p-8 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl flex items-center gap-2 text-slate-800"><Target size={24} className="text-cyan-500" /> Focus Area</h3>
              </div>
              <div className="mb-6 bg-violet-50 p-3 rounded-2xl border border-violet-100 flex items-center gap-3">
                <div className="bg-white p-2 rounded-full text-violet-500 shadow-sm shrink-0">
                  <Sparkles size={14} fill="currentColor" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-0.5">Study Tip</p>
                  <p className="text-xs font-bold text-slate-700 leading-snug">"{motivationalQuote}"</p>
                </div>
              </div>
              {assignments.filter(a => a.status === 'Pending').length > 0 ? (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-3xl border border-orange-100 flex items-start gap-4">
                  <div className="bg-white p-3 rounded-2xl text-orange-500 shadow-md transform -rotate-3 shrink-0">
                    <Zap size={24} fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Up Next</p>
                    <h4 className="font-bold text-slate-800 text-xl leading-tight">{assignments.find(a => a.status === 'Pending').title}</h4>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Due {new Date(assignments.find(a => a.status === 'Pending').dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <p className="font-medium">All caught up! 🎉</p>
                  <p className="text-sm mt-1">Great job clearing your list.</p>
                </div>
              )}
            </div>

            <div className="glass-panel rounded-[32px] p-8 shadow-lg">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><History size={20} className="text-violet-400" /> Recent Vibes</h3>
              <div className="space-y-4">
                {recentHistory.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 border-b border-slate-100/50 pb-3 last:border-0">
                    <div className={`w-3 h-3 rounded-full shadow-sm ${item.type === 'success' ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                    <div><p className="text-sm font-bold text-slate-700">{item.title}</p><p className="text-[10px] text-slate-400 font-medium">{item.time}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === TABS.HOMEWORK && (
          <div className="animate-in slide-in-from-bottom-4 text-slate-800">
            <div className="flex items-center justify-between mb-6">
              <div className="glass-panel px-4 py-2 rounded-xl">
                <h2 className="text-2xl font-black text-slate-800">My Homework</h2>
              </div>
              <div className="flex gap-2 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl shadow-sm">
                <button onClick={() => setIsFilterModalOpen(true)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${filterSubject !== 'All' ? 'bg-violet-500 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}><Filter size={20} /></button>
                <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${viewMode === 'calendar' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-white/50'}`}><Calendar size={20} /></button>
                <button onClick={() => setIsCreateAssignmentModalOpen(true)} className="w-10 h-10 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl text-white flex items-center justify-center shadow-lg hover:scale-105 transition-transform"><Plus size={24} /></button>
              </div>
            </div>

            {viewMode === 'list' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="glass-panel p-1 rounded-2xl flex relative overflow-hidden shadow-sm flex-1">
                    <div className="absolute top-1 bottom-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl transition-all duration-300 shadow-md z-0" style={{ width: '33.33%', left: hwFilter === HW_FILTERS.OVERDUE ? '0' : hwFilter === HW_FILTERS.DUE ? '33.33%' : '66.66%' }} />
                    {Object.values(HW_FILTERS).map(f => (<button key={f} onClick={() => setHwFilter(f)} className={`flex-1 py-2 text-xs font-bold relative z-10 transition-colors ${hwFilter === f ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}>{f}</button>))}
                  </div>
                </div>
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
                    .map(a => (
                      <div key={a.id} onClick={() => { setSelectedAssignment(a); setIsUploadModalOpen(true); }} className="glass-card p-4 rounded-2xl shadow-sm flex items-start gap-4 cursor-pointer hover:bg-white transition-colors border-0">
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800">{a.title}</h4>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{a.subject} • Due {a.dueDate}</p>
                        </div>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wide ${(a.status === 'Completed' || a.status === 'Submitted') ? 'bg-emerald-100 text-emerald-600' : (a.dueDate < getDate(0) ? 'bg-rose-100 text-rose-600' : 'bg-violet-100 text-violet-600')}`}>{a.dueDate < getDate(0) && a.status !== 'Completed' ? 'Overdue' : a.status}</span>
                      </div>
                    ))}
                  {assignments.length === 0 && <div className="text-center p-8 text-white/70 font-medium">No tasks yet.</div>}
                </div>
              </div>
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
                    <button onClick={() => setIsCreateAssignmentModalOpen(true)} className="text-xs font-black text-violet-500 uppercase tracking-widest hover:bg-violet-50 px-3 py-1.5 rounded-xl transition-colors">+ Submit Task</button>
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
                        <p className="text-sm font-bold">No homework scheduled for this day.</p>
                        <p className="text-[10px] mt-1 font-medium">Enjoy your break! 🎉</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === TABS.SETTINGS && (
          <div className="space-y-6 text-slate-800">
            <div className="glass-panel px-4 py-2 rounded-xl mb-4 inline-block"><h2 className="text-2xl font-black text-slate-800">Settings</h2></div>
            <div onClick={() => setIsProfileSettingsOpen(true)} className="glass-card p-6 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer hover:bg-white/90 transition-all border-0">
              <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 text-2xl font-bold overflow-hidden border-4 border-white shadow-md">
                {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : appUser.role[0]}
              </div>
              <div><h3 className="font-bold text-slate-800 text-lg">My Profile</h3><p className="text-xs text-slate-500 font-medium">Edit details & preferences</p></div>
              <div className="ml-auto text-violet-300"><ChevronRight size={24} /></div>
            </div>
            <div onClick={() => setIsSubscriptionOpen(true)} className="glass-card p-6 rounded-3xl shadow-sm flex items-center gap-4 cursor-pointer hover:bg-white/90 transition-all border-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-md"><Sparkles size={28} /></div>
              <div><h3 className="font-bold text-slate-800 text-lg">Premium Plan</h3><p className="text-xs text-slate-500 font-medium">Unlock stats & AI help</p></div>
              <div className="ml-auto text-violet-300"><ChevronRight size={24} /></div>
            </div>
            <button onClick={handleSignOut} className="w-full glass-card p-4 rounded-2xl text-rose-500 font-bold flex items-center gap-3 shadow-sm hover:bg-white transition-all border-0"><LogOut size={16} /> Sign Out</button>
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
              <FloatingNavItem icon={Home} label="Home" isActive={activeTab === TABS.OVERVIEW} onClick={() => { setActiveTab(TABS.OVERVIEW); setIsNavOpen(false); }} />
              <FloatingNavItem icon={BookOpen} label="Homework" isActive={activeTab === TABS.HOMEWORK} onClick={() => { setActiveTab(TABS.HOMEWORK); setIsNavOpen(false); }} badgeCount={stats.overdue} badgeColor="bg-rose-500" />
              <FloatingNavItem icon={Settings} label="Settings" isActive={activeTab === TABS.SETTINGS} onClick={() => { setActiveTab(TABS.SETTINGS); setIsNavOpen(false); }} />
            </div>
          </div>
        </div>
      </>

      {isCreateAssignmentModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-800">Submit Homework</h2>
              <button onClick={() => setIsCreateAssignmentModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Title</label><input type="text" required value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Subject</label><select value={newAssignment.subject} onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none">{DEFAULT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Notes</label><textarea value={newAssignment.description} onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })} className="w-full bg-slate-50 p-4 rounded-2xl font-medium text-slate-700 outline-none h-24" /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsCreateAssignmentModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold rounded-2xl">Cancel</button>
                <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-2xl">Submit Homework</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isUploadModalOpen && selectedAssignment && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-800">Task Details</h2><button onClick={() => setIsUploadModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button></div>
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-violet-500 text-white shadow-md"><BookOpen size={24} /></div>
                <div><h3 className="font-bold text-lg text-slate-800 leading-tight">{selectedAssignment.title}</h3><p className="text-sm text-slate-500">{selectedAssignment.subject}</p></div>
              </div>
              <div className="bg-slate-50 p-5 rounded-3xl"><p className="text-sm text-slate-600 leading-relaxed">{selectedAssignment.description || "No notes."}</p></div>
            </div>
            <div className="flex flex-col gap-2">
              {selectedAssignment.status !== 'Completed' && <button onClick={() => { setAssignments(prev => prev.map(a => a.id === selectedAssignment.id ? { ...a, status: 'Completed' } : a)); setIsUploadModalOpen(false); addToHistory(`Completed: ${selectedAssignment.title}`, 'success'); }} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg hover:scale-[1.02] transition-all">Mark as Complete</button>}
              <button onClick={() => handleDeleteTask(selectedAssignment.id)} className="w-full py-3 text-rose-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors"><Trash2 size={16} /> Cancel Task</button>
            </div>
          </div>
        </div>
      )}

      {isProfileSettingsOpen && (
        <div className="fixed inset-0 z-[400] bg-white flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-white pt-safe"><button onClick={() => setIsProfileSettingsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full"><ArrowLeft size={24} className="text-slate-800" /></button><h2 className="text-xl font-bold text-slate-800">Edit Profile</h2></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8"><div className="flex flex-col items-center"><div className="relative group cursor-pointer" onClick={() => profileImageInputRef.current?.click()}><div className="w-32 h-32 rounded-full bg-violet-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">{profileImage ? <img src={profileImage} className="w-full h-full object-cover" alt="Profile" /> : <User size={56} className="text-violet-300" />}</div><div className="absolute bottom-0 right-0 bg-slate-800 text-white p-2.5 rounded-full shadow-md"><Camera size={18} /></div></div></div><div className="space-y-4"><div><label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Name</label><input type="text" value={appUser.name} disabled className="w-full bg-slate-50 p-4 rounded-2xl font-bold" /></div></div></div>
          <div className="p-6 border-t border-slate-100"><button onClick={() => setIsProfileSettingsOpen(false)} className="w-full py-4 bg-slate-800 text-white font-bold rounded-2xl">Close</button></div>
        </div>
      )}

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[400] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md h-auto rounded-t-[32px] sm:rounded-[32px] p-6 flex flex-col shadow-2xl duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black text-slate-800">Filter Homework</h2><button onClick={() => setIsFilterModalOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button></div>
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
              <div className="w-full md:w-[350px] bg-slate-900 text-white p-8 flex flex-col justify-between wallpaper-auth shrink-0"><div className="backdrop-blur-sm bg-black/20 p-6 rounded-3xl"><h3 className="text-xl font-bold mb-6">Summary</h3><div className="flex justify-between items-center mb-4 text-sm"><span className="text-white/70">Selected</span><span className="font-bold">{SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan).name}</span></div><div className="border-t border-white/20 pt-4 flex justify-between items-end"><span className="text-white/70 mb-1">Total</span><span className="text-3xl font-black">${SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan).price}</span></div></div><button onClick={() => { setIsSubscriptionOpen(false); addToHistory('Plan updated', 'success'); }} className="w-full py-4 bg-white text-violet-900 font-black rounded-2xl shadow-lg mt-8">Confirm Plan</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

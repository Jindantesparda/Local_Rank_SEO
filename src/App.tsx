import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  Sparkles,
  FileText,
  Settings,
  CreditCard,
  RefreshCw,
  Play,
  ArrowRight,
  ChevronRight,
  Plus,
  Search,
  AlertTriangle
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { OnboardingModal } from './components/OnboardingModal';
import { AuditProgress } from './components/AuditProgress';
import { DashboardView } from './components/DashboardView';
import { WebsiteAuditView } from './components/WebsiteAuditView';
import { RecommendationsView } from './components/RecommendationsView';
import { PagesView } from './components/PagesView';
import { SettingsView } from './components/SettingsView';
import { BillingView } from './components/BillingView';
import { EditFixModal } from './components/EditFixModal';
import { PageGeneratorModal } from './components/PageGeneratorModal';
import { AuthModal } from './components/AuthModal';
import { EmailVerificationBanner } from './components/EmailVerificationBanner';
import {
  SEED_USER_DANTE,
  SEED_BIZ_MANICA,
  SEED_BIZ_ABC_PLUMBING,
  SEED_AUDIT_MANICA,
  SEED_AUDIT_ABC_PLUMBING,
} from './data/seedData';
import { DEMO_AUDIT_HARARE_DENTAL } from './data/demoData';
import { AuditResult, Business, SeoIssue, User, SubscriptionTier } from './types';
import { PLAN_CONFIGS, canUserRunAudit, canUserAddBusiness } from './config/plans';

type ActiveView = 'landing' | 'dashboard' | 'audit' | 'recommendations' | 'pages' | 'settings' | 'billing';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  // Hierarchy: User -> Businesses -> Audits
  const [currentUser, setCurrentUser] = useState<User | null>(SEED_USER_DANTE);
  const [businesses, setBusinesses] = useState<Business[]>([SEED_BIZ_MANICA, SEED_BIZ_ABC_PLUMBING]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>(SEED_BIZ_MANICA.id);
  const [audits, setAudits] = useState<AuditResult[]>([SEED_AUDIT_MANICA, SEED_AUDIT_ABC_PLUMBING]);

  // Modals & Popups
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('login');
  const [selectedFixIssue, setSelectedFixIssue] = useState<SeoIssue | null>(null);
  const [selectedPageDraftIssue, setSelectedPageDraftIssue] = useState<SeoIssue | null>(null);
  const [limitAlert, setLimitAlert] = useState<string | null>(null);

  // Audit Execution state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditingBusiness, setAuditingBusiness] = useState<Business | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditComplete, setAuditComplete] = useState(false);
  const [pendingGuestAudit, setPendingGuestAudit] = useState<AuditResult | null>(null);

  // Load from localStorage on mount (if previous custom session exists)
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('localrank_v2_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
      const savedBiz = localStorage.getItem('localrank_v2_businesses');
      if (savedBiz) {
        setBusinesses(JSON.parse(savedBiz));
      }
      const savedAudits = localStorage.getItem('localrank_v2_audits');
      if (savedAudits) {
        setAudits(JSON.parse(savedAudits));
      }
      const savedActiveBizId = localStorage.getItem('localrank_v2_active_biz');
      if (savedActiveBizId) {
        setActiveBusinessId(savedActiveBizId);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, []);

  // Save changes to localStorage helper
  const persistState = (
    user: User | null,
    bizList: Business[],
    auditList: AuditResult[],
    actBizId: string
  ) => {
    try {
      if (user) {
        localStorage.setItem('localrank_v2_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('localrank_v2_user');
      }
      localStorage.setItem('localrank_v2_businesses', JSON.stringify(bizList));
      localStorage.setItem('localrank_v2_audits', JSON.stringify(auditList));
      localStorage.setItem('localrank_v2_active_biz', actBizId);
    } catch (e) {
      console.warn(e);
    }
  };

  // Derive active business and active audit
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0] || null;
  const currentAudit = audits.find((a) => a.businessId === activeBusiness?.id) || audits[0] || null;

  // Filter businesses belonging to current user
  const userBusinesses = businesses.filter((b) => !currentUser || b.userId === currentUser.id);

  // Business Switcher handler
  const handleSelectBusiness = (businessId: string) => {
    setActiveBusinessId(businessId);
    persistState(currentUser, businesses, audits, businessId);
  };

  // Add new business handler with plan check
  const handleAddNewBusiness = () => {
    if (!currentUser) {
      setAuthInitialMode('signup');
      setIsAuthOpen(true);
      return;
    }

    const check = canUserAddBusiness({
      subscriptionTier: currentUser.subscription?.plan || currentUser.subscriptionTier,
      businessCount: userBusinesses.length,
    });

    if (!check.allowed) {
      setLimitAlert(check.reason || 'Upgrade required to add more businesses.');
      setTimeout(() => setLimitAlert(null), 6000);
      setActiveView('billing');
      return;
    }

    setIsOnboardingOpen(true);
  };

  // Pre-audit check for usage limits
  const handleTriggerAuditModal = () => {
    if (!currentUser) {
      // Guest can crawl a website as part of the growth hack acquisition funnel!
      setIsOnboardingOpen(true);
      return;
    }

    const check = canUserRunAudit({
      subscriptionTier: currentUser.subscription?.plan || currentUser.subscriptionTier,
      usage: currentUser.usage,
    });

    if (!check.allowed) {
      setLimitAlert(check.reason || "You've reached your audit limit.");
      setTimeout(() => setLimitAlert(null), 7000);
      setActiveView('billing');
      return;
    }

    setIsOnboardingOpen(true);
  };

  // Run audit handler
  const handleStartRealAudit = async (business: Business, maxPages: number) => {
    setIsOnboardingOpen(false);
    setAuditingBusiness(business);
    setIsAuditing(true);
    setAuditError(null);
    setAuditComplete(false);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business, maxPages }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Website crawl failed.');
      }

      const newAudit: AuditResult = data.audit;

      if (!currentUser) {
        // Growth hack funnel: hold pending audit until account created
        setPendingGuestAudit(newAudit);
      } else {
        // Associate business with user
        const bizWithUser = { ...business, userId: currentUser.id };
        const updatedBizList = [bizWithUser, ...businesses.filter((b) => b.id !== business.id)];
        const updatedAudits = [newAudit, ...audits.filter((a) => a.id !== newAudit.id)];
        const updatedUser: User = {
          ...currentUser,
          usage: {
            ...currentUser.usage,
            auditsUsed: currentUser.usage.auditsUsed + 1,
            pagesCrawled: currentUser.usage.pagesCrawled + newAudit.pagesAnalyzed,
          },
          businessIds: Array.from(new Set([...currentUser.businessIds, bizWithUser.id])),
        };

        setBusinesses(updatedBizList);
        setAudits(updatedAudits);
        setActiveBusinessId(bizWithUser.id);
        setCurrentUser(updatedUser);
        persistState(updatedUser, updatedBizList, updatedAudits, bizWithUser.id);
      }

      setAuditComplete(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to complete website crawl';
      setAuditError(msg);
    }
  };

  const handleFinishAuditView = () => {
    setIsAuditing(false);
    setAuditComplete(false);
    setActiveView('dashboard');
  };

  // Start Demo handler
  const handleStartDemo = () => {
    const demoBiz = DEMO_AUDIT_HARARE_DENTAL.business;
    const updatedBizList = [demoBiz, ...businesses.filter((b) => b.id !== demoBiz.id)];
    const updatedAudits = [DEMO_AUDIT_HARARE_DENTAL, ...audits.filter((a) => a.id !== DEMO_AUDIT_HARARE_DENTAL.id)];
    setBusinesses(updatedBizList);
    setAudits(updatedAudits);
    setActiveBusinessId(demoBiz.id);
    setActiveView('dashboard');
    persistState(currentUser, updatedBizList, updatedAudits, demoBiz.id);
  };

  // User auth handlers
  const handleUserLogin = (user: User) => {
    setCurrentUser(user);

    // If guest had a completed audit ready in the growth hack funnel, attach it!
    if (pendingGuestAudit) {
      const attachedBiz = { ...pendingGuestAudit.business, userId: user.id };
      const updatedBizList = [attachedBiz, ...businesses];
      const updatedAudits = [pendingGuestAudit, ...audits];
      const updatedUser: User = {
        ...user,
        businessIds: [attachedBiz.id, ...user.businessIds],
        usage: {
          ...user.usage,
          auditsUsed: user.usage.auditsUsed + 1,
        },
      };

      setBusinesses(updatedBizList);
      setAudits(updatedAudits);
      setActiveBusinessId(attachedBiz.id);
      setCurrentUser(updatedUser);
      setPendingGuestAudit(null);
      setIsAuditing(false);
      setAuditComplete(false);
      setActiveView('dashboard');
      persistState(updatedUser, updatedBizList, updatedAudits, attachedBiz.id);
      return;
    }

    persistState(user, businesses, audits, activeBusinessId);
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    setActiveView('landing');
    try {
      localStorage.removeItem('localrank_v2_user');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeleteAccount = () => {
    setCurrentUser(null);
    setBusinesses([]);
    setAudits([]);
    setActiveView('landing');
    try {
      localStorage.clear();
    } catch (e) {
      console.warn(e);
    }
  };

  const handleUpdateBusiness = (updated: Business) => {
    const updatedBizList = businesses.map((b) => (b.id === updated.id ? updated : b));
    setBusinesses(updatedBizList);
    if (currentAudit) {
      const updatedAudit = { ...currentAudit, business: updated };
      const updatedAudits = audits.map((a) => (a.id === updatedAudit.id ? updatedAudit : a));
      setAudits(updatedAudits);
      persistState(currentUser, updatedBizList, updatedAudits, updated.id);
    }
  };

  const handleUpdateUser = (updated: User) => {
    setCurrentUser(updated);
    persistState(updated, businesses, audits, activeBusinessId);
  };

  const handleVerifyEmailNow = () => {
    if (!currentUser) return;
    const updated: User = { ...currentUser, emailVerified: true };
    setCurrentUser(updated);
    persistState(updated, businesses, audits, activeBusinessId);
  };

  const handleSelectTier = (tier: SubscriptionTier) => {
    if (!currentUser) {
      setAuthInitialMode('signup');
      setIsAuthOpen(true);
      return;
    }
    const updated: User = {
      ...currentUser,
      subscription: {
        ...currentUser.subscription,
        plan: tier,
      },
      subscriptionTier: tier,
    };
    setCurrentUser(updated);
    persistState(updated, businesses, audits, activeBusinessId);
  };

  return (
    <div className="min-h-screen ethereal-bg text-slate-800 flex flex-col selection:bg-sky-200 selection:text-sky-900 font-sans relative overflow-x-hidden">
      {/* Ambient glowing pastel diffuse spheres matching reference design */}
      <div className="fixed top-[-10%] right-[-5%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-indigo-200/35 via-purple-200/30 to-pink-200/25 blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-sky-200/40 via-blue-200/30 to-teal-100/25 blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-[35%] left-[20%] w-[450px] h-[450px] rounded-full bg-gradient-to-r from-pink-200/20 via-purple-100/20 to-sky-100/20 blur-3xl pointer-events-none -z-10" />

      {/* Email Verification Banner (Requirement 3) */}
      {currentUser && (
        <EmailVerificationBanner
          email={currentUser.email}
          isVerified={currentUser.emailVerified}
          onVerifyNow={handleVerifyEmailNow}
          onResendLink={() => console.log('Resending verification link...')}
        />
      )}

      {/* Top Usage Limit Alert Bar (Requirement 12) */}
      {limitAlert && (
        <div className="bg-amber-500 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-5xl mx-auto">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{limitAlert}</span>
          </div>
          <button
            onClick={() => setLimitAlert(null)}
            className="text-white/80 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Navigation with Business Switcher & User Profile */}
      <Navbar
        currentAudit={currentAudit}
        currentUser={currentUser}
        userBusinesses={userBusinesses}
        activeBusiness={activeBusiness}
        onSelectBusiness={handleSelectBusiness}
        onAddNewBusiness={handleAddNewBusiness}
        onOpenAuditModal={handleTriggerAuditModal}
        onLoadDemo={handleStartDemo}
        onOpenAuth={() => {
          setAuthInitialMode('login');
          setIsAuthOpen(true);
        }}
        onGoHome={() => setActiveView(currentAudit ? 'dashboard' : 'landing')}
        onLogout={handleUserLogout}
        activeView={activeView}
        setActiveView={(v) => setActiveView(v as ActiveView)}
      />

      {/* Main Content Area */}
      {isAuditing && auditingBusiness ? (
        <AuditProgress
          business={auditingBusiness}
          isComplete={auditComplete}
          error={auditError}
          isGuest={!currentUser}
          onViewResults={handleFinishAuditView}
          onRequestSignUp={() => {
            setAuthInitialMode('signup');
            setIsAuthOpen(true);
          }}
          onRetry={() => {
            setIsAuditing(false);
            setIsOnboardingOpen(true);
          }}
        />
      ) : activeView === 'landing' || !currentAudit ? (
        <LandingPage
          onStartAudit={handleTriggerAuditModal}
          onTryDemo={handleStartDemo}
        />
      ) : (
        <div className="flex-1 max-w-[1520px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
          {/* Floating Frosted Glass Canvas Tablet matching reference design */}
          <div className="glass-canvas rounded-[32px] sm:rounded-[40px] p-4 sm:p-6 lg:p-7 shadow-[0_25px_60px_-15px_rgba(148,163,204,0.28)] flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar Navigation */}
            <aside className="w-full lg:w-60 shrink-0 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Profile Widget with Business Name */}
                <div className="flex items-center gap-3 p-2 bg-white/60 backdrop-blur-md rounded-2xl border border-white/80 shadow-2xs">
                  <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-pink-400 via-purple-300 to-sky-300 shrink-0 shadow-xs">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-xs text-slate-800">
                      {currentAudit.business.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate">
                      {currentAudit.business.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {currentAudit.business.location || 'Local Business'}
                    </p>
                  </div>
                </div>

                {/* Nav items styled with soft curved pills */}
                <nav className="space-y-1.5">
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs transition text-left cursor-pointer ${
                      activeView === 'dashboard'
                        ? 'bg-sky-50/90 text-sky-600 font-bold border border-sky-100/90 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 font-medium'
                    }`}
                    id="nav-tab-dashboard"
                  >
                    <Clock className="w-4 h-4 text-sky-500" />
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => setActiveView('audit')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition text-left cursor-pointer ${
                      activeView === 'audit'
                        ? 'bg-sky-50/90 text-sky-600 font-bold border border-sky-100/90 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 font-medium'
                    }`}
                    id="nav-tab-audit"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Website Audit</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeView === 'audit'
                          ? 'bg-sky-500 text-white'
                          : 'bg-white/80 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      {currentAudit.issues.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveView('recommendations')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition text-left cursor-pointer ${
                      activeView === 'recommendations'
                        ? 'bg-sky-50/90 text-sky-600 font-bold border border-sky-100/90 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 font-medium'
                    }`}
                    id="nav-tab-recommendations"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4" />
                      <span>Recommendations</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeView === 'recommendations'
                          ? 'bg-sky-500 text-white'
                          : 'bg-purple-100/80 text-purple-700'
                      }`}
                    >
                      Top 5
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveView('pages')}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition text-left cursor-pointer ${
                      activeView === 'pages'
                        ? 'bg-sky-50/90 text-sky-600 font-bold border border-sky-100/90 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 font-medium'
                    }`}
                    id="nav-tab-pages"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4" />
                      <span>Pages</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        activeView === 'pages'
                          ? 'bg-sky-500 text-white'
                          : 'bg-white/80 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      {currentAudit.pages.length}
                    </span>
                  </button>

                  <div className="pt-2 my-1 border-t border-slate-200/60" />

                  <button
                    onClick={() => setActiveView('settings')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs transition text-left cursor-pointer ${
                      activeView === 'settings'
                        ? 'bg-sky-50/90 text-sky-600 font-bold border border-sky-100/90 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 font-medium'
                    }`}
                    id="nav-tab-settings"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>

                  <button
                    onClick={() => setActiveView('billing')}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs transition text-left cursor-pointer ${
                      activeView === 'billing'
                        ? 'bg-sky-50/90 text-sky-600 font-bold border border-sky-100/90 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/60 font-medium'
                    }`}
                    id="nav-tab-billing"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Billing</span>
                  </button>
                </nav>
              </div>

              {/* Bottom Pro Card */}
              <div className="pt-6 space-y-4">
                <div className="bg-gradient-to-br from-sky-50/90 via-purple-50/70 to-pink-50/60 border border-white/90 rounded-3xl p-3.5 text-center space-y-2 shadow-2xs backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-full bg-white/90 text-sky-500 mx-auto flex items-center justify-center shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Weekly SEO Tracking</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Automated crawls & rank alerts</p>
                  </div>
                  <button
                    onClick={() => setActiveView('billing')}
                    className="w-full py-1.5 px-3 rounded-full bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs hover:shadow-xs transition cursor-pointer"
                  >
                    Upgrade Plan
                  </button>
                </div>

                <div className="flex items-center justify-between px-2 text-xs font-medium text-slate-500">
                  <span>Light mode</span>
                  <div className="w-9 h-5 bg-sky-400 rounded-full p-0.5 flex items-center justify-end shadow-inner cursor-pointer">
                    <div className="w-4 h-4 rounded-full bg-white shadow-2xs" />
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Workstation */}
            <main className="flex-1 min-w-0 flex flex-col">
              {/* Top Search and Action Pill Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search issues, pages, keywords..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-white/90 rounded-full text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-400/30 backdrop-blur-md"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={handleTriggerAuditModal}
                    className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-full shadow-xs hover:shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                    id="btn-main-run-audit"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Run Website Audit</span>
                  </button>
                </div>
              </div>

              {/* Views */}
              <div className="flex-1">
                {activeView === 'dashboard' && (
                  <DashboardView
                    audit={currentAudit}
                    userTier={currentUser?.subscriptionTier || currentUser?.subscription?.plan || 'free'}
                    userName={currentUser?.name}
                    onOpenAuditModal={handleTriggerAuditModal}
                    onRunNewAudit={handleTriggerAuditModal}
                    onSelectIssue={(issue) => {
                      if (issue.actionType === 'generate_page' || issue.pageDraft) {
                        setSelectedPageDraftIssue(issue);
                      } else {
                        setSelectedFixIssue(issue);
                      }
                    }}
                    onOpenPageGenerator={(issue) => setSelectedPageDraftIssue(issue)}
                    onNavigateTab={(tab) => setActiveView(tab as ActiveView)}
                  />
                )}

                {activeView === 'audit' && (
                  <WebsiteAuditView
                    audit={currentAudit}
                    userTier={currentUser?.subscriptionTier || currentUser?.subscription?.plan || 'free'}
                    onOpenFixModal={(issue) => {
                      if (issue.actionType === 'generate_page' || issue.pageDraft) {
                        setSelectedPageDraftIssue(issue);
                      } else {
                        setSelectedFixIssue(issue);
                      }
                    }}
                    onNavigateBilling={() => setActiveView('billing')}
                  />
                )}

                {activeView === 'recommendations' && (
                  <RecommendationsView
                    audit={currentAudit}
                    onOpenFixModal={(issue) => setSelectedFixIssue(issue)}
                    onOpenPageGenerator={(issue) => setSelectedPageDraftIssue(issue)}
                  />
                )}

                {activeView === 'pages' && <PagesView audit={currentAudit} />}

                {activeView === 'settings' && (
                  <SettingsView
                    business={currentAudit.business}
                    currentUser={currentUser}
                    onUpdateBusiness={handleUpdateBusiness}
                    onUpdateUser={handleUpdateUser}
                    onDeleteAccount={handleDeleteAccount}
                    onLogout={handleUserLogout}
                    onReRunAudit={() => handleStartRealAudit(currentAudit.business, 15)}
                    onNavigateToBilling={() => setActiveView('billing')}
                  />
                )}

                {activeView === 'billing' && (
                  <BillingView
                    currentTier={currentUser?.subscriptionTier || currentUser?.subscription?.plan || 'free'}
                    onSelectTier={handleSelectTier}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Onboarding / New Audit Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSubmit={handleStartRealAudit}
        isLoading={isAuditing}
      />

      {/* Suggested Fix Inspector Modal */}
      <EditFixModal
        isOpen={selectedFixIssue !== null}
        onClose={() => setSelectedFixIssue(null)}
        issue={selectedFixIssue}
      />

      {/* SEO Service Page Generator Modal */}
      {currentAudit && (
        <PageGeneratorModal
          isOpen={selectedPageDraftIssue !== null}
          onClose={() => setSelectedPageDraftIssue(null)}
          business={currentAudit.business}
          issue={selectedPageDraftIssue}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authInitialMode}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleUserLogin}
        onPostSignupOnboard={() => {
          setIsOnboardingOpen(true);
        }}
      />
    </div>
  );
}

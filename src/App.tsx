import React, { useState, useEffect } from 'react';
import {
  Clock,
  ShieldCheck,
  Sparkles,
  FileText,
  Settings,
  CreditCard,
  RefreshCw,
  Plus,
  ArrowRight,
  ChevronRight,
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
import { AuditHistoryEntry, AuditResult, Business, SeoIssue, User, SubscriptionTier } from './types';
import { PLAN_CONFIGS, canUserRunAudit, canUserAddBusiness } from './config/plans';

type ActiveView = 'landing' | 'dashboard' | 'audit' | 'recommendations' | 'pages' | 'settings' | 'billing';

const TOKEN_KEY = 'localrank_token';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.warn('Failed to store session token', e);
  }
}

function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn(e);
  }
}

interface WorkspacePayload {
  businesses: Business[];
  audits: AuditResult[];
  activeBusinessId: string;
}

async function fetchWorkspace(token: string): Promise<WorkspacePayload> {
  const res = await fetch('/api/workspace', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to load workspace');
  }
  const data = await res.json();
  return data.workspace || { businesses: [], audits: [], activeBusinessId: '' };
}

async function saveWorkspaceToServer(
  token: string,
  workspace: WorkspacePayload
): Promise<void> {
  try {
    await fetch('/api/workspace', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(workspace),
    });
  } catch (err) {
    console.warn('Workspace sync failed:', err);
  }
}

function buildHistoryEntry(previous: AuditResult, current: AuditResult): AuditHistoryEntry {
  const prevNonGood = previous.issues.filter((i) => i.severity !== 'good');
  const currNonGood = current.issues.filter((i) => i.severity !== 'good');
  const prevTitles = new Set(prevNonGood.map((i) => i.title.toLowerCase()));
  const currTitles = new Set(currNonGood.map((i) => i.title.toLowerCase()));
  const fixedItems = prevNonGood.filter((i) => !currTitles.has(i.title.toLowerCase())).map((i) => i.title);
  const newIssues = currNonGood.filter((i) => !prevTitles.has(i.title.toLowerCase())).map((i) => i.title);

  return {
    date: new Date().toLocaleDateString(),
    score: previous.overallScore,
    scoreDiff: current.overallScore - previous.overallScore,
    fixedCount: fixedItems.length,
    fixedItems: fixedItems.slice(0, 3),
    newIssuesCount: newIssues.length,
    newPagesCount: Math.max(0, current.pagesAnalyzed - previous.pagesAnalyzed),
    nextPriorities: current.topPriorities.slice(0, 3).map((i) => i.title),
  };
}

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('landing');

  // Hierarchy: User -> Businesses -> Audits
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string>('');
  const [audits, setAudits] = useState<AuditResult[]>([]);

  // Modals & Popups
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('signup');
  const [selectedFixIssue, setSelectedFixIssue] = useState<SeoIssue | null>(null);
  const [selectedPageDraftIssue, setSelectedPageDraftIssue] = useState<SeoIssue | null>(null);
  const [limitAlert, setLimitAlert] = useState<string | null>(null);

  // Audit Execution state
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditingBusiness, setAuditingBusiness] = useState<Business | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditComplete, setAuditComplete] = useState(false);
  const [pendingGuestAudit, setPendingGuestAudit] = useState<AuditResult | null>(null);

  // Restore an existing server session on mount, then load the user's workspace
  useEffect(() => {
    let cancelled = false;

    // Clear legacy v2 storage from older builds that shipped hardcoded demo data
    try {
      localStorage.removeItem('localrank_v2_user');
      localStorage.removeItem('localrank_v2_businesses');
      localStorage.removeItem('localrank_v2_audits');
      localStorage.removeItem('localrank_v2_active_biz');
    } catch (e) {
      console.warn(e);
    }

    const token = getStoredToken();
    if (!token) return;

    (async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          clearStoredToken();
          return;
        }
        const data = await res.json();
        if (cancelled || !data.user) return;

        const workspace = await fetchWorkspace(token);

        setAuthToken(token);
        setCurrentUser(data.user);
        setBusinesses(workspace.businesses);
        setAudits(workspace.audits);
        setActiveBusinessId(
          workspace.activeBusinessId || workspace.businesses[0]?.id || ''
        );
        setActiveView(workspace.businesses.length > 0 ? 'dashboard' : 'landing');
      } catch (err) {
        console.warn('Session restore failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist the full workspace to the server (businesses + audits + active business)
  const persistWorkspace = (
    bizList: Business[],
    auditList: AuditResult[],
    actBizId: string
  ) => {
    if (!authToken) return;
    saveWorkspaceToServer(authToken, {
      businesses: bizList,
      audits: auditList,
      activeBusinessId: actBizId,
    });
  };

  // Keep the server-side user record in sync (fire-and-forget)
  const syncUserToServer = async (user: User, tokenOverride?: string) => {
    const token = tokenOverride || authToken;
    if (!token) return;
    try {
      const res = await fetch('/api/auth/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          subscription: user.subscription,
          subscriptionTier: user.subscriptionTier,
          usage: user.usage,
          businessIds: user.businessIds,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setCurrentUser(data.user);
      }
    } catch (err) {
      console.warn('User sync failed:', err);
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
    persistWorkspace(businesses, audits, businessId);
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
      // Guests can crawl a website and create an account to view results
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

    // Enforce usage limits here too, so direct re-audits (e.g. from Settings) can't bypass them
    if (currentUser) {
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
    }

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
        // Guest flow: hold the result until an account is created
        setPendingGuestAudit(newAudit);
        setAuditComplete(true);
        return;
      }

      const uid = currentUser.id;

      // If this business was audited before, record real audit history
      const existingAudit = audits.find((a) => a.businessId === business.id);
      if (existingAudit) {
        newAudit.scoreDiff = newAudit.overallScore - existingAudit.overallScore;
        newAudit.auditHistory = [
          buildHistoryEntry(existingAudit, newAudit),
          ...(existingAudit.auditHistory || []),
        ];
      }

      const bizWithUser = { ...business, userId: uid };
      const updatedBizList = [bizWithUser, ...businesses.filter((b) => b.id !== business.id)];
      const updatedAudits = [newAudit, ...audits.filter((a) => a.businessId !== business.id)];
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
      persistWorkspace(updatedBizList, updatedAudits, bizWithUser.id);
      syncUserToServer(updatedUser);

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

  // User auth handlers
  const handleUserLogin = async (user: User, token?: string) => {
    const uid = user.id;

    const activeToken = token || getStoredToken();
    if (token) {
      storeToken(token);
      setAuthToken(token);
    } else if (activeToken) {
      setAuthToken(activeToken);
    }

    // Load the workspace from the server so it follows the account across devices
    let savedBiz: Business[] = [];
    let savedAudits: AuditResult[] = [];
    let savedActive = '';
    if (activeToken) {
      try {
        const workspace = await fetchWorkspace(activeToken);
        savedBiz = workspace.businesses;
        savedAudits = workspace.audits;
        savedActive = workspace.activeBusinessId;
      } catch (err) {
        console.warn('Workspace load failed:', err);
      }
    }

    let nextBiz = savedBiz;
    let nextAudits = savedAudits;
    let nextActive = savedActive;
    let nextUser = user;

    // If a guest just completed an audit, attach it to the new account
    if (pendingGuestAudit) {
      const attachedBiz = { ...pendingGuestAudit.business, userId: uid };
      nextBiz = [attachedBiz, ...nextBiz.filter((b) => b.id !== attachedBiz.id)];
      nextAudits = [pendingGuestAudit, ...nextAudits.filter((a) => a.id !== pendingGuestAudit.id)];
      nextActive = attachedBiz.id;
      nextUser = {
        ...user,
        businessIds: Array.from(new Set([...user.businessIds, attachedBiz.id])),
        usage: {
          ...user.usage,
          auditsUsed: user.usage.auditsUsed + 1,
          pagesCrawled: user.usage.pagesCrawled + pendingGuestAudit.pagesAnalyzed,
        },
      };

      setPendingGuestAudit(null);
      setIsAuditing(false);
      setAuditComplete(false);
    }

    setBusinesses(nextBiz);
    setAudits(nextAudits);
    setActiveBusinessId(nextActive || nextBiz[0]?.id || '');
    setCurrentUser(nextUser);
    setActiveView(nextBiz.length > 0 ? 'dashboard' : 'landing');

    const finalActive = nextActive || nextBiz[0]?.id || '';
    if (activeToken) {
      saveWorkspaceToServer(activeToken, {
        businesses: nextBiz,
        audits: nextAudits,
        activeBusinessId: finalActive,
      });
    }
    syncUserToServer(nextUser, activeToken || token);
  };

  const handleUserLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch (err) {
        console.warn('Logout request failed:', err);
      }
    }

    clearStoredToken();
    setAuthToken(null);
    setCurrentUser(null);
    setBusinesses([]);
    setAudits([]);
    setActiveBusinessId('');
    setPendingGuestAudit(null);
    setIsAuditing(false);
    setAuditComplete(false);
    setActiveView('landing');
  };

  const handleDeleteAccount = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/account', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch (err) {
        console.warn('Account deletion request failed:', err);
      }
    }

    clearStoredToken();
    setAuthToken(null);
    setCurrentUser(null);
    setBusinesses([]);
    setAudits([]);
    setActiveBusinessId('');
    setPendingGuestAudit(null);
    setIsAuditing(false);
    setAuditComplete(false);
    setActiveView('landing');
  };

  const handleUpdateBusiness = (updated: Business) => {
    const updatedBizList = businesses.map((b) => (b.id === updated.id ? updated : b));
    const updatedAudits = audits.map((a) =>
      a.businessId === updated.id ? { ...a, business: updated } : a
    );
    setBusinesses(updatedBizList);
    setAudits(updatedAudits);
    persistWorkspace(updatedBizList, updatedAudits, activeBusinessId);
  };

  const handleUpdateUser = (updated: User) => {
    setCurrentUser(updated);
    syncUserToServer(updated);
    persistWorkspace(businesses, audits, activeBusinessId);
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    if (!authToken) {
      throw new Error('You must be logged in to change your password.');
    }
    const res = await fetch('/api/auth/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to change password.');
    }
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
    syncUserToServer(updated);
    persistWorkspace(businesses, audits, activeBusinessId);
  };

  return (
    <div className="min-h-screen ethereal-bg text-slate-800 flex flex-col selection:bg-sky-200 selection:text-sky-900 font-sans relative overflow-x-hidden">
      {/* Ambient glowing pastel diffuse spheres matching reference design */}
      <div className="fixed top-[-10%] right-[-5%] w-[550px] h-[550px] rounded-full bg-gradient-to-br from-indigo-200/35 via-purple-200/30 to-pink-200/25 blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-sky-200/40 via-blue-200/30 to-teal-100/25 blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-[35%] left-[20%] w-[450px] h-[450px] rounded-full bg-gradient-to-r from-pink-200/20 via-purple-100/20 to-sky-100/20 blur-3xl pointer-events-none -z-10" />

      {/* Top Usage Limit Alert Bar */}
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
          onOpenAuthSignup={() => {
            setAuthInitialMode('signup');
            setIsAuthOpen(true);
          }}
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
              </div>
            </aside>

            {/* Main Workstation */}
            <main className="flex-1 min-w-0 flex flex-col">
              {/* Top Action Pill Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-600">
                    {activeView === 'dashboard' && 'Overview'}
                    {activeView === 'audit' && 'Full Website Audit'}
                    {activeView === 'recommendations' && 'Prioritized Recommendations'}
                    {activeView === 'pages' && 'Crawled Pages'}
                    {activeView === 'settings' && 'Settings'}
                    {activeView === 'billing' && 'Plans & Billing'}
                  </h2>
                  <p className="text-[11px] text-slate-400">Local SEO platform</p>
                </div>

                <button
                  onClick={handleTriggerAuditModal}
                  className="self-end sm:self-auto px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-full shadow-xs hover:shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                  id="btn-main-run-audit"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Run Website Audit</span>
                </button>
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
                    onChangePassword={handleChangePassword}
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

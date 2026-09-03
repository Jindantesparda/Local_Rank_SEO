import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  User as UserIcon,
  RefreshCw,
  Play,
  ArrowRight,
  ChevronDown,
  Building,
  Plus,
  Check,
  CreditCard,
  LogOut,
  Settings
} from 'lucide-react';
import { AuditResult, User, Business } from '../types';
import { PLAN_CONFIGS } from '../config/plans';

interface NavbarProps {
  currentAudit: AuditResult | null;
  currentUser: User | null;
  userBusinesses: Business[];
  activeBusiness: Business | null;
  onSelectBusiness: (businessId: string) => void;
  onAddNewBusiness: () => void;
  onOpenAuditModal: () => void;
  onOpenAuth: () => void;
  onGoHome: () => void;
  onLogout: () => void;
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentAudit,
  currentUser,
  userBusinesses,
  activeBusiness,
  onSelectBusiness,
  onAddNewBusiness,
  onOpenAuditModal,
  onOpenAuth,
  onGoHome,
  onLogout,
  activeView,
  setActiveView,
}) => {
  const [bizDropdownOpen, setBizDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const bizDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (bizDropdownRef.current && !bizDropdownRef.current.contains(event.target as Node)) {
        setBizDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const planKey = currentUser?.subscription?.plan || currentUser?.subscriptionTier || 'free';
  const planConfig = PLAN_CONFIGS[planKey];

  return (
    <header className="sticky top-0 z-40 bg-white/75 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_20px_rgba(148,163,204,0.06)]">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo + Business Switcher Dropdown */}
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            id="btn-logo-home"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 via-indigo-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-xs group-hover:scale-105 transition">
              L
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-800">LocalRank</span>
              <p className="text-[10px] text-slate-400 leading-none">Small Business SEO</p>
            </div>
          </button>

          {/* Business Switcher (Requirement 6: User -> Business -> Audits) */}
          {currentUser && activeBusiness && (
            <div className="relative" ref={bizDropdownRef}>
              <button
                onClick={() => setBizDropdownOpen(!bizDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white border border-slate-200/80 shadow-2xs transition cursor-pointer text-left"
                id="btn-biz-switcher"
              >
                <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Building className="w-3 h-3" />
                </div>
                <div className="max-w-[140px] sm:max-w-[190px] truncate">
                  <span className="text-xs font-bold text-slate-900 block truncate">
                    {activeBusiness.name}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {bizDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Your Businesses ({userBusinesses.length} / {planConfig.maxBusinesses})
                    </span>
                  </div>

                  <div className="max-h-56 overflow-y-auto py-1">
                    {userBusinesses.map((b) => {
                      const isCurrent = b.id === activeBusiness.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            onSelectBusiness(b.id);
                            setBizDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 flex items-center justify-between text-xs text-left hover:bg-slate-50 transition cursor-pointer ${
                            isCurrent ? 'bg-sky-50/70 font-bold text-sky-950' : 'text-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <span className="block font-bold truncate">{b.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate">{b.location}</span>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1 border-t border-slate-100 px-2">
                    <button
                      onClick={() => {
                        setBizDropdownOpen(false);
                        onAddNewBusiness();
                      }}
                      className="w-full py-2 px-2.5 rounded-xl hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Business</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions + User Profile */}
        <div className="flex items-center gap-2.5">
          {currentAudit ? (
            <>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition cursor-pointer ${
                  activeView === 'landing'
                    ? 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                    : 'bg-sky-50 text-sky-700 font-bold border border-sky-100 shadow-2xs'
                }`}
                id="btn-nav-dashboard"
              >
                Dashboard
              </button>

              <button
                onClick={onOpenAuditModal}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-3.5 py-1.5 rounded-full shadow-xs transition cursor-pointer"
                id="btn-nav-new-audit"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Audit</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuditModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white px-4 py-1.5 rounded-full shadow-xs transition cursor-pointer"
              id="btn-nav-analyze-hero"
            >
              <span>Analyze Website</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* User Profile Menu */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-white/80 border border-slate-200/60 transition cursor-pointer"
                id="btn-user-avatar-menu"
              >
                <span className="hidden sm:inline text-xs font-bold text-slate-700 max-w-[100px] truncate">
                  {currentUser.name}
                </span>
                <div className="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr from-sky-400 to-indigo-500">
                  <div className="w-full h-full rounded-full bg-white text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-left animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="font-bold text-xs text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[10px] font-bold text-sky-700 uppercase">
                      <Shield className="w-2.5 h-2.5" />
                      <span>{planConfig.name} Plan</span>
                    </div>
                  </div>

                  <div className="py-1 text-xs">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveView('settings');
                      }}
                      className="w-full px-3.5 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Account Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveView('billing');
                      }}
                      className="w-full px-3.5 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Subscription & Limits</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-3.5 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition cursor-pointer text-xs font-semibold"
                      id="btn-dropdown-logout"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3.5 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition cursor-pointer"
              id="btn-nav-signin"
            >
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Log In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import {
  Building,
  Globe,
  MapPin,
  Tag,
  RefreshCw,
  Check,
  Save,
  User as UserIcon,
  Mail,
  Lock,
  Trash2,
  LogOut,
  ShieldCheck,
  Zap,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { Business, User } from '../types';
import { PLAN_CONFIGS, canUserRunAudit } from '../config/plans';

interface SettingsViewProps {
  business: Business;
  currentUser: User | null;
  onUpdateBusiness: (updated: Business) => void;
  onUpdateUser: (updated: User) => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
  onReRunAudit: () => void;
  onNavigateToBilling?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  business,
  currentUser,
  onUpdateBusiness,
  onUpdateUser,
  onDeleteAccount,
  onLogout,
  onReRunAudit,
  onNavigateToBilling,
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'business'>('account');

  // Business state
  const [bizName, setBizName] = useState(business.name);
  const [bizWebsite, setBizWebsite] = useState(business.website);
  const [bizLocation, setBizLocation] = useState(business.location);
  const [bizCategory, setBizCategory] = useState(business.category);
  const [bizDescription, setBizDescription] = useState(business.description || '');
  const [bizSaved, setBizSaved] = useState(false);

  // Account state
  const [userName, setUserName] = useState(currentUser?.name || 'Dante');
  const [userEmail, setUserEmail] = useState(currentUser?.email || 'dante@manicaskyview.co.zw');
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountSavedMsg, setAccountSavedMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync if props change
  React.useEffect(() => {
    setBizName(business.name);
    setBizWebsite(business.website);
    setBizLocation(business.location);
    setBizCategory(business.category);
    setBizDescription(business.description || '');
  }, [business]);

  React.useEffect(() => {
    if (currentUser) {
      setUserName(currentUser.name);
      setUserEmail(currentUser.email);
    }
  }, [currentUser]);

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBusiness({
      ...business,
      name: bizName,
      website: bizWebsite,
      location: bizLocation,
      category: bizCategory,
      description: bizDescription,
    });
    setBizSaved(true);
    setTimeout(() => setBizSaved(false), 2500);
  };

  const handleSaveAccountName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    onUpdateUser({
      ...currentUser,
      name: userName.trim(),
    });
    setAccountSavedMsg('Account profile updated successfully.');
    setTimeout(() => setAccountSavedMsg(null), 2500);
  };

  const handleChangeEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailInput.trim() || !currentUser) return;
    onUpdateUser({
      ...currentUser,
      email: newEmailInput.trim(),
      emailVerified: false, // Triggers verification
    });
    setUserEmail(newEmailInput.trim());
    setShowChangeEmail(false);
    setNewEmailInput('');
    setAccountSavedMsg('Email updated! Please check your inbox for verification.');
    setTimeout(() => setAccountSavedMsg(null), 3500);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    onUpdateUser({
      ...currentUser,
      password: newPassword,
    });
    setShowChangePassword(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setAccountSavedMsg('Password changed successfully.');
    setTimeout(() => setAccountSavedMsg(null), 3000);
  };

  const currentPlan = currentUser?.subscription?.plan || currentUser?.subscriptionTier || 'free';
  const planInfo = PLAN_CONFIGS[currentPlan];

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/80">
        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'account'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5 text-sky-500" />
          <span>Account Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('business')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'business'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-3.5 h-3.5 text-indigo-500" />
          <span>Business Profile ({business.name})</span>
        </button>
      </div>

      {/* ===================== TAB 1: ACCOUNT (User-level) ===================== */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {accountSavedMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{accountSavedMsg}</span>
            </div>
          )}

          {/* User Profile Card */}
          <div className="bg-white/80 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">User Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Account-level details belonging to you as the workspace owner.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-mono text-slate-600">
                User ID: {currentUser?.id || 'usr_demo'}
              </span>
            </div>

            <form onSubmit={handleSaveAccountName} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 text-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
                  >
                    Update Name
                  </button>
                </div>
              </div>
            </form>

            <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div>
                  <span className="text-slate-400 text-[11px] block">Email Address</span>
                  <span className="font-bold text-slate-900 text-sm">{userEmail}</span>
                  {currentUser?.emailVerified ? (
                    <span className="ml-2 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      Unverified
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangeEmail(!showChangeEmail)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition cursor-pointer self-start sm:self-auto"
                >
                  Change Email
                </button>
              </div>

              {/* Change Email form */}
              {showChangeEmail && (
                <form onSubmit={handleChangeEmailSubmit} className="p-4 bg-sky-50/70 rounded-2xl border border-sky-200 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">Update your email</h4>
                  <input
                    type="email"
                    required
                    placeholder="Enter new email"
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Save Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChangeEmail(false)}
                      className="px-3 py-2 text-slate-500 font-bold text-xs hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Password Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
                <div>
                  <span className="text-slate-400 text-[11px] block">Password</span>
                  <span className="font-mono text-slate-700 text-sm">••••••••••••</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition cursor-pointer self-start sm:self-auto"
                >
                  Change Password
                </button>
              </div>

              {/* Change Password form */}
              {showChangePassword && (
                <form onSubmit={handleChangePasswordSubmit} className="p-4 bg-sky-50/70 rounded-2xl border border-sky-200 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">Set a new password</h4>
                  <div className="space-y-2">
                    <input
                      type="password"
                      placeholder="Current password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                    <input
                      type="password"
                      required
                      placeholder="New password (min 6 chars)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                    <input
                      type="password"
                      required
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChangePassword(false)}
                      className="px-3 py-2 text-slate-500 font-bold text-xs hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Subscription & Account Usage Box */}
          <div className="bg-white/80 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Subscription & Usage Limits</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                {planInfo.name} Plan
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 text-[11px] block">Audits Used</span>
                <span className="text-lg font-bold text-slate-900">
                  {currentUser?.usage?.auditsUsed ?? 1} / {planInfo.auditsAllowed}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {planInfo.auditFrequency} frequency
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 text-[11px] block">Crawled Pages Limit</span>
                <span className="text-lg font-bold text-slate-900">
                  Up to {planInfo.maxPages}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">per website crawl</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 text-[11px] block">Businesses Allowed</span>
                <span className="text-lg font-bold text-slate-900">
                  {currentUser?.businessIds?.length || 1} / {planInfo.maxBusinesses}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {planInfo.maxBusinesses > 1 ? 'Multi-business enabled' : 'Single business'}
                </span>
              </div>
            </div>

            {onNavigateToBilling && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onNavigateToBilling}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Manage Plan & Billing Details →
                </button>
              </div>
            )}
          </div>

          {/* Account Actions & Danger Zone */}
          <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Account Actions & Session</span>
            </h3>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-slate-800">Log out of your session</p>
                <p className="text-[11px] text-slate-500">Sign out on this device.</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>

            <div className="pt-3 border-t border-rose-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="font-bold text-rose-900">Delete LocalRank Account</p>
                <p className="text-[11px] text-rose-700/80">
                  Permanently delete your account, businesses, and all historical audit logs.
                </p>
              </div>

              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onDeleteAccount}
                    className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Confirm Permanent Deletion
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: BUSINESS PROFILE (Business-level) ===================== */}
      {activeTab === 'business' && (
        <div className="bg-white/80 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Business Profile & Audit Configuration</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Data belonging to business: <strong className="text-slate-800">{business.name}</strong>
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-mono text-slate-600">
              ID: {business.id}
            </span>
          </div>

          <form onSubmit={handleSaveBusiness} className="mt-5 space-y-4 text-xs">
            {bizSaved && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Business settings saved successfully!</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-800 mb-1">Business Name</label>
              <input
                type="text"
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Website URL</label>
                <input
                  type="text"
                  value={bizWebsite}
                  onChange={(e) => setBizWebsite(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">Location (City, Country)</label>
                <input
                  type="text"
                  value={bizLocation}
                  onChange={(e) => setBizLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Business Category</label>
              <input
                type="text"
                value={bizCategory}
                onChange={(e) => setBizCategory(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">Brief Description</label>
              <textarea
                rows={3}
                value={bizDescription}
                onChange={(e) => setBizDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:outline-none text-slate-900"
              />
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={onReRunAudit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                <span>Re-run Full Audit</span>
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold shadow-xs transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Business Profile</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

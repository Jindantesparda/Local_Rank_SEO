import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Mail } from 'lucide-react';

/**
 * Handles the two links we email out:
 *   /verify-email?token=...    → confirms the address
 *   /reset-password?token=...  → lets the user choose a new password
 *
 * These are separate from the main app shell because the user may not be signed
 * in when they click them.
 */
export const AuthLinkView: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const token = params.get('token') || '';

  const isVerify = path === '/verify-email';

  const [state, setState] = useState<'working' | 'done' | 'error' | 'form'>(
    isVerify ? 'working' : 'form'
  );
  const [message, setMessage] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const goHome = () => {
    window.location.href = '/';
  };

  // Email verification happens automatically on load.
  useEffect(() => {
    if (!isVerify) return;

    let cancelled = false;
    (async () => {
      if (!token) {
        if (!cancelled) {
          setState('error');
          setMessage('This link is missing its token.');
        }
        return;
      }
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setState('error');
          setMessage(data.error || 'We could not verify this link.');
        } else {
          setState('done');
        }
      } catch {
        if (!cancelled) {
          setState('error');
          setMessage('Something went wrong. Please try again.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isVerify, token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setState('error');
      return;
    }
    if (password !== confirm) {
      setMessage('Those passwords do not match.');
      setState('error');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'We could not reset your password.');
      }
      setState('done');
      setMessage('Your password has been changed. You can log in with it now.');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'We could not reset your password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen ethereal-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-lg p-8 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-brand-900 font-extrabold text-lg">
          <img
            src="/brand/icon-64.png"
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
          />
          Search Vailable
        </div>

        {state === 'working' && (
          <>
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto" />
            <h1 className="text-lg font-bold text-slate-900">Confirming your email…</h1>
          </>
        )}

        {state === 'form' && (
          <>
            <div className="w-12 h-12 rounded-full bg-lilac-100 text-brand-700 grid place-items-center mx-auto">
              <Mail className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Choose a new password</h1>
            <form onSubmit={handleReset} className="space-y-3 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="btn btn-primary btn-md w-full flex items-center justify-center gap-2"
                id="btn-reset-submit"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {busy ? 'Saving…' : 'Save new password'}
              </button>
            </form>
          </>
        )}

        {state === 'done' && (
          <>
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">
              {isVerify ? 'Email confirmed' : 'Password updated'}
            </h1>
            <p className="text-sm text-slate-500">
              {message ||
                'Thanks — your address is confirmed. Everything on your account is now unlocked.'}
            </p>
            <button onClick={goHome} className="btn btn-primary btn-md w-full flex items-center justify-center gap-2">
              <span>{isVerify ? 'Go to my dashboard' : 'Log in'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 grid place-items-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">That link didn't work</h1>
            <p className="text-sm text-slate-500">{message}</p>
            <p className="text-xs text-slate-400">
              Links expire after 24 hours (email confirmation) or 1 hour (password reset).
            </p>
            <button onClick={goHome} className="btn btn-outline btn-md w-full">
              Back to Search Vailable
            </button>
          </>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';

interface EmailVerificationBannerProps {
  email: string;
  isVerified: boolean;
  onVerifyNow: () => void;
  onResendLink: () => void;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  email,
  isVerified,
  onVerifyNow,
  onResendLink,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [resentToast, setResentToast] = useState(false);

  if (isVerified || dismissed) return null;

  const handleResend = () => {
    onResendLink();
    setResentToast(true);
    setTimeout(() => setResentToast(false), 3000);
  };

  return (
    <div className="bg-gradient-to-r from-amber-50 via-sky-50 to-indigo-50 border-b border-amber-200/80 px-4 py-2.5 sm:px-6">
      <div className="max-w-[1520px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5" />
          </div>
          <div className="text-slate-700 truncate">
            <strong className="font-bold text-slate-900">Check your email:</strong> We've sent a verification link to{' '}
            <span className="font-semibold text-slate-900">{email}</span>.
            {resentToast && <span className="ml-2 text-emerald-600 font-bold">✓ Verification link resent!</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleResend}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white rounded-full border border-slate-200 transition cursor-pointer"
          >
            Resend Link
          </button>

          <button
            onClick={onVerifyNow}
            className="px-3 py-1 text-[11px] font-bold text-sky-700 bg-sky-100/90 hover:bg-sky-200/90 rounded-full border border-sky-300/60 transition cursor-pointer flex items-center gap-1"
            title="Mark email as verified for testing"
          >
            <CheckCircle2 className="w-3 h-3 text-sky-600" />
            <span>Verify for Demo</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="w-5 h-5 rounded-full hover:bg-black/5 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

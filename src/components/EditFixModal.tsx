import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Sparkles } from 'lucide-react';
import { SeoIssue } from '../types';

interface EditFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: SeoIssue | null;
  onApplyFix?: (issueId: string, updatedRecommended: string) => void;
}

export const EditFixModal: React.FC<EditFixModalProps> = ({
  isOpen,
  onClose,
  issue,
  onApplyFix,
}) => {
  const initialFixText = issue?.suggestedFix?.recommended || issue?.recommendedAction || '';
  const [editedText, setEditedText] = useState(initialFixText);
  const [copied, setCopied] = useState(false);

  // Reset the editor whenever a different issue is opened
  useEffect(() => {
    setEditedText(initialFixText);
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.id]);

  if (!isOpen || !issue) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onApplyFix) {
      onApplyFix(issue.id, editedText);
    }
  };

  const isCode = issue.suggestedFix?.type === 'schema' || issue.suggestedFix?.type === 'code';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Suggested SEO Fix</h3>
              <p className="text-[11px] text-slate-500">{issue.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Current vs Recommended */}
          {issue.suggestedFix?.current && (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Current Value on Website:
              </label>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 break-all">
                {issue.suggestedFix.current}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-900">
                Recommended Fix (You can edit before copying):
              </label>
              <span className="text-[10px] text-slate-400">
                {editedText.length} characters
              </span>
            </div>

            {isCode ? (
              <textarea
                rows={10}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 font-mono text-xs bg-slate-900 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <textarea
                rows={4}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 text-xs text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            )}
          </div>

          {issue.suggestedFix?.targetElement && (
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="font-semibold text-slate-700">Where to paste:</span>
              <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 text-[10px] font-mono">
                {issue.suggestedFix.targetElement}
              </code>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-sm transition"
              id="btn-modal-copy-fix"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Fix'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

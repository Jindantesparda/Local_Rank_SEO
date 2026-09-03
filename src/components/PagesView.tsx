import React, { useState } from 'react';
import {
  FileText,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Layers,
  Image,
  Link2,
  ChevronRight,
  Hash
} from 'lucide-react';
import { AuditResult, CrawledPage, SeoIssue } from '../types';

interface PagesViewProps {
  audit: AuditResult;
}

export const PagesView: React.FC<PagesViewProps> = ({ audit }) => {
  const [search, setSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState<CrawledPage | null>(null);

  const { pages = [], issues = [] } = audit;

  const filteredPages = pages.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.url.toLowerCase().includes(q) || (p.title || '').toLowerCase().includes(q);
  });

  const getPageIssues = (pageUrl: string): SeoIssue[] => {
    return issues.filter((i) => i.affectedPage === pageUrl || i.affectedPage === new URL(pageUrl).pathname);
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Crawled Website Pages</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {pages.length} pages analyzed on {audit.business.website}. Click any row to inspect HTML tags, headings, and images.
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by URL or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 w-64 text-slate-800"
          />
        </div>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-5">Page URL & Title</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Word Count</th>
                <th className="py-3 px-4">Heading (H1)</th>
                <th className="py-3 px-4">Alt Tags</th>
                <th className="py-3 px-4 text-right">Issues</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPages.map((page) => {
                const pageIssues = getPageIssues(page.url);
                const criticalCount = pageIssues.filter((i) => i.severity === 'critical').length;
                const warningCount = pageIssues.filter((i) => i.severity === 'high' || i.severity === 'medium').length;

                return (
                  <tr
                    key={page.id}
                    onClick={() => setSelectedPage(page)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-3.5 px-5 max-w-xs sm:max-w-md">
                      <div className="font-semibold text-slate-900 truncate">
                        {page.title || <span className="text-rose-500 italic">Missing &lt;title&gt; tag</span>}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                        {page.url}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        page.statusCode === 200
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {page.statusCode} OK
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {page.wordCount} words
                      {page.wordCount < 300 && (
                        <span className="text-[10px] text-amber-600 ml-1 font-semibold">(Thin)</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {page.h1 ? (
                        <span className="text-emerald-700 font-semibold truncate block max-w-[140px]" title={page.h1}>
                          {page.h1}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px]">Missing H1</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {page.missingAltCount > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          {page.missingAltCount} missing alt
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold">✓ All good</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {criticalCount > 0 ? (
                        <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          {criticalCount} critical
                        </span>
                      ) : warningCount > 0 ? (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {warningCount} warning
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-600">None</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-right">
                      <ChevronRight className="w-4 h-4 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Detailed Page Modal / Drawer */}
      {selectedPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto text-left animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">Page Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedPage(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-6 text-xs">
              {/* URL and Status */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Target Page URL
                </span>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  <a
                    href={selectedPage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-indigo-600 hover:underline break-all"
                  >
                    {selectedPage.url}
                  </a>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                    {selectedPage.statusCode} OK
                  </span>
                </div>
              </div>

              {/* Title Tag */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Title Tag
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    (selectedPage.title?.length || 0) < 30 || (selectedPage.title?.length || 0) > 60
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}>
                    {selectedPage.title?.length || 0} characters (ideal: 50–60)
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium">
                  {selectedPage.title || <span className="text-rose-500">Missing &lt;title&gt; tag</span>}
                </div>
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Meta Description
                  </span>
                  <span className={`text-[10px] font-semibold ${
                    (selectedPage.metaDescription?.length || 0) < 120
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}>
                    {selectedPage.metaDescription?.length || 0} characters (ideal: 140–160)
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium leading-relaxed">
                  {selectedPage.metaDescription || (
                    <span className="text-rose-500">Missing meta description</span>
                  )}
                </div>
              </div>

              {/* Headings Structure */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Headings Structure
                </span>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div>
                    <span className="font-bold text-slate-500 text-[10px] uppercase">H1 Tag:</span>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {selectedPage.h1 || <span className="text-rose-500">None found</span>}
                    </p>
                  </div>
                  {selectedPage.h2s && selectedPage.h2s.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-500 text-[10px] uppercase">H2 Subheadings ({selectedPage.h2s.length}):</span>
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
                        {selectedPage.h2s.slice(0, 6).map((h2, i) => (
                          <li key={i}>{h2}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Images with Missing Alt */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Images & Alt Attributes ({selectedPage.images.length} total)
                </span>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  {selectedPage.images.filter((img) => !img.alt.trim()).length > 0 ? (
                    <div className="space-y-1.5">
                      <span className="text-amber-700 font-bold block mb-1">
                        Images missing descriptive alt tags:
                      </span>
                      {selectedPage.images
                        .filter((img) => !img.alt.trim())
                        .slice(0, 5)
                        .map((img, i) => (
                          <div key={i} className="font-mono text-[11px] text-slate-600 truncate bg-white p-1.5 rounded-lg border border-slate-200">
                            {img.src}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> All images on this page have alt attributes.
                    </span>
                  )}
                </div>
              </div>

              {/* Issues on this page */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Issues Specific to this Page ({getPageIssues(selectedPage.url).length})
                </span>
                <div className="space-y-2">
                  {getPageIssues(selectedPage.url).map((issue) => (
                    <div key={issue.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <h5 className="font-bold text-slate-900">{issue.title}</h5>
                      <p className="text-slate-600 mt-1">{issue.recommendedAction}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { X, Sparkles, Plus, Check, ArrowRight, Globe, MapPin, Building, Tag, FileText } from 'lucide-react';
import { Business } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (business: Business, maxPages: number) => void;
  isLoading?: boolean;
}

const CATEGORIES = [
  'Restaurant / Cafe',
  'Hotel / Accommodation',
  'Clinic / Dentist / Doctor',
  'Salon / Barber / Spa',
  'Plumber / Electrician',
  'Lawyer / Legal Services',
  'Accountant / Tax Services',
  'Real Estate / Property',
  'Construction / Contractor',
  'Retail Store / Shop',
  'Tourism / Travel Agency',
  'Other Small Business'
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Restaurant / Cafe');
  const [description, setDescription] = useState('');
  const [services, setServices] = useState<string[]>([]);
  const [newServiceInput, setNewServiceInput] = useState('');
  const [maxPages, setMaxPages] = useState<number>(15);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddService = () => {
    const val = newServiceInput.trim();
    if (val && !services.includes(val)) {
      setServices([...services, val]);
      setNewServiceInput('');
    }
  };

  const handleRemoveService = (serviceToRemove: string) => {
    setServices(services.filter(s => s !== serviceToRemove));
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your business name.');
      return;
    }
    if (!website.trim()) {
      setError('Please enter your website URL.');
      return;
    }
    if (!location.trim()) {
      setError('Please enter your city and country (e.g. Austin, Texas).');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmitAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (services.length === 0) {
      setError('Please provide at least one core service.');
      return;
    }

    const business: Business = {
      id: `biz-${Date.now()}`,
      name: name.trim(),
      website: website.trim(),
      location: location.trim(),
      category,
      description: description.trim(),
      services,
      createdAt: new Date().toISOString(),
    };

    onSubmit(business, maxPages);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Step {step} of 2</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {step === 1 ? 'Business & Website' : 'Services & Scope'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              {step === 1 ? 'Enter Business Information' : 'Describe Services & Audit Scope'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition"
            id="btn-close-onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Business Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. The Corner Bistro"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-slate-900"
                    id="input-business-name"
                  />
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Website URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="https://example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent font-mono text-xs text-slate-900"
                    id="input-website-url"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Our real crawler will scan pages on this domain.</p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  City & Country <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Austin, Texas"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-slate-900"
                    id="input-location"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Used to evaluate your Local SEO keyword coverage.</p>
              </div>

              {/* Business Category */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Business Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900"
                  id="select-category"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-sm transition"
                  id="btn-onboarding-next"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitAudit} className="space-y-4">
              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Brief Business Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Rooftop restaurant and boutique accommodation in the city center"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                  id="textarea-description"
                />
              </div>

              {/* Main Services (Allow Multiple) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Main Services / Offerings <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add a service (e.g. Emergency Repairs)"
                    value={newServiceInput}
                    onChange={(e) => setNewServiceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddService();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                    id="input-new-service"
                  />
                  <button
                    type="button"
                    onClick={handleAddService}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Service tags */}
                <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {services.length === 0 ? (
                    <span className="text-xs text-slate-400">No services added yet.</span>
                  ) : (
                    services.map((srv) => (
                      <span
                        key={srv}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-800 font-medium"
                      >
                        {srv}
                        <button
                          type="button"
                          onClick={() => handleRemoveService(srv)}
                          className="text-slate-400 hover:text-rose-500 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  We check if these high-value service keywords are indexed on dedicated pages.
                </p>
              </div>

              {/* Crawler limit */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Crawl Depth
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between ${
                    maxPages === 15 ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold' : 'border-slate-200 text-slate-700'
                  }`}>
                    <div>
                      <div className="font-semibold">Fast Scan (15 pages)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Fastest results (~10-20 sec)</div>
                    </div>
                    <input
                      type="radio"
                      name="crawlDepth"
                      checked={maxPages === 15}
                      onChange={() => setMaxPages(15)}
                      className="text-indigo-600"
                    />
                  </label>

                  <label className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between ${
                    maxPages === 30 ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 font-bold' : 'border-slate-200 text-slate-700'
                  }`}>
                    <div>
                      <div className="font-semibold">Deep Scan (30 pages)</div>
                      <div className="text-[10px] text-slate-500 font-normal">More comprehensive (~30 sec)</div>
                    </div>
                    <input
                      type="radio"
                      name="crawlDepth"
                      checked={maxPages === 30}
                      onChange={() => setMaxPages(30)}
                      className="text-indigo-600"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-3 flex justify-between items-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-lg shadow-sm transition disabled:opacity-50"
                  id="btn-start-audit-final"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isLoading ? 'Starting Audit...' : 'Start SEO Audit'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

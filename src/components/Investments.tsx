import React, { useState, useMemo } from 'react';
import { Investment, Withdrawal } from '../types';
import { toBengaliNumber, toBengaliCurrency, toBengaliDate } from '../utils/calculations';
import { 
  TrendingUp, Calendar, Plus, Trash2, Edit2, 
  CheckCircle, ArrowLeft, AlertCircle, HelpCircle, ArrowUpRight 
} from 'lucide-react';

interface InvestmentsProps {
  investments: Investment[];
  withdrawals: Withdrawal[];
  onAddInvestment: (investment: Omit<Investment, 'id'>) => void;
  onUpdateInvestment: (investment: Investment) => void;
  onDeleteInvestment: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function Investments({
  investments,
  withdrawals,
  onAddInvestment,
  onUpdateInvestment,
  onDeleteInvestment,
  setActiveTab
}: InvestmentsProps) {
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  // Form states
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<'active' | 'completed'>('active');
  const [formError, setFormError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Calculate withdrawals per investment for listing stats
  const investmentStatsMap = useMemo(() => {
    const stats = new Map<string, { totalWithdrawn: number; count: number }>();
    
    // Seed map with 0s
    investments.forEach(inv => {
      stats.set(inv.id, { totalWithdrawn: 0, count: 0 });
    });

    // Populate actuals
    withdrawals.forEach(w => {
      const stat = stats.get(w.investmentId) || { totalWithdrawn: 0, count: 0 };
      stat.totalWithdrawn += w.amount;
      stat.count += 1;
      stats.set(w.investmentId, stat);
    });

    return stats;
  }, [investments, withdrawals]);

  // Overall statistics for investments
  const overallStats = useMemo(() => {
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const activeInvested = investments.filter(i => i.status === 'active').reduce((sum, inv) => sum + inv.amount, 0);
    const totalRealized = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    return {
      totalInvested,
      activeInvested,
      totalRealized,
      investmentsCount: investments.length
    };
  }, [investments, withdrawals]);

  // Handle Edit Action Click
  const handleEditClick = (inv: Investment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedInvestment(inv);
    setFormDescription(inv.description);
    setFormAmount(inv.amount);
    setFormDate(inv.date);
    setFormStatus(inv.status);
    setFormError('');
    setViewMode('edit');
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formDescription.trim()) {
      setFormError('বিনিয়োগের বিবরণ বা নাম আবশ্যক।');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('বিনিয়োগের সঠিক পরিমাণ প্রদান করুন।');
      return;
    }

    if (viewMode === 'add') {
      onAddInvestment({
        description: formDescription.trim(),
        amount: Number(formAmount),
        date: formDate,
        status: formStatus
      });
    } else if (viewMode === 'edit' && selectedInvestment) {
      onUpdateInvestment({
        id: selectedInvestment.id,
        description: formDescription.trim(),
        amount: Number(formAmount),
        date: formDate,
        status: formStatus
      });
    }

    // Reset Form & Redirect
    resetForm();
    setViewMode('list');
  };

  const resetForm = () => {
    setFormDescription('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormStatus('active');
    setFormError('');
    setSelectedInvestment(null);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">বিনিয়োগ</h1>
          <p className="text-sm text-slate-500 mt-1">সমিতির তহবিল থেকে বিভিন্ন লাভজনক প্রকল্পে বিনিয়োগের হিসাব ও তদারকি।</p>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={() => {
              resetForm();
              setViewMode('add');
            }}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            নতুন বিনিয়োগ যোগ
          </button>
        )}
      </div>

      {/* STATS OVERVIEW */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">মোট বিনিয়োগকৃত পুঁজি</span>
              <span className="text-2xl font-bold text-slate-800 mt-1 block">{toBengaliCurrency(overallStats.totalInvested)}</span>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider">চলমান বিনিয়োগে পুঁজি</span>
              <span className="text-2xl font-bold text-emerald-900 mt-1 block">{toBengaliCurrency(overallStats.activeInvested)}</span>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-5 flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-blue-800 uppercase tracking-wider">মোট উত্তোলন (লাভ/আসল)</span>
              <span className="text-2xl font-bold text-blue-900 mt-1 block">{toBengaliCurrency(overallStats.totalRealized)}</span>
            </div>
          </div>
        </div>
      )}

      {/* FORM: ADD OR EDIT */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              {viewMode === 'add' ? 'নতুন বিনিয়োগ প্রকল্প শুরু করুন' : 'বিনিয়োগ রেকর্ড সংশোধন করুন'}
            </h2>
            <button 
              onClick={() => {
                resetForm();
                setViewMode('list');
              }}
              className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {formError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Project Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">প্রকল্পের নাম বা বিবরণ *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মৎস্য চাষ প্রকল্প ১, বা বাৎসরিক পোল্ট্রি খামার"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">বিনিয়োগের পরিমাণ (টাকা) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="যেমন: ৫০০০"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">বিনিয়োগের তারিখ</label>
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">বিনিয়োগ স্ট্যাটাস</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    চলমান (Active)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={formStatus === 'completed'}
                      onChange={() => setFormStatus('completed')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    সমাপ্ত (Completed)
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setViewMode('list');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTING VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {investments.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3 shadow-xs">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-500">বর্তমানে কোনো বিনিয়োগ প্রকল্প রেকর্ড করা নেই।</p>
              <button
                onClick={() => setViewMode('add')}
                className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
              >
                নতুন বিনিয়োগ প্রকল্প শুরু করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {investments.map((inv) => {
                const stat = investmentStatsMap.get(inv.id) || { totalWithdrawn: 0, count: 0 };
                return (
                  <div
                    key={inv.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-sm transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-base text-slate-800 line-clamp-2">{inv.description}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          inv.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {inv.status === 'active' ? 'চলমান' : 'সম্পন্ন'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>শুরুর তারিখ: {toBengaliDate(inv.date)}</span>
                      </div>
                    </div>

                    {/* Monetary breakdown */}
                    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>বিনিয়োগকৃত পুঁজি:</span>
                        <span className="font-bold text-slate-700">{toBengaliCurrency(inv.amount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>মোট লাভ উত্তোলন:</span>
                        <span className="font-bold text-blue-600">{toBengaliCurrency(stat.totalWithdrawn)}</span>
                      </div>
                      <div className="border-t border-slate-200/60 pt-2 flex justify-between items-center text-slate-600 font-semibold">
                        <span>বর্তমান অবস্থা:</span>
                        {stat.totalWithdrawn >= inv.amount ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-sm">পুঁজি ও লাভ সমতা</span>
                        ) : (
                          <span className="text-slate-500">ফেরত বাকি {toBengaliCurrency(inv.amount - stat.totalWithdrawn)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-xs">
                      {inv.status === 'active' ? (
                        <button
                          onClick={() => setActiveTab('withdrawals')} // Switch to withdrawals tab so they can record return
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                        >
                          লভ্যাংশ উত্তোলন করুন
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">প্রকল্প সমাপ্ত</span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleEditClick(inv, e)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition-colors cursor-pointer"
                          title="সম্পাদনা করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setIdToDelete(inv.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-md transition-colors cursor-pointer"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center">
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto bg-rose-50 p-2.5 rounded-full" />
              <h3 className="text-lg font-bold text-slate-800 mt-3">বিনিয়োগ প্রকল্প মুছুন</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                আপনি কি নিশ্চিতভাবে এই বিনিয়োগ প্রকল্পটি মুছতে চান? এটি নিশ্চিত করলে এই বিনিয়োগ প্রকল্প এবং এর সাথে সংশ্লিষ্ট <span className="font-bold text-rose-600">সকল উত্তোলন রেকর্ডও</span> চিরতরে ডেটাবেজ থেকে মুছে যাবে।
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setIdToDelete(null);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={() => {
                  if (idToDelete) {
                    onDeleteInvestment(idToDelete);
                  }
                  setShowDeleteConfirm(false);
                  setIdToDelete(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Investment, Withdrawal } from '../types';
import { toBengaliNumber, toBengaliCurrency, toBengaliDate } from '../utils/calculations';
import { 
  ArrowUpRight, Calendar, Plus, Trash2, Search, Filter, 
  HelpCircle, ArrowLeft, AlertCircle, HelpCircle as QuestionIcon 
} from 'lucide-react';

interface WithdrawalsProps {
  investments: Investment[];
  withdrawals: Withdrawal[];
  onRecordWithdrawal: (withdrawal: Omit<Withdrawal, 'id'>) => void;
  onDeleteWithdrawal: (id: string) => void;
}

export default function Withdrawals({
  investments,
  withdrawals,
  onRecordWithdrawal,
  onDeleteWithdrawal
}: WithdrawalsProps) {
  const [viewMode, setViewMode] = useState<'list' | 'add'>('list');

  // Form states
  const [formInvestmentId, setFormInvestmentId] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  // Filtering states
  const [filterInvestmentId, setFilterInvestmentId] = useState<'all' | string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Active investments for dropdown selection (completed projects shouldn't allow more withdrawals)
  const activeInvestments = useMemo(() => {
    return investments.filter(inv => inv.status === 'active');
  }, [investments]);

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formInvestmentId) {
      setFormError('দয়া করে একটি চলমান বিনিয়োগ প্রকল্প নির্বাচন করুন।');
      return;
    }
    if (!formAmount || Number(formAmount) <= 0) {
      setFormError('উত্তোলনের সঠিক পরিমাণ প্রদান করুন।');
      return;
    }

    onRecordWithdrawal({
      investmentId: formInvestmentId,
      amount: Number(formAmount),
      date: formDate,
      note: formNote.trim()
    });

    // Reset & Redirect
    resetForm();
    setViewMode('list');
  };

  const resetForm = () => {
    setFormInvestmentId('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormError('');
  };

  // Filtered withdrawals list
  const filteredWithdrawals = useMemo(() => {
    return withdrawals
      .filter(w => {
        const matchesInvestment = filterInvestmentId === 'all' || w.investmentId === filterInvestmentId;
        const matchesStart = !filterStartDate || new Date(w.date) >= new Date(filterStartDate);
        const matchesEnd = !filterEndDate || new Date(w.date) <= new Date(filterEndDate);
        return matchesInvestment && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [withdrawals, filterInvestmentId, filterStartDate, filterEndDate]);

  // Aggregate stats
  const totalFilteredAmount = useMemo(() => {
    return filteredWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  }, [filteredWithdrawals]);

  // Investment lookup map
  const investmentMap = useMemo(() => {
    return new Map(investments.map(inv => [inv.id, inv]));
  }, [investments]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">উত্তোলন (টাকা ফেরত/লভ্যাংশ)</h1>
          <p className="text-sm text-slate-500 mt-1">বিনিয়োগকৃত প্রকল্পসমূহ হতে লাভ বা আসল উত্তোলনের রেকর্ড ও হিসাব ট্র্যাকিং।</p>
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
            উত্তোলন রেকর্ড করুন
          </button>
        )}
      </div>

      {/* FORM: ADD WITHDRAWAL */}
      {viewMode === 'add' && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">উত্তোলনের তথ্য লিপিবদ্ধ করুন</h2>
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

            {activeInvestments.length === 0 ? (
              <div className="bg-slate-50 p-6 rounded-lg text-center border border-slate-200 space-y-3">
                <QuestionIcon className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">বর্তমানে কোনো চলমান বিনিয়োগ প্রকল্প নেই!</p>
                <p className="text-xs text-slate-400">উত্তোলন রেকর্ড করতে প্রথমে বিনিয়োগ ট্যাবে গিয়ে অন্তত একটি চলমান বিনিয়োগ যোগ করুন।</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Investment Selection */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">প্রকল্প বা বিনিয়োগ নির্বাচন করুন *</label>
                  <select
                    required
                    value={formInvestmentId}
                    onChange={(e) => setFormInvestmentId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">চলমান প্রকল্প সিলেক্ট করুন...</option>
                    {activeInvestments.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.description} (মূল পুঁজি: {toBengaliCurrency(inv.amount)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">উত্তোলনের পরিমাণ (টাকা) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="যেমন: ১৫০০"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">উত্তোলনের তারিখ</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Note */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">বিশেষ মন্তব্য/বিবরণ (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    placeholder="যেমন: ৩য় কিস্তির লাভ, আংশিক পুঁজি ফেরত ইত্যাদি"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}

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
              {activeInvestments.length > 0 && (
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  সংরক্ষণ করুন
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* LISTING & FILTERS MODE */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* STATS OVERVIEW */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold block">মোট ফিল্টারকৃত উত্তোলন</span>
                <span className="text-2xl font-bold text-slate-800 block mt-0.5">{toBengaliCurrency(totalFilteredAmount)}</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-500 font-semibold bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
              রেকর্ড পাওয়া গেছে: <span className="text-slate-800 font-bold">{toBengaliNumber(filteredWithdrawals.length)} টি</span>
            </div>
          </div>

          {/* FILTERS PANEL */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2 mb-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ফিল্টার প্যানেল</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Filter Investment */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">প্রকল্প ফিল্টার</label>
                <select
                  value={filterInvestmentId}
                  onChange={(e) => setFilterInvestmentId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">সকল বিনিয়োগ প্রকল্প</option>
                  {investments.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.description}</option>
                  ))}
                </select>
              </div>

              {/* Filter Start Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">শুরু তারিখ</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Filter End Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">শেষ তারিখ</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(filterInvestmentId !== 'all' || filterStartDate || filterEndDate) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setFilterInvestmentId('all');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="text-[10px] text-rose-600 hover:underline font-bold"
                >
                  ফিল্টার পরিষ্কার করুন
                </button>
              </div>
            )}
          </div>

          {/* HISTORY TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {filteredWithdrawals.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">কোনো উত্তোলনের রেকর্ড খুঁজে পাওয়া যায়নি।</p>
                <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে অথবা নতুন উত্তোলন রেকর্ড লিপিবদ্ধ করুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                      <th className="p-4">বিনিয়োগ প্রকল্প বা বিবরণ</th>
                      <th className="p-4">উত্তোলনের পরিমাণ</th>
                      <th className="p-4">তারিখ</th>
                      <th className="p-4">মন্তব্য</th>
                      <th className="p-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredWithdrawals.map((w) => {
                      const inv = investmentMap.get(w.investmentId);
                      return (
                        <tr key={w.id} className="hover:bg-slate-50/50">
                          <td className="p-4">
                            <span className="font-bold text-slate-800">{inv?.description || 'অজানা প্রকল্প (মুছে ফেলা)'}</span>
                          </td>
                          <td className="p-4 font-bold text-emerald-600">{toBengaliCurrency(w.amount)}</td>
                          <td className="p-4 text-slate-500">{toBengaliDate(w.date)}</td>
                          <td className="p-4 text-slate-500 italic max-w-xs truncate" title={w.note}>{w.note || '-'}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => {
                                setIdToDelete(w.id);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-md transition-colors cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center">
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto bg-rose-50 p-2.5 rounded-full" />
              <h3 className="text-lg font-bold text-slate-800 mt-3">উত্তোলন রেকর্ড মুছুন</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                আপনি কি নিশ্চিতভাবে এই উত্তোলনের রেকর্ডটি মুছে ফেলতে চান? এটি মুছে ফেললে সংশ্লিষ্ট বিনিয়োগের পরিশোধিত লাভ কমে যাবে এবং সমন্বিত স্থিতি পুনরায় আপডেট হবে।
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
                    onDeleteWithdrawal(idToDelete);
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

import React, { useState, useMemo } from 'react';
import { Member, Deposit, AppSettings } from '../types';
import { toBengaliNumber, toBengaliCurrency, toBengaliDate, getWeeksElapsed } from '../utils/calculations';
import { 
  CreditCard, Calendar, Plus, Search, Trash2, Edit2, 
  Filter, ChevronDown, Check, AlertCircle, ArrowLeft, User, HelpCircle 
} from 'lucide-react';

interface DepositsProps {
  members: Member[];
  deposits: Deposit[];
  settings: AppSettings;
  onRecordDeposit: (deposit: Omit<Deposit, 'id'>) => void;
  onUpdateDeposit: (deposit: Deposit) => void;
  onDeleteDeposit: (id: string) => void;
  preselectedMemberId: string | null;
  setPreselectedMemberId: (id: string | null) => void;
}

export default function Deposits({
  members,
  deposits,
  settings,
  onRecordDeposit,
  onUpdateDeposit,
  onDeleteDeposit,
  preselectedMemberId,
  setPreselectedMemberId
}: DepositsProps) {
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);

  // Form states
  const [formMemberId, setFormMemberId] = useState(preselectedMemberId || '');
  const [formWeek, setFormWeek] = useState<number | ''>('');
  const [formAmount, setFormAmount] = useState<number | ''>(settings.weeklyDepositAmount);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  // Filtering states
  const [filterMemberId, setFilterMemberId] = useState<'all' | string>('all');
  const [filterWeek, setFilterWeek] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  // Sync preselected member when opening add mode
  React.useEffect(() => {
    if (preselectedMemberId) {
      setFormMemberId(preselectedMemberId);
      setViewMode('add');
      setPreselectedMemberId(null); // Clear after consumption
    }
  }, [preselectedMemberId, setPreselectedMemberId]);

  // Active members for dropdown
  const activeMembers = useMemo(() => {
    return members.filter(m => m.status === 'active');
  }, [members]);

  // Set default weekly deposit amount when member selection changes
  const handleMemberChange = (id: string) => {
    setFormMemberId(id);
    setFormAmount(settings.weeklyDepositAmount);
    // Find the first overdue or unpaid week to pre-select
    const member = members.find(m => m.id === id);
    if (member) {
      const elapsed = getWeeksElapsed(member.joinDate);
      const paid = deposits.filter(d => d.memberId === id).map(d => d.weekNumber);
      let nextUnpaid = 1;
      for (let w = 1; w <= elapsed + 1; w++) {
        if (!paid.includes(w)) {
          nextUnpaid = w;
          break;
        }
      }
      setFormWeek(nextUnpaid);
    }
  };

  // Open Edit Mode
  const handleEditClick = (dep: Deposit) => {
    setSelectedDeposit(dep);
    setFormMemberId(dep.memberId);
    setFormWeek(dep.weekNumber);
    setFormAmount(dep.amount);
    setFormDate(dep.date);
    setFormNote(dep.note || '');
    setFormError('');
    setViewMode('edit');
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formMemberId) {
      setFormError('দয়া করে সদস্য নির্বাচন করুন।');
      return;
    }
    if (!formWeek || formWeek <= 0) {
      setFormError('সঠিক সপ্তাহ নম্বর প্রদান করুন।');
      return;
    }

    const finalAmount = formAmount === '' ? settings.weeklyDepositAmount : Number(formAmount);
    if (finalAmount <= 0) {
      setFormError('জমার পরিমাণ ০ এর চেয়ে বেশি হতে হবে।');
      return;
    }

    // Duplicate Check: "একই সদস্যের একই সপ্তাহে একাধিক জমা রেকর্ড করা যাবে না।"
    const isDuplicate = deposits.some(d => 
      d.memberId === formMemberId && 
      d.weekNumber === Number(formWeek) && 
      (viewMode === 'add' || d.id !== selectedDeposit?.id)
    );

    if (isDuplicate) {
      const member = members.find(m => m.id === formMemberId);
      setFormError(`${member?.name || 'এই সদস্যের'} জন্য সপ্তাহ নম্বর ${toBengaliNumber(formWeek)} এর জমা ইতিমধ্যে রেকর্ড করা হয়েছে।`);
      return;
    }

    if (viewMode === 'add') {
      onRecordDeposit({
        memberId: formMemberId,
        weekNumber: Number(formWeek),
        amount: finalAmount,
        date: formDate,
        note: formNote.trim()
      });
    } else if (viewMode === 'edit' && selectedDeposit) {
      onUpdateDeposit({
        id: selectedDeposit.id,
        memberId: formMemberId,
        weekNumber: Number(formWeek),
        amount: finalAmount,
        date: formDate,
        note: formNote.trim()
      });
    }

    // Reset Form & Redirect
    resetForm();
    setViewMode('list');
  };

  const resetForm = () => {
    setFormMemberId('');
    setFormWeek('');
    setFormAmount(settings.weeklyDepositAmount);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormNote('');
    setFormError('');
    setSelectedDeposit(null);
  };

  // Filtered deposits list
  const filteredDeposits = useMemo(() => {
    return deposits
      .filter(dep => {
        const matchesMember = filterMemberId === 'all' || dep.memberId === filterMemberId;
        const matchesWeek = !filterWeek || dep.weekNumber === Number(filterWeek);
        const matchesStart = !filterStartDate || new Date(dep.date) >= new Date(filterStartDate);
        const matchesEnd = !filterEndDate || new Date(dep.date) <= new Date(filterEndDate);
        return matchesMember && matchesWeek && matchesStart && matchesEnd;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.weekNumber - a.weekNumber);
  }, [deposits, filterMemberId, filterWeek, filterStartDate, filterEndDate]);

  // Aggregate stats for filtered deposits
  const totalFilteredAmount = useMemo(() => {
    return filteredDeposits.reduce((sum, d) => sum + d.amount, 0);
  }, [filteredDeposits]);

  // Member map for quick name lookup
  const memberMap = useMemo(() => {
    return new Map(members.map(m => [m.id, m]));
  }, [members]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">জমা ব্যবস্থাপনা</h1>
          <p className="text-sm text-slate-500 mt-1">সদস্যদের নিয়মিত সাপ্তাহিক সঞ্চয় ও কিস্তির হিসাব সংগ্রহ ও রক্ষণাবেক্ষণ।</p>
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
            নতুন জমা রেকর্ড
          </button>
        )}
      </div>

      {/* FORM: ADD OR EDIT */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <div className="max-w-2xl bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              {viewMode === 'add' ? 'নতুন জমা রেকর্ড করুন' : 'জমা রেকর্ড সংশোধন করুন'}
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
              {/* Member Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">সদস্য নির্বাচন করুন *</label>
                {viewMode === 'edit' ? (
                  <div className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700">
                    {memberMap.get(formMemberId)?.name}
                  </div>
                ) : (
                  <select
                    required
                    value={formMemberId}
                    onChange={(e) => handleMemberChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">সদস্য সিলেক্ট করুন...</option>
                    {activeMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({toBengaliNumber(m.phone)})</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Week selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">সপ্তাহ নম্বর *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="যেমন: ১"
                    value={formWeek}
                    onChange={(e) => setFormWeek(e.target.value === '' ? '' : Number(e.target.value))}
                    className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">জমার পরিমাণ (টাকা) (ঐচ্ছিক)</label>
                <input
                  type="number"
                  min="1"
                  placeholder={`যেমন: ${toBengaliNumber(settings.weeklyDepositAmount)} (ফাঁকা রাখলে এটিই ধরা হবে)`}
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">জমার তারিখ</label>
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
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">বিশেষ মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: অগ্রিম প্রদান, বিশেষ কিস্তি ইত্যাদি"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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

      {/* LISTING & FILTERS MODE */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* STATS OVERVIEW */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold block">মোট ফিল্টারকৃত জমা</span>
                <span className="text-2xl font-bold text-slate-800 block mt-0.5">{toBengaliCurrency(totalFilteredAmount)}</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-500 font-semibold bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200">
              রেকর্ড পাওয়া গেছে: <span className="text-slate-800 font-bold">{toBengaliNumber(filteredDeposits.length)} টি</span>
            </div>
          </div>

          {/* FILTERS PANEL */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2 mb-2">
              <Filter className="w-4 h-4 text-slate-500" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">ফিল্টার প্যানেল</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filter Member */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">সদস্য ফিল্টার</label>
                <select
                  value={filterMemberId}
                  onChange={(e) => setFilterMemberId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">সকল সদস্য</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Filter Week */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">সপ্তাহ ফিল্টার</label>
                <input
                  type="number"
                  placeholder="যেমন: ১"
                  value={filterWeek}
                  onChange={(e) => setFilterWeek(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
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
            {(filterMemberId !== 'all' || filterWeek || filterStartDate || filterEndDate) && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    setFilterMemberId('all');
                    setFilterWeek('');
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

          {/* DEPOSIT HISTORY TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {filteredDeposits.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">কোনো জমার রেকর্ড খুঁজে পাওয়া যায়নি।</p>
                <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে অথবা নতুন জমা রেকর্ড তৈরি করুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                      <th className="p-4">সদস্যের নাম</th>
                      <th className="p-4">ফোন</th>
                      <th className="p-4">কিস্তি</th>
                      <th className="p-4">পরিমাণ</th>
                      <th className="p-4">তারিখ</th>
                      <th className="p-4">মন্তব্য</th>
                      <th className="p-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredDeposits.map((dep) => {
                      const member = memberMap.get(dep.memberId);
                      return (
                        <tr key={dep.id} className="hover:bg-slate-50/50">
                          <td className="p-4">
                            <span className="font-bold text-slate-800">{member?.name || 'অজানা সদস্য'}</span>
                          </td>
                          <td className="p-4 text-slate-500">{member ? toBengaliNumber(member.phone) : '-'}</td>
                          <td className="p-4">
                            <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px]">
                              সপ্তাহ {toBengaliNumber(dep.weekNumber)}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-emerald-600">{toBengaliCurrency(dep.amount)}</td>
                          <td className="p-4 text-slate-500">{toBengaliDate(dep.date)}</td>
                          <td className="p-4 text-slate-500 italic max-w-xs truncate" title={dep.note}>{dep.note || '-'}</td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditClick(dep)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition-colors cursor-pointer"
                                title="সম্পাদনা করুন"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setIdToDelete(dep.id);
                                  setShowDeleteConfirm(true);
                                }}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-md transition-colors cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
              <h3 className="text-lg font-bold text-slate-800 mt-3">জমা রেকর্ড মুছুন</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                আপনি কি নিশ্চিতভাবে এই জমার রেকর্ডটি মুছে ফেলতে চান? এটি মুছে ফেললে সদস্যের পূর্বের পরিশোধ হিসেব থেকে এই কিস্তিটি পুনরায় বকেয়া হিসেবে গণ্য করা হবে।
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
                    onDeleteDeposit(idToDelete);
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

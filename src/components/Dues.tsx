import React, { useMemo } from 'react';
import { Member, Deposit, AppSettings } from '../types';
import { calculateMemberDues, toBengaliNumber, toBengaliCurrency } from '../utils/calculations';
import { AlertCircle, ArrowUpRight, HelpCircle, User, CreditCard, Check } from 'lucide-react';

interface DuesProps {
  members: Member[];
  deposits: Deposit[];
  settings: AppSettings;
  onBulkPayMemberDues: (memberId: string) => void;
  setActiveTab: (tab: string) => void;
  setPreselectedMemberId: (id: string | null) => void;
}

export default function Dues({
  members,
  deposits,
  settings,
  onBulkPayMemberDues,
  setActiveTab,
  setPreselectedMemberId
}: DuesProps) {
  // Compute dues list for active members with dues > 0
  const duesList = useMemo(() => {
    return members
      .filter(m => m.status === 'active')
      .map(member => {
        const dues = calculateMemberDues(member, deposits, settings.weeklyDepositAmount);
        return {
          member,
          ...dues
        };
      })
      .filter(item => item.dueCount > 0)
      // Sort by highest due amount first
      .sort((a, b) => b.dueAmount - a.dueAmount);
  }, [members, deposits, settings]);

  // Summarize overall association dues
  const summary = useMemo(() => {
    const totalDuesAmount = duesList.reduce((sum, item) => sum + item.dueAmount, 0);
    const totalDueWeeksCount = duesList.reduce((sum, item) => sum + item.dueCount, 0);
    return {
      totalDuesAmount,
      totalDueWeeksCount,
      membersCount: duesList.length
    };
  }, [duesList]);

  // Handle pay click
  const handlePayClick = (memberId: string) => {
    setPreselectedMemberId(memberId);
    setActiveTab('deposits'); // Switch to deposits tab which will trigger opening add form
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">বকেয়া হিসাব</h1>
          <p className="text-sm text-slate-500 mt-1">সদস্যদের পরিশোধ না করা সাপ্তাহিক কিস্তিসমূহ এবং মোট বকেয়ার হিসাব ট্র্যাকিং।</p>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Dues Amount */}
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-rose-100 text-rose-800 rounded-lg shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-rose-800 uppercase tracking-wider">সমিতির মোট বকেয়া</span>
            <span className="text-2xl font-bold text-rose-900 mt-1 block">{toBengaliCurrency(summary.totalDuesAmount)}</span>
          </div>
        </div>

        {/* Total Overdue Weeks */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">মোট বকেয়া কিস্তি সংখ্যা</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{toBengaliNumber(summary.totalDueWeeksCount)} টি</span>
          </div>
        </div>

        {/* Members in Debt */}
        <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider">বকেয়া থাকা সদস্য</span>
            <span className="text-2xl font-bold text-emerald-900 mt-1 block">{toBengaliNumber(summary.membersCount)} জন</span>
          </div>
        </div>
      </div>

      {/* DUES LIST */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">বকেয়া কিস্তির বিবরণী (বকেয়ার ভিত্তিতে সাজানো)</h2>
        </div>

        {duesList.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-500">বর্তমানে কোনো বকেয়া নেই!</p>
            <p className="text-xs text-slate-400">সকল সক্রিয় সদস্য তাদের নিয়মিত কিস্তি পরিশোধ করেছেন।</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {duesList.map(({ member, dueCount, dueAmount, dueWeeks }) => (
              <div 
                key={member.id} 
                className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/20 transition-colors"
              >
                {/* Member Profile Info */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0 text-slate-600">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-base font-bold">{member.name.charAt(0)}</span>
                    )}
                  </div>
                  
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 truncate">{member.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{toBengaliNumber(member.phone)}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-[10px] font-semibold text-slate-500 mr-1 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                        বকেয়া কিস্তি:
                      </span>
                      {dueWeeks.slice(0, 5).map(w => (
                        <span key={w} className="text-[10px] font-bold bg-rose-50 border border-rose-100 text-rose-600 px-1.5 py-0.5 rounded-sm">
                          সপ্তাহ {toBengaliNumber(w)}
                        </span>
                      ))}
                      {dueWeeks.length > 5 && (
                        <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-sm">
                          +{toBengaliNumber(dueWeeks.length - 5)} আরও
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount and Quick Pay Button */}
                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 flex-wrap sm:flex-nowrap">
                  <div className="text-right mr-2">
                    <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">বকেয়া পরিমাণ</span>
                    <span className="text-lg font-bold text-rose-600 block mt-0.5">{toBengaliCurrency(dueAmount)}</span>
                    <span className="text-[10px] text-slate-400 block font-semibold">({toBengaliNumber(dueCount)} সপ্তাহ বাকি)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onBulkPayMemberDues(member.id)}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      এক ক্লিকে পরিশোধ
                    </button>

                    <button
                      onClick={() => handlePayClick(member.id)}
                      className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      ম্যানুয়াল জমা
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Member, Deposit, AppSettings } from '../types';
import { calculateMemberDues, toBengaliNumber, toBengaliCurrency, toBengaliDate } from '../utils/calculations';
import { FileText, Calendar, Users, AlertTriangle, ArrowUpRight, HelpCircle, Eye } from 'lucide-react';

interface ReportsProps {
  members: Member[];
  deposits: Deposit[];
  settings: AppSettings;
  setActiveTab: (tab: string) => void;
  setPreselectedMemberId: (id: string | null) => void;
}

export default function Reports({
  members,
  deposits,
  settings,
  setActiveTab,
  setPreselectedMemberId
}: ReportsProps) {
  // Sub-tabs inside Reports page
  const [reportSubTab, setReportSubTab] = useState<'weekly' | 'member' | 'dues'>('weekly');

  // 1. Weekly Report States
  const maxRecordedWeek = useMemo(() => {
    if (deposits.length === 0) return 1;
    return Math.max(...deposits.map(d => d.weekNumber));
  }, [deposits]);

  const [selectedReportWeek, setSelectedReportWeek] = useState<number>(maxRecordedWeek);

  const weeklyReportData = useMemo(() => {
    const weeklyDeposits = deposits.filter(d => d.weekNumber === selectedReportWeek);
    const totalWeeklyAmount = weeklyDeposits.reduce((sum, d) => sum + d.amount, 0);
    return {
      weeklyDeposits,
      totalWeeklyAmount
    };
  }, [deposits, selectedReportWeek]);

  // List of unique week numbers for the dropdown
  const uniqueWeeks = useMemo(() => {
    const weeksSet = new Set<number>();
    // Include 1 up to max recorded week or at least 1-12 for options
    const maxWeek = Math.max(maxRecordedWeek, 12);
    for (let i = 1; i <= maxWeek; i++) {
      weeksSet.add(i);
    }
    return Array.from(weeksSet).sort((a, b) => b - a); // latest first
  }, [maxRecordedWeek]);

  // 2. Member-wise Report Data
  const memberReportData = useMemo(() => {
    return members.map(m => {
      const mDeposits = deposits.filter(d => d.memberId === m.id);
      const totalPaid = mDeposits.reduce((sum, d) => sum + d.amount, 0);
      const dues = calculateMemberDues(m, deposits, settings.weeklyDepositAmount);
      return {
        member: m,
        totalPaid,
        dueAmount: dues.dueAmount,
        dueCount: dues.dueCount
      };
    }).sort((a, b) => b.totalPaid - a.totalPaid); // Sorted by highest savings first
  }, [members, deposits, settings]);

  // 3. Dues Report Data
  const duesReportData = useMemo(() => {
    const data = members
      .filter(m => m.status === 'active')
      .map(m => {
        const dues = calculateMemberDues(m, deposits, settings.weeklyDepositAmount);
        return {
          member: m,
          dueCount: dues.dueCount,
          dueAmount: dues.dueAmount
        };
      })
      .filter(item => item.dueCount > 0)
      .sort((a, b) => b.dueAmount - a.dueAmount);

    const totalDuesAmount = data.reduce((sum, item) => sum + item.dueAmount, 0);
    return {
      items: data,
      totalDuesAmount
    };
  }, [members, deposits, settings]);

  const memberMap = useMemo(() => {
    return new Map(members.map(m => [m.id, m]));
  }, [members]);

  const handleMemberRowClick = (memberId: string) => {
    // Navigate to members and preselect for details view
    setPreselectedMemberId(memberId);
    setActiveTab('members');
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">আর্থিক রিপোর্ট ও হিসাব</h1>
          <p className="text-sm text-slate-500 mt-1">সাপ্তাহিক, সদস্যভিত্তিক এবং বকেয়া জমার তুলনামূলক সমন্বিত রিপোর্ট।</p>
        </div>
      </div>

      {/* REPORT SUB-TABS */}
      <div className="flex border-b border-slate-150 gap-1 overflow-x-auto">
        <button
          onClick={() => setReportSubTab('weekly')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            reportSubTab === 'weekly'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          সাপ্তাহিক জমা রিপোর্ট
        </button>

        <button
          onClick={() => setReportSubTab('member')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            reportSubTab === 'member'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          সদস্যভিত্তিক সঞ্চয় রিপোর্ট
        </button>

        <button
          onClick={() => setReportSubTab('dues')}
          className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            reportSubTab === 'dues'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          বকেয়া কিস্তির রিপোর্ট
        </button>
      </div>

      {/* 1. WEEKLY REPORT SUBTAB */}
      {reportSubTab === 'weekly' && (
        <div className="space-y-4 animate-fade-in">
          {/* WEEK SELECTOR */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase">সপ্তাহ নির্বাচন করুন:</label>
              <select
                value={selectedReportWeek}
                onChange={(e) => setSelectedReportWeek(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500 font-semibold text-slate-800 cursor-pointer"
              >
                {uniqueWeeks.map(w => (
                  <option key={w} value={w}>সপ্তাহ {toBengaliNumber(w)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-lg text-slate-600">
              <span>মোট জমাকৃত কিস্তি: <span className="text-emerald-700 font-bold">{toBengaliNumber(weeklyReportData.weeklyDeposits.length)} জন</span></span>
              <span className="text-slate-300">|</span>
              <span>মোট জমার পরিমাণ: <span className="text-emerald-700 font-extrabold">{toBengaliCurrency(weeklyReportData.totalWeeklyAmount)}</span></span>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {weeklyReportData.weeklyDeposits.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-500">এই সপ্তাহে কোনো জমা রেকর্ড পাওয়া যায়নি।</p>
                <p className="text-xs text-slate-400">সঞ্চয় তালিকা পরিবর্তন করতে অন্য কোনো সপ্তাহ নির্বাচন করুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="p-4">সদস্যের নাম</th>
                      <th className="p-4">ফোন নম্বর</th>
                      <th className="p-4">জমার তারিখ</th>
                      <th className="p-4">পরিশোধিত কিস্তি</th>
                      <th className="p-4">জমার পরিমাণ</th>
                      <th className="p-4 text-center">সদস্য তথ্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {weeklyReportData.weeklyDeposits.map((dep) => {
                      const member = memberMap.get(dep.memberId);
                      return (
                        <tr key={dep.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-800">{member?.name || 'অজানা সদস্য'}</td>
                          <td className="p-4 text-slate-500">{member ? toBengaliNumber(member.phone) : '-'}</td>
                          <td className="p-4 text-slate-500">{toBengaliDate(dep.date)}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[10px]">
                              সপ্তাহ {toBengaliNumber(dep.weekNumber)}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-emerald-600">{toBengaliCurrency(dep.amount)}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => member && handleMemberRowClick(member.id)}
                              className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              বিস্তারিত
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

      {/* 2. MEMBER-WISE REPORT SUBTAB */}
      {reportSubTab === 'member' && (
        <div className="space-y-4 animate-fade-in">
          {/* STATS OVERVIEW */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase">সদস্য ভিত্তিক সঞ্চয় সারসংক্ষেপ</span>
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3.5 py-1.5 rounded border border-slate-200">
              মোট সদস্য সংখ্যা: <span className="text-slate-800 font-bold">{toBengaliNumber(members.length)} জন</span>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {memberReportData.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p className="text-sm font-semibold">কোনো সদস্যের তথ্য পাওয়া যায়নি।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="p-4">সদস্যের নাম</th>
                      <th className="p-4">ফোন নম্বর</th>
                      <th className="p-4">মোট পরিশোধিত সঞ্চয়</th>
                      <th className="p-4">বকেয়া কিস্তি</th>
                      <th className="p-4">বকেয়া পরিমাণ</th>
                      <th className="p-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {memberReportData.map(({ member, totalPaid, dueAmount, dueCount }) => (
                      <tr 
                        key={member.id} 
                        onClick={() => handleMemberRowClick(member.id)}
                        className="hover:bg-slate-50/50 cursor-pointer"
                      >
                        <td className="p-4">
                          <span className="font-bold text-slate-800">{member.name}</span>
                          <span className={`inline-block ml-2 px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                            member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{toBengaliNumber(member.phone)}</td>
                        <td className="p-4 font-bold text-emerald-600">{toBengaliCurrency(totalPaid)}</td>
                        <td className="p-4 text-slate-500">
                          {member.status === 'active' ? (
                            dueCount > 0 ? (
                              <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded-sm">{toBengaliNumber(dueCount)} সপ্তাহ</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-sm">বকেয়া নেই</span>
                            )
                          ) : (
                            <span className="text-slate-400">হিসাব স্থগিত</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-rose-600">
                          {member.status === 'active' ? toBengaliCurrency(dueAmount) : '-'}
                        </td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleMemberRowClick(member.id)}
                            className="p-1 hover:bg-slate-100 text-emerald-600 rounded-md transition-colors cursor-pointer"
                          >
                            <ArrowUpRight className="w-4 h-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DUES REPORT SUBTAB */}
      {reportSubTab === 'dues' && (
        <div className="space-y-4 animate-fade-in">
          {/* STATS OVERVIEW */}
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-rose-800 font-bold block uppercase tracking-wider">মোট বকেয়া সঞ্চয় তহবিল</span>
                <span className="text-xl font-bold text-rose-900 mt-0.5 block">{toBengaliCurrency(duesReportData.totalDuesAmount)}</span>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-lg shadow-2xs">
              বকেয়া সদস্য সংখ্যা: <span className="text-slate-800 font-bold">{toBengaliNumber(duesReportData.items.length)} জন</span>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            {duesReportData.items.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-500">বর্তমানে কোনো বকেয়া নেই!</p>
                <p className="text-xs text-slate-400">সকল সক্রিয় সদস্য সম্পূর্ণ নিয়মিত সঞ্চয় প্রদান করেছেন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
                      <th className="p-4">সদস্যের নাম</th>
                      <th className="p-4">ফোন নম্বর</th>
                      <th className="p-4">বকেয়া সপ্তাহের সংখ্যা</th>
                      <th className="p-4">মোট বকেয়া পরিমাণ</th>
                      <th className="p-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {duesReportData.items.map(({ member, dueCount, dueAmount }) => (
                      <tr 
                        key={member.id} 
                        onClick={() => handleMemberRowClick(member.id)}
                        className="hover:bg-slate-50/50 cursor-pointer"
                      >
                        <td className="p-4 font-bold text-slate-800">{member.name}</td>
                        <td className="p-4 text-slate-500">{toBengaliNumber(member.phone)}</td>
                        <td className="p-4 font-semibold text-rose-600">{toBengaliNumber(dueCount)} সপ্তাহ</td>
                        <td className="p-4 font-bold text-rose-600">{toBengaliCurrency(dueAmount)}</td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleMemberRowClick(member.id)}
                            className="p-1 hover:bg-slate-100 text-emerald-600 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px]"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            হিসাব দেখুন
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

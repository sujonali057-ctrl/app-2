import React, { useMemo } from 'react';
import { Member, Deposit, Investment, Withdrawal, AppSettings } from '../types';
import { toBengaliNumber, toBengaliCurrency, toBengaliDate, calculateMemberDues } from '../utils/calculations';
import { 
  Users, CreditCard, TrendingUp, ArrowDownRight, Wallet, 
  ChevronRight, Sparkles, Plus, AlertCircle, ArrowUpRight, HelpCircle 
} from 'lucide-react';

interface DashboardProps {
  members: Member[];
  deposits: Deposit[];
  investments: Investment[];
  withdrawals: Withdrawal[];
  settings: AppSettings;
  setActiveTab: (tab: string) => void;
  setPreselectedMemberId: (id: string | null) => void;
}

export default function Dashboard({
  members,
  deposits,
  investments,
  withdrawals,
  settings,
  setActiveTab,
  setPreselectedMemberId
}: DashboardProps) {
  // Aggregate primary metrics
  const stats = useMemo(() => {
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'active').length;
    
    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalInvestments = investments.reduce((sum, i) => sum + i.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    
    // Association cash = deposits (inflow) - investments (outflow) + withdrawals (inflow back)
    const associationCash = totalDeposits - totalInvestments + totalWithdrawals;

    // Current week deposits (last 7 days)
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    const currentWeekDepositsList = deposits.filter(d => {
      const dDate = new Date(d.date);
      return dDate >= sevenDaysAgo && dDate <= today;
    });

    const currentWeekDepositsAmount = currentWeekDepositsList.reduce((sum, d) => sum + d.amount, 0);
    const currentWeekContributorsCount = new Set(currentWeekDepositsList.map(d => d.memberId)).size;

    return {
      totalMembers,
      activeMembers,
      totalDeposits,
      totalInvestments,
      totalWithdrawals,
      associationCash,
      currentWeekDepositsAmount,
      currentWeekContributorsCount
    };
  }, [members, deposits, investments, withdrawals]);

  // Calculate last 8 weeks of data for the bar chart
  const weeklyChartData = useMemo(() => {
    const chartData = Array(8).fill(0).map((_, idx) => ({
      label: idx === 0 ? 'চলতি সপ্তাহ' : `${toBengaliNumber(idx)} সপ্তাহ আগে`,
      amount: 0,
      daysAgoStart: idx * 7,
      daysAgoEnd: (idx + 1) * 7 - 1
    }));

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    deposits.forEach(d => {
      const depDate = new Date(d.date);
      const diffTime = today.getTime() - depDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < 56) {
        const bucketIndex = Math.floor(diffDays / 7);
        if (bucketIndex >= 0 && bucketIndex < 8) {
          chartData[bucketIndex].amount += d.amount;
        }
      }
    });

    // Reverse to show chronologically from oldest (7 weeks ago) to newest (current week)
    return chartData.reverse();
  }, [deposits]);

  const maxWeeklyAmount = useMemo(() => {
    const maxVal = Math.max(...weeklyChartData.map(d => d.amount));
    return maxVal > 0 ? maxVal : 1000;
  }, [weeklyChartData]);

  // Fetch recent activities
  const recentActivities = useMemo(() => {
    const list: Array<{ id: string; type: 'deposit' | 'investment' | 'withdrawal'; desc: string; amount: number; date: string }> = [];
    
    // Add last 5 deposits
    deposits.slice(-5).forEach(d => {
      const m = members.find(member => member.id === d.memberId);
      list.push({
        id: `d_${d.id}`,
        type: 'deposit',
        desc: `${m?.name || 'সদস্য'} - কিস্তি সপ্তাহ ${toBengaliNumber(d.weekNumber)}`,
        amount: d.amount,
        date: d.date
      });
    });

    // Add last 3 investments
    investments.slice(-3).forEach(i => {
      list.push({
        id: `i_${i.id}`,
        type: 'investment',
        desc: `বিনিয়োগ: ${i.description}`,
        amount: i.amount,
        date: i.date
      });
    });

    // Add last 3 withdrawals
    withdrawals.slice(-3).forEach(w => {
      const i = investments.find(inv => inv.id === w.investmentId);
      list.push({
        id: `w_${w.id}`,
        type: 'withdrawal',
        desc: `উত্তোলন: ${i?.description || 'বিনিয়োগ'}`,
        amount: w.amount,
        date: w.date
      });
    });

    // Sort by date descending
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deposits, investments, withdrawals, members]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* BANNER GREETINGS */}
      <div className="relative overflow-hidden rounded-3xl bg-radial from-slate-900 via-slate-950 to-black p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl border border-slate-800">
        {/* Decorative background vectors */}
        <div className="absolute top-[-40px] right-[-40px] w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-40px] left-[-40px] w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
          {/* Newly generated app launcher icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/10 p-1 backdrop-blur-xs border border-white/20 shadow-inner shrink-0 overflow-hidden">
            <img 
              src="/src/assets/images/somiti_app_icon_1782848069577.jpg" 
              alt="সমিতি লোগো" 
              className="w-full h-full object-cover rounded-xl"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/25">
              <Sparkles className="w-3 h-3" />
              সমিতি ডিজিটাল ড্যাশবোর্ড
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">{settings.associationName}</h1>
            <p className="text-slate-400 text-xs font-medium">সমিতির সার্বিক সঞ্চয় সংগ্রহ ও নিয়মিত কিস্তি পরিশোধের আধুনিক হিসাবনিকাশ।</p>
          </div>
        </div>

        {/* Association Fund highlight */}
        <div className="bg-white/5 border border-white/15 p-5 rounded-2xl shrink-0 text-center md:text-left min-w-[210px] relative z-10 backdrop-blur-md shadow-md">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">সমিতির বর্তমান মোট ক্যাশ</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block tracking-tight">{toBengaliCurrency(stats.associationCash)}</span>
          <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">(মোট জমা - মোট বিনিয়োগ + মোট উত্তোলন)</span>
        </div>
      </div>

      {/* QUICK LINKS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button 
          onClick={() => setActiveTab('deposits')} 
          className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-xl transition-all cursor-pointer text-center group shadow-2xs"
          id="quick-link-deposit"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 group-hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-700 mt-3">জমা দিন</span>
          <span className="text-[9px] text-slate-400 mt-0.5">নতুন জমা নথিভুক্তি</span>
        </button>

        <button 
          onClick={() => setActiveTab('dues')} 
          className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-xl transition-all cursor-pointer text-center group shadow-2xs"
          id="quick-link-dues"
        >
          <div className="w-10 h-10 rounded-full bg-rose-50 group-hover:bg-rose-100 text-rose-700 flex items-center justify-center transition-colors">
            <AlertCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-700 mt-3">বকেয়া হিসাব</span>
          <span className="text-[9px] text-slate-400 mt-0.5">বকেয়া কিস্তি পর্যবেক্ষণ</span>
        </button>

        <button 
          onClick={() => setActiveTab('investments')} 
          className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-xl transition-all cursor-pointer text-center group shadow-2xs"
          id="quick-link-investments"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-100 text-blue-700 flex items-center justify-center transition-colors">
            <TrendingUp className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-700 mt-3">বিনিয়োগ</span>
          <span className="text-[9px] text-slate-400 mt-0.5">নতুন বিনিয়োগ প্রকল্প</span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('members');
            // This is handled inside Members component to immediately display add form.
          }} 
          className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-xl transition-all cursor-pointer text-center group shadow-2xs"
          id="quick-link-add-member"
        >
          <div className="w-10 h-10 rounded-full bg-indigo-50 group-hover:bg-indigo-100 text-indigo-700 flex items-center justify-center transition-colors">
            <Users className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-slate-700 mt-3">সদস্য যোগ করুন</span>
          <span className="text-[9px] text-slate-400 mt-0.5">নতুন সদস্য এন্ট্রি</span>
        </button>
      </div>

      {/* PRIMARY STATUS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold block uppercase tracking-wider">মোট সদস্য সংখ্যা</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{toBengaliNumber(stats.totalMembers)} <span className="text-xs font-normal text-slate-400">জন</span></span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">সক্রিয়: {toBengaliNumber(stats.activeMembers)} জন</span>
          </div>
        </div>

        {/* Total Deposits */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold block uppercase tracking-wider">মোট সঞ্চয় সংগ্রহ</span>
            <span className="text-2xl font-black text-emerald-600 block mt-1">{toBengaliCurrency(stats.totalDeposits)}</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">মোট কিস্তি: {toBengaliNumber(deposits.length)} টি</span>
          </div>
        </div>

        {/* Total Investments */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold block uppercase tracking-wider">মোট বিনিয়োগ পুঁজি</span>
            <span className="text-2xl font-black text-orange-600 block mt-1">{toBengaliCurrency(stats.totalInvestments)}</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">মোট প্রকল্প: {toBengaliNumber(investments.length)} টি</span>
          </div>
        </div>

        {/* Total Withdrawals */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-700 rounded-lg">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold block uppercase tracking-wider">মোট লভ্যাংশ উত্তোলন</span>
            <span className="text-2xl font-black text-slate-800 block mt-1">{toBengaliCurrency(stats.totalWithdrawals)}</span>
            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">উত্তোলন রেকর্ড: {toBengaliNumber(withdrawals.length)} টি</span>
          </div>
        </div>
      </div>

      {/* CURRENT WEEK DETAILS & BAR CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Last 8 weeks chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              সাপ্তাহিক সঞ্চয় জমার তথ্য (সর্বশেষ ৮ সপ্তাহ)
            </h3>
          </div>

          {deposits.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-100 rounded-lg">
              <HelpCircle className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold mt-2">কোনো জমার তথ্য পাওয়া যায়নি। চার্ট দেখতে প্রথমে কিছু কিস্তি জমা রেকর্ড করুন।</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Responsive Bar Chart Containers */}
              <div className="h-[180px] flex items-end gap-3 pt-6 px-2 border-b border-slate-100">
                {weeklyChartData.map((w, idx) => {
                  const percentage = maxWeeklyAmount > 0 ? (w.amount / maxWeeklyAmount) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip on Hover */}
                      <div className="absolute top-[-30px] hidden group-hover:block bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md z-20 whitespace-nowrap">
                        {toBengaliCurrency(w.amount)}
                      </div>
                      
                      {/* The Bar */}
                      <div 
                        style={{ height: `${percentage > 0 ? Math.max(percentage, 5) : 0}%` }}
                        className={`w-full rounded-t-sm transition-all duration-500 ease-out cursor-pointer ${
                          idx === 7 
                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                            : 'bg-emerald-100 group-hover:bg-emerald-200 hover:bg-emerald-200'
                        }`}
                      ></div>
                    </div>
                  );
                })}
              </div>

              {/* Labels */}
              <div className="flex gap-3 text-slate-500 text-[10px] font-bold text-center">
                {weeklyChartData.map((w, idx) => (
                  <span key={idx} className="flex-1 truncate" title={w.label}>
                    {w.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current Week Contribution Detail & Recent activity */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-700 text-sm">চলতি সপ্তাহের সারসংক্ষেপ</h3>
            <span className="text-[10px] text-slate-400 block mt-0.5">(বিগত ৭ দিনের সংগৃহীত তথ্য)</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">চলতি সপ্তাহে জমা</span>
              <span className="text-base font-black text-slate-800 block mt-1.5">{toBengaliCurrency(stats.currentWeekDepositsAmount)}</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">চলতি সপ্তাহে প্রদানকারী</span>
              <span className="text-base font-black text-slate-800 block mt-1.5">{toBengaliNumber(stats.currentWeekContributorsCount)} জন</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">সাম্প্রতিক লেনদেনসমূহ</h4>
            
            {recentActivities.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic text-center py-6 border border-dashed border-slate-100 rounded-lg">কোনো সাম্প্রতিক কর্মকাণ্ড নেই।</p>
            ) : (
              <div className="space-y-2.5">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between gap-3 text-xs border-b border-slate-50 pb-2 last:border-b-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{act.desc}</p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{toBengaliDate(act.date)}</span>
                    </div>

                    <span className={`font-bold shrink-0 ${
                      act.type === 'deposit' || act.type === 'withdrawal'
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}>
                      {act.type === 'deposit' || act.type === 'withdrawal' ? '+' : '-'} {toBengaliCurrency(act.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

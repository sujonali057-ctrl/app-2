import React, { useState, useEffect, useMemo } from 'react';
import { Member, Deposit, Investment, Withdrawal, AppSettings, AppData } from './types';
import { loadAppData, saveAppData, DEFAULT_SETTINGS, clearAllAppData } from './utils/localStorage';
import { calculateMemberDues, toBengaliNumber, toBengaliDate, toBengaliCurrency } from './utils/calculations';

// View Components
import Dashboard from './components/Dashboard';
import Members from './components/Members';
import Deposits from './components/Deposits';
import Dues from './components/Dues';
import Investments from './components/Investments';
import Withdrawals from './components/Withdrawals';
import Reports from './components/Reports';
import Settings from './components/Settings';

// Icons
import { 
  LayoutDashboard, Users, CreditCard, AlertTriangle, 
  TrendingUp, ArrowDownRight, FileBarChart, Settings as SettingsIcon,
  Menu, X, Bell, Calendar, Sparkles, Building2
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Unified App State
  const [members, setMembers] = useState<Member[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Preselected Member ID for quick navigation between tabs (e.g. from Dues to Deposits)
  const [preselectedMemberId, setPreselectedMemberId] = useState<string | null>(null);

  // Notification Toast State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load initial data
  useEffect(() => {
    const data = loadAppData();
    setMembers(data.members);
    setDeposits(data.deposits);
    setInvestments(data.investments);
    setWithdrawals(data.withdrawals);
    setSettings(data.settings);
  }, []);

  // Sync state helper
  const syncState = (updatedData: Partial<AppData>) => {
    const currentData = {
      members,
      deposits,
      investments,
      withdrawals,
      settings,
      ...updatedData
    };
    saveAppData(currentData);
  };

  // Notification Auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Current Bengali date
  const currentBengaliDateStr = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return toBengaliDate(todayStr);
  }, []);

  // --- ACTIONS ---

  // MEMBERS
  const handleAddMember = (newMember: Omit<Member, 'id'>) => {
    const createdMember: Member = {
      ...newMember,
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
    const updated = [createdMember, ...members];
    setMembers(updated);
    syncState({ members: updated });
    setNotification({ message: 'নতুন সদস্য সফলভাবে যোগ করা হয়েছে!', type: 'success' });
  };

  const handleUpdateMember = (updatedMember: Member) => {
    const updated = members.map(m => m.id === updatedMember.id ? updatedMember : m);
    setMembers(updated);
    syncState({ members: updated });
    setNotification({ message: 'সদস্যের তথ্য সফলভাবে সংশোধন করা হয়েছে!', type: 'success' });
  };

  const handleDeleteMember = (id: string) => {
    const updatedMembers = members.filter(m => m.id !== id);
    // Cascade delete: "সদস্য মুছলে সংশ্লিষ্ট সকল জমা রেকর্ডও মুছে যাবে"
    const updatedDeposits = deposits.filter(d => d.memberId !== id);
    
    setMembers(updatedMembers);
    setDeposits(updatedDeposits);
    syncState({ members: updatedMembers, deposits: updatedDeposits });
    setNotification({ message: 'সদস্য এবং সংশ্লিষ্ট সকল জমার রেকর্ড মুছে ফেলা হয়েছে!', type: 'info' });
  };



  // BULK PAY ALL DUES FOR A SINGLE MEMBER
  const handleBulkPayMemberDues = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const newDeposits = [...deposits];
    let createdCount = 0;

    const dues = calculateMemberDues(member, deposits, settings.weeklyDepositAmount);
    if (dues.dueCount > 0) {
      dues.dueWeeks.forEach(weekNum => {
        newDeposits.push({
          id: `d_bulk_${member.id}_w${weekNum}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          memberId: member.id,
          weekNumber: weekNum,
          amount: settings.weeklyDepositAmount,
          date: todayStr,
          note: 'এক ক্লিকে বকেয়া পরিশোধ'
        });
        createdCount++;
      });
    }

    if (createdCount > 0) {
      setDeposits(newDeposits);
      syncState({ deposits: newDeposits });
      setNotification({
        message: `${member.name}-এর সকল বকেয়া পরিশোধ সম্পন্ন! মোট ${toBengaliNumber(createdCount)} টি জমার রেকর্ড তৈরি হয়েছে।`,
        type: 'success'
      });
    } else {
      setNotification({
        message: 'বর্তমানে কোনো বকেয়া কিস্তি অবশিষ্ট নেই!',
        type: 'info'
      });
    }
  };

  // DEPOSITS
  const handleRecordDeposit = (newDeposit: Omit<Deposit, 'id'>) => {
    const created: Deposit = {
      ...newDeposit,
      id: `d_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
    const updated = [created, ...deposits];
    setDeposits(updated);
    syncState({ deposits: updated });
    setNotification({ message: 'জমা রেকর্ড সফলভাবে সংরক্ষণ করা হয়েছে!', type: 'success' });
  };

  const handleUpdateDeposit = (updatedDep: Deposit) => {
    const updated = deposits.map(d => d.id === updatedDep.id ? updatedDep : d);
    setDeposits(updated);
    syncState({ deposits: updated });
    setNotification({ message: 'জমা রেকর্ড সফলভাবে সংশোধন করা হয়েছে!', type: 'success' });
  };

  const handleDeleteDeposit = (id: string) => {
    const updated = deposits.filter(d => d.id !== id);
    setDeposits(updated);
    syncState({ deposits: updated });
    setNotification({ message: 'জমা রেকর্ডটি মুছে ফেলা হয়েছে।', type: 'info' });
  };

  // INVESTMENTS
  const handleAddInvestment = (newInv: Omit<Investment, 'id'>) => {
    const created: Investment = {
      ...newInv,
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
    const updated = [created, ...investments];
    setInvestments(updated);
    syncState({ investments: updated });
    setNotification({ message: 'নতুন বিনিয়োগ প্রকল্প সফলভাবে সংযোজিত হয়েছে!', type: 'success' });
  };

  const handleUpdateInvestment = (updatedInv: Investment) => {
    const updated = investments.map(i => i.id === updatedInv.id ? updatedInv : i);
    setInvestments(updated);
    syncState({ investments: updated });
    setNotification({ message: 'বিনিয়োগ প্রকল্পের তথ্য সংশোধন করা হয়েছে!', type: 'success' });
  };

  const handleDeleteInvestment = (id: string) => {
    const updatedInvestments = investments.filter(i => i.id !== id);
    // Cascade delete: "বিনিয়োগ মুছলে সংশ্লিষ্ট সকল উত্তোলন রেকর্ডও মুছে যাবে"
    const updatedWithdrawals = withdrawals.filter(w => w.investmentId !== id);

    setInvestments(updatedInvestments);
    setWithdrawals(updatedWithdrawals);
    syncState({ investments: updatedInvestments, withdrawals: updatedWithdrawals });
    setNotification({ message: 'বিনিয়োগ প্রকল্প এবং সংশ্লিষ্ট সকল উত্তোলনের ইতিহাস মুছে ফেলা হয়েছে!', type: 'info' });
  };

  // WITHDRAWALS
  const handleRecordWithdrawal = (newWith: Omit<Withdrawal, 'id'>) => {
    const created: Withdrawal = {
      ...newWith,
      id: `w_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    };
    const updated = [created, ...withdrawals];
    setWithdrawals(updated);
    syncState({ withdrawals: updated });
    setNotification({ message: 'উত্তোলনের তথ্য সফলভাবে লিপিবদ্ধ করা হয়েছে!', type: 'success' });
  };

  const handleDeleteWithdrawal = (id: string) => {
    const updated = withdrawals.filter(w => w.id !== id);
    setWithdrawals(updated);
    syncState({ withdrawals: updated });
    setNotification({ message: 'উত্তোলনের রেকর্ডটি মুছে ফেলা হয়েছে।', type: 'info' });
  };

  // SETTINGS
  const handleUpdateSettings = (updatedSettings: AppSettings) => {
    setSettings(updatedSettings);
    syncState({ settings: updatedSettings });
  };

  // RESTORE & DATA MANAGEMENT
  const handleRestoreData = (restored: AppData) => {
    setMembers(restored.members || []);
    setDeposits(restored.deposits || []);
    setInvestments(restored.investments || []);
    setWithdrawals(restored.withdrawals || []);
    setSettings(restored.settings || DEFAULT_SETTINGS);

    saveAppData(restored);
  };

  const handleResetAllData = () => {
    setMembers([]);
    setDeposits([]);
    setInvestments([]);
    setWithdrawals([]);
    setSettings(DEFAULT_SETTINGS);
    
    clearAllAppData();
    setNotification({ message: 'সমগ্র অ্যাপ এবং ডেটাবেজ সফলভাবে রিসেট করা হয়েছে!', type: 'info' });
  };

  // --- RENDERING CONFIG ---

  const menuItems = [
    { id: 'dashboard', name: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'members', name: 'সদস্য ব্যবস্থাপনা', icon: Users },
    { id: 'deposits', name: 'জমা ব্যবস্থাপনা', icon: CreditCard },
    { id: 'dues', name: 'বকেয়া হিসাব', icon: AlertTriangle },
    { id: 'investments', name: 'বিনিয়োগ', icon: TrendingUp },
    { id: 'withdrawals', name: 'উত্তোলন (টাকা ফেরত)', icon: ArrowDownRight },
    { id: 'reports', name: 'রিপোর্ট ও রিপোর্টস', icon: FileBarChart },
    { id: 'settings', name: 'সেটিংস', icon: SettingsIcon },
  ];

  const handleMenuClick = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex text-slate-800">
      
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-white shrink-0 shadow-xl border-r border-slate-800">
        {/* Sidebar Header with Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500 overflow-hidden flex items-center justify-center text-white font-extrabold shadow-md shrink-0">
            {settings.logo ? (
              <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Building2 className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-xs truncate uppercase tracking-widest text-emerald-400">যুব উন্নয়ন সংঘ</h2>
            <h1 className="font-extrabold text-xs text-slate-200 truncate mt-0.5" title={settings.associationName}>{settings.associationName}</h1>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-500 font-semibold text-center">
          সংস্করণ ১.০.০ • লোকাল সংস্করণ
        </div>
      </aside>

      {/* 2. MOBILE MENU DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <aside className="fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col z-50 shadow-2xl border-r border-slate-800 animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-emerald-500 overflow-hidden flex items-center justify-center text-white font-extrabold shrink-0">
                  {settings.logo ? (
                    <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Building2 className="w-4 h-4 text-white" />
                  )}
                </div>
                <h1 className="font-extrabold text-xs text-slate-200 truncate">{settings.associationName}</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800 text-[9px] text-slate-500 text-center font-bold">
              হাপানিয়া যুব উন্নয়ন সংঘ © ২০২৬
            </div>
          </aside>
        </div>
      )}

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* MAIN NAV HEADER */}
        <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex items-center justify-between shadow-xs shrink-0 relative z-10">
          
          {/* Hamburger toggle & branding */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 border border-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="lg:hidden text-sm font-extrabold text-slate-800 truncate max-w-[150px] sm:max-w-none">
              {settings.associationName}
            </span>
          </div>

          {/* Right hand details: Time indicator & notification */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>আজ: <span className="text-slate-800 font-bold">{currentBengaliDateStr}</span></span>
            </div>

            {/* Quick stats indicator */}
            <div className="text-[10px] bg-slate-900 text-white font-bold px-2.5 py-1.5 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              অফলাইন ডাটাবেস
            </div>
          </div>
        </header>

        {/* NOTIFICATION FLOATER */}
        {notification && (
          <div className="fixed top-18 right-4 z-50 animate-slide-up max-w-sm">
            <div className={`p-4 rounded-xl border shadow-lg flex items-start gap-3 ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : notification.type === 'error'
                  ? 'bg-rose-50 border-rose-100 text-rose-800'
                  : 'bg-slate-800 border-slate-700 text-white'
            }`}>
              <Bell className="w-5 h-5 shrink-0 mt-0.5 animate-bounce" />
              <div className="text-xs">
                <p className="font-bold">সিস্টেম নোটিফিকেশন</p>
                <p className="mt-0.5 leading-relaxed font-medium">{notification.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE MODULE VIEW STAGE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              members={members}
              deposits={deposits}
              investments={investments}
              withdrawals={withdrawals}
              settings={settings}
              setActiveTab={setActiveTab}
              setPreselectedMemberId={setPreselectedMemberId}
            />
          )}

          {activeTab === 'members' && (
            <Members
              members={members}
              deposits={deposits}
              settings={settings}
              onAddMember={handleAddMember}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              onBulkPayMemberDues={handleBulkPayMemberDues}
              onRecordDeposit={handleRecordDeposit}
              onUpdateDeposit={handleUpdateDeposit}
              onDeleteDeposit={handleDeleteDeposit}
              setActiveTab={setActiveTab}
              setPreselectedMemberId={setPreselectedMemberId}
            />
          )}

          {activeTab === 'deposits' && (
            <Deposits
              members={members}
              deposits={deposits}
              settings={settings}
              onRecordDeposit={handleRecordDeposit}
              onUpdateDeposit={handleUpdateDeposit}
              onDeleteDeposit={handleDeleteDeposit}
              preselectedMemberId={preselectedMemberId}
              setPreselectedMemberId={setPreselectedMemberId}
            />
          )}

          {activeTab === 'dues' && (
            <Dues
              members={members}
              deposits={deposits}
              settings={settings}
              onBulkPayMemberDues={handleBulkPayMemberDues}
              setActiveTab={setActiveTab}
              setPreselectedMemberId={setPreselectedMemberId}
            />
          )}

          {activeTab === 'investments' && (
            <Investments
              investments={investments}
              withdrawals={withdrawals}
              onAddInvestment={handleAddInvestment}
              onUpdateInvestment={handleUpdateInvestment}
              onDeleteInvestment={handleDeleteInvestment}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'withdrawals' && (
            <Withdrawals
              investments={investments}
              withdrawals={withdrawals}
              onRecordWithdrawal={handleRecordWithdrawal}
              onDeleteWithdrawal={handleDeleteWithdrawal}
            />
          )}

          {activeTab === 'reports' && (
            <Reports
              members={members}
              deposits={deposits}
              settings={settings}
              setActiveTab={setActiveTab}
              setPreselectedMemberId={setPreselectedMemberId}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onRestoreData={handleRestoreData}
              onResetAllData={handleResetAllData}
              fullData={{ members, deposits, investments, withdrawals, settings }}
              setNotification={setNotification}
            />
          )}
        </main>
      </div>
    </div>
  );
}

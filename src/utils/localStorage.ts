import { AppData, Member, Deposit, Investment, Withdrawal, AppSettings } from '../types';

const STORAGE_KEY = 'hapania_association_management_data_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  associationName: 'হাপানিয়া যুব উন্নয়ন সংঘ',
  logo: null,
  weeklyDepositAmount: 50, // Default 50 ৳
};

export const INITIAL_DATA: AppData = {
  members: [],
  deposits: [],
  investments: [],
  withdrawals: [],
  settings: DEFAULT_SETTINGS,
};

// Demo data generator for testing/previewing
export const getDemoData = (): AppData => {
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Date helpers (X days ago)
  const daysAgo = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const demoMembers: Member[] = [
    { id: 'm1', name: 'মোঃ আরিফ রহমান', phone: '01712345678', joinDate: daysAgo(60), photo: null, status: 'active' },
    { id: 'm2', name: 'আব্দুল্লাহ আল মামুন', phone: '01898765432', joinDate: daysAgo(45), photo: null, status: 'active' },
    { id: 'm3', name: 'সাকিব আল হাসান', phone: '01911223344', joinDate: daysAgo(30), photo: null, status: 'active' },
    { id: 'm4', name: 'রাশেদুল ইসলাম', phone: '01555667788', joinDate: daysAgo(15), photo: null, status: 'active' },
    { id: 'm5', name: 'মোঃ মিলন হোসেন', phone: '01677889900', joinDate: daysAgo(5), photo: null, status: 'active' },
    { id: 'm6', name: 'কামরুল হাসান (নিষ্ক্রিয়)', phone: '01344556677', joinDate: daysAgo(50), photo: null, status: 'inactive' },
  ];

  // Auto deposits
  const demoDeposits: Deposit[] = [
    // Member 1 (joined 60 days ago ~ 9 weeks elapsed)
    { id: 'd1_1', memberId: 'm1', weekNumber: 1, amount: 200, date: daysAgo(56), note: 'সাপ্তাহিক কিস্তি ১' },
    { id: 'd1_2', memberId: 'm1', weekNumber: 2, amount: 200, date: daysAgo(49), note: 'সাপ্তাহিক কিস্তি ২' },
    { id: 'd1_3', memberId: 'm1', weekNumber: 3, amount: 200, date: daysAgo(42), note: 'সাপ্তাহিক কিস্তি ৩' },
    { id: 'd1_4', memberId: 'm1', weekNumber: 4, amount: 200, date: daysAgo(35), note: 'সাপ্তাহিক কিস্তি ৪' },
    { id: 'd1_5', memberId: 'm1', weekNumber: 5, amount: 200, date: daysAgo(28), note: 'সাপ্তাহিক কিস্তি ৫' },
    { id: 'd1_6', memberId: 'm1', weekNumber: 6, amount: 200, date: daysAgo(21), note: 'সাপ্তাহিক কিস্তি ৬' },
    { id: 'd1_7', memberId: 'm1', weekNumber: 7, amount: 200, date: daysAgo(14), note: 'সাপ্তাহিক কিস্তি ৭' },
    { id: 'd1_8', memberId: 'm1', weekNumber: 8, amount: 200, date: daysAgo(7), note: 'সাপ্তাহিক কিস্তি ৮' },
    // Member 2 (joined 45 days ago ~ 7 weeks elapsed)
    { id: 'd2_1', memberId: 'm2', weekNumber: 1, amount: 200, date: daysAgo(42), note: 'সাপ্তাহিক কিস্তি ১' },
    { id: 'd2_2', memberId: 'm2', weekNumber: 2, amount: 200, date: daysAgo(35), note: 'সাপ্তাহিক কিস্তি ২' },
    { id: 'd2_3', memberId: 'm2', weekNumber: 3, amount: 200, date: daysAgo(28), note: 'সাপ্তাহিক কিস্তি ৩' },
    { id: 'd2_4', memberId: 'm2', weekNumber: 4, amount: 200, date: daysAgo(21), note: 'সাপ্তাহিক কিস্তি ৪' },
    { id: 'd2_5', memberId: 'm2', weekNumber: 5, amount: 200, date: daysAgo(14), note: 'সাপ্তাহিক কিস্তি ৫' },
    // Member 3 (joined 30 days ago ~ 5 weeks elapsed)
    { id: 'd3_1', memberId: 'm3', weekNumber: 1, amount: 200, date: daysAgo(28), note: 'সাপ্তাহিক কিস্তি ১' },
    { id: 'd3_2', memberId: 'm3', weekNumber: 2, amount: 200, date: daysAgo(21), note: 'সাপ্তাহিক কিস্তি ২' },
    { id: 'd3_3', memberId: 'm3', weekNumber: 3, amount: 200, date: daysAgo(14), note: 'সাপ্তাহিক কিস্তি ৩' },
    { id: 'd3_4', memberId: 'm3', weekNumber: 4, amount: 200, date: daysAgo(7), note: 'সাপ্তাহিক কিস্তি ৪' },
    // Member 4 (joined 15 days ago ~ 3 weeks elapsed)
    { id: 'd4_1', memberId: 'm4', weekNumber: 1, amount: 200, date: daysAgo(14), note: 'সাপ্তাহিক কিস্তি ১' },
    // Member 5 (joined 5 days ago ~ 1 week elapsed)
    { id: 'd5_1', memberId: 'm5', weekNumber: 1, amount: 200, date: daysAgo(3), note: 'সাপ্তাহিক কিস্তি ১' },
  ];

  const demoInvestments: Investment[] = [
    { id: 'inv1', description: 'মৎস্য চাষ প্রকল্প - ১', amount: 5000, date: daysAgo(40), status: 'active' },
    { id: 'inv2', description: 'যুব পোল্ট্রি ফার্ম', amount: 8000, date: daysAgo(30), status: 'active' },
    { id: 'inv3', description: 'হাঁস পালন পাইলট প্রকল্প', amount: 3000, date: daysAgo(50), status: 'completed' },
  ];

  const demoWithdrawals: Withdrawal[] = [
    { id: 'w1', investmentId: 'inv1', amount: 1500, date: daysAgo(20), note: 'প্রথম দফার লাভ উত্তোলন' },
    { id: 'w2', investmentId: 'inv1', amount: 2000, date: daysAgo(10), note: 'দ্বিতীয় দফার লাভ উত্তোলন' },
    { id: 'w3', investmentId: 'inv2', amount: 3000, date: daysAgo(15), note: 'ডিম বিক্রির লভ্যাংশ' },
    { id: 'w4', investmentId: 'inv3', amount: 3500, date: daysAgo(25), note: 'সম্পূর্ণ প্রকল্প সমাপন ও উত্তোলন' },
  ];

  return {
    members: demoMembers,
    deposits: demoDeposits,
    investments: demoInvestments,
    withdrawals: demoWithdrawals,
    settings: {
      associationName: 'হাপানিয়া যুব উন্নয়ন সংঘ',
      logo: null,
      weeklyDepositAmount: 50,
    }
  };
};

export const loadAppData = (): AppData => {
  try {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (!dataStr) {
      return INITIAL_DATA;
    }
    const parsed = JSON.parse(dataStr);
    
    // Safety check for data integrity
    return {
      members: parsed.members || [],
      deposits: parsed.deposits || [],
      investments: parsed.investments || [],
      withdrawals: parsed.withdrawals || [],
      settings: parsed.settings || DEFAULT_SETTINGS,
    };
  } catch (e) {
    console.error('Error loading app data:', e);
    return INITIAL_DATA;
  }
};

export const saveAppData = (data: AppData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving app data:', e);
  }
};

export const clearAllAppData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

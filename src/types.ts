export interface Member {
  id: string;
  name: string;
  phone: string;
  joinDate: string; // YYYY-MM-DD
  photo: string | null; // Base64 data URL or null
  status: 'active' | 'inactive';
}

export interface Deposit {
  id: string;
  memberId: string;
  weekNumber: number; // week number relative to joinDate
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface Investment {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  status: 'active' | 'completed';
}

export interface Withdrawal {
  id: string;
  investmentId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface AppSettings {
  associationName: string;
  logo: string | null; // Base64 data URL or null
  weeklyDepositAmount: number;
}

export interface AppData {
  members: Member[];
  deposits: Deposit[];
  investments: Investment[];
  withdrawals: Withdrawal[];
  settings: AppSettings;
}

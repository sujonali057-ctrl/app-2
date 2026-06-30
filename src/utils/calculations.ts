import { Member, Deposit, AppSettings } from '../types';

// Convert English numbers to Bengali numbers
export function toBengaliNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '';
  const englishToBengali: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
    '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
    '.': '.'
  };
  return num
    .toString()
    .split('')
    .map(char => englishToBengali[char] || char)
    .join('');
}

// Format amount to Bengali Currency format (e.g., ১২,৫০০ ৳)
export function toBengaliCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-IN');
  return toBengaliNumber(formatted) + ' ৳';
}

// Convert YYYY-MM-DD date to a readable Bengali date representation
export function toBengaliDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${toBengaliNumber(day)} ${month}, ${toBengaliNumber(year)}`;
  } catch (e) {
    return dateStr;
  }
}

// Calculate weeks elapsed from a starting date to target date (or today)
export function getWeeksElapsed(joinDateStr: string, targetDateStr?: string): number {
  if (!joinDateStr) return 1;
  const joinDate = new Date(joinDateStr);
  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
  
  // Set times to midnight for precise date calculations
  joinDate.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  if (targetDate < joinDate) {
    return 1; // At least week 1 (current week)
  }
  
  const diffTime = targetDate.getTime() - joinDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

// Calculate due details for a specific member
export interface DueDetails {
  weeksElapsed: number;
  paidWeeks: number[];
  dueWeeks: number[];
  dueCount: number;
  dueAmount: number;
}

export function calculateMemberDues(
  member: Member,
  deposits: Deposit[],
  weeklyAmount: number,
  targetDateStr?: string
): DueDetails {
  if (member.status === 'inactive') {
    return {
      weeksElapsed: 0,
      paidWeeks: [],
      dueWeeks: [],
      dueCount: 0,
      dueAmount: 0
    };
  }

  const weeksElapsed = getWeeksElapsed(member.joinDate, targetDateStr);
  
  // Get all unique week numbers paid by this member
  const memberDeposits = deposits.filter(d => d.memberId === member.id);
  const paidWeeks = Array.from(new Set(memberDeposits.map(d => d.weekNumber))).sort((a, b) => a - b);
  
  // Due weeks are all weeks from 1 to weeksElapsed that are NOT in paidWeeks
  const dueWeeks: number[] = [];
  for (let w = 1; w <= weeksElapsed; w++) {
    if (!paidWeeks.includes(w)) {
      dueWeeks.push(w);
    }
  }

  const dueCount = dueWeeks.length;
  const dueAmount = dueCount * weeklyAmount;

  return {
    weeksElapsed,
    paidWeeks,
    dueWeeks,
    dueCount,
    dueAmount
  };
}

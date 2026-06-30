import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, AppData } from '../types';
import { getDemoData, clearAllAppData } from '../utils/localStorage';
import { toBengaliNumber, toBengaliCurrency, toBengaliDate } from '../utils/calculations';
import { 
  Settings as SettingsIcon, Building2, CreditCard, Download, 
  Upload, Trash2, Camera, Check, AlertTriangle, ShieldAlert, AlertCircle,
  Cloud, CloudOff, RefreshCw, LogOut, Database, User as UserIcon
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  googleSignOut, 
  getAccessToken, 
  findBackupFile, 
  downloadBackupData, 
  saveBackupToDrive, 
  DriveFileInfo,
  auth
} from '../utils/googleDrive';

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onRestoreData: (data: AppData) => void;
  onResetAllData: () => void;
  fullData: AppData;
  setNotification: (notif: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

export default function Settings({
  settings,
  onUpdateSettings,
  onRestoreData,
  onResetAllData,
  fullData,
  setNotification
}: SettingsProps) {
  const [formName, setFormName] = useState(settings.associationName);
  const [formLogo, setFormLogo] = useState<string | null>(settings.logo);
  const [formWeeklyAmount, setFormWeeklyAmount] = useState<number>(settings.weeklyDepositAmount);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Dual deletion confirmations
  const [showResetConfirm1, setShowResetConfirm1] = useState(false);
  const [showResetConfirm2, setShowResetConfirm2] = useState(false);
  
  // Restore confirmations
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<AppData | null>(null);

  // Google Drive Integration States
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveBackup, setDriveBackup] = useState<DriveFileInfo | null>(null);
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  
  const [showDriveRestoreConfirm, setShowDriveRestoreConfirm] = useState(false);
  const [pendingDriveData, setPendingDriveData] = useState<AppData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if we are already logged in to Google Drive in this session
  useEffect(() => {
    const token = getAccessToken();
    if (token && auth.currentUser) {
      setGoogleUser(auth.currentUser);
      setGoogleToken(token);
      checkExistingBackup(token);
    }
  }, []);

  const checkExistingBackup = async (token: string) => {
    setIsCheckingDrive(true);
    try {
      const fileInfo = await findBackupFile(token);
      setDriveBackup(fileInfo);
    } catch (err) {
      console.error("Error checking Google Drive backup:", err);
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const handleGoogleLogin = async () => {
    setDriveLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        setNotification({
          message: 'গুগল ড্রাইভ সফলভাবে কানেক্ট করা হয়েছে!',
          type: 'success'
        });
        await checkExistingBackup(res.accessToken);
      }
    } catch (err: any) {
      setNotification({
        message: 'গুগল সাইন-ইন করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
        type: 'error'
      });
    } finally {
      setDriveLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setGoogleToken(null);
      setDriveBackup(null);
      setNotification({
        message: 'গুগল ড্রাইভ ডিসকানেক্ট করা হয়েছে।',
        type: 'info'
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleBackupToDrive = async () => {
    if (!googleToken) {
      setNotification({ message: 'অনুগ্রহ করে প্রথমে গুগল ড্রাইভে সাইন-ইন করুন।', type: 'error' });
      return;
    }
    
    if (driveBackup) {
      const confirmed = window.confirm(
        'আপনার গুগল ড্রাইভে ইতিমধ্যে একটি ব্যাকআপ রয়েছে। আপনি কি এটিকে বর্তমান নতুন ডেটা দিয়ে আপডেট (ওভাররাইট) করতে চান?'
      );
      if (!confirmed) return;
    } else {
      const confirmed = window.confirm(
        'আপনি কি আপনার সমিতির বর্তমান ডেটা গুগল ড্রাইভে সংরক্ষণ করতে চান?'
      );
      if (!confirmed) return;
    }

    setDriveLoading(true);
    try {
      const updatedBackup = await saveBackupToDrive(googleToken, fullData);
      setDriveBackup(updatedBackup);
      setNotification({
        message: 'সমিতির ডেটা সফলভাবে গুগল ড্রাইভে ব্যাকআপ রাখা হয়েছে!',
        type: 'success'
      });
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        handleGoogleLogout();
        setNotification({
          message: 'সেশন শেষ হয়েছে, অনুগ্রহ করে আবার গুগল ড্রাইভে কানেক্ট করুন।',
          type: 'error'
        });
      } else {
        setNotification({
          message: 'গুগল ড্রাইভে ব্যাকআপ রাখতে ব্যর্থ হয়েছে।',
          type: 'error'
        });
      }
    } finally {
      setDriveLoading(false);
    }
  };

  const handleRestoreFromDrive = async () => {
    if (!googleToken) {
      setNotification({ message: 'অনুগ্রহ করে প্রথমে গুগল ড্রাইভে সাইন-ইন করুন।', type: 'error' });
      return;
    }
    if (!driveBackup) {
      setNotification({ message: 'গুগল ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি!', type: 'error' });
      return;
    }

    setDriveLoading(true);
    try {
      const backupData = await downloadBackupData(googleToken, driveBackup.id);
      
      if (backupData.members && Array.isArray(backupData.members) && backupData.deposits && Array.isArray(backupData.deposits)) {
        setPendingDriveData(backupData);
        setShowDriveRestoreConfirm(true);
      } else {
        setNotification({
          message: 'ত্রুটি: ক্লাউড ব্যাকআপ ফাইলের ফরম্যাট সঠিক নয়!',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({
        message: 'গুগল ড্রাইভ থেকে ব্যাকআপ ডাউনলোড করতে ব্যর্থ হয়েছে।',
        type: 'error'
      });
    } finally {
      setDriveLoading(false);
    }
  };

  const handleConfirmDriveRestore = () => {
    if (pendingDriveData) {
      onRestoreData(pendingDriveData);
      setFormName(pendingDriveData.settings.associationName);
      setFormLogo(pendingDriveData.settings.logo);
      setFormWeeklyAmount(pendingDriveData.settings.weeklyDepositAmount);
      
      setNotification({
        message: 'গুগল ড্রাইভের ক্লাউড ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে!',
        type: 'success'
      });
      setPendingDriveData(null);
      setShowDriveRestoreConfirm(false);
    }
  };

  // Handle Logo Upload and Base64 conversion
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) { // 500KB limit
        setErrorMsg('লোগোর সাইজ ৫০০ কিলোবাইটের কম হতে হবে।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormLogo(reader.result as string);
        setErrorMsg('');
      };
      reader.onerror = () => {
        setErrorMsg('লোগো লোড করতে সমস্যা হয়েছে।');
      };
      reader.readAsDataURL(file);
    }
  };

  // Profile Form Submit
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg('সমিতির নাম অবশ্যই প্রদান করতে হবে।');
      return;
    }
    if (formWeeklyAmount <= 0) {
      setErrorMsg('সাপ্তাহিক জমার পরিমাণ ০ এর চেয়ে বেশি হতে হবে।');
      return;
    }

    onUpdateSettings({
      associationName: formName.trim(),
      logo: formLogo,
      weeklyDepositAmount: formWeeklyAmount
    });

    setSuccessMsg('সমিতি প্রোফাইল ও সেটিংস সফলভাবে আপডেট করা হয়েছে!');
    setNotification({
      message: 'সেটিংস সফলভাবে আপডেট করা হয়েছে।',
      type: 'success'
    });
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // JSON EXPORT (Backup)
  const handleExportBackup = () => {
    try {
      const dataStr = JSON.stringify(fullData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `hapania_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification({
        message: 'ডেটা ব্যাকআপ ফাইল সফলভাবে ডাউনলোড হয়েছে!',
        type: 'success'
      });
    } catch (e) {
      setNotification({
        message: 'ব্যাকআপ ফাইল তৈরি করতে ব্যর্থ হয়েছে।',
        type: 'error'
      });
    }
  };

  // JSON IMPORT (Restore triggers)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic schema verification
        if (json.members && Array.isArray(json.members) && json.deposits && Array.isArray(json.deposits)) {
          setPendingRestoreData(json);
          setShowRestoreConfirm(true);
        } else {
          setNotification({
            message: 'ত্রুটি: ব্যাকআপ ফাইলের ফরম্যাট সঠিক নয়!',
            type: 'error'
          });
        }
      } catch (err) {
        setNotification({
          message: 'ত্রুটি: ফাইলটি পার্স করা সম্ভব হয়নি।',
          type: 'error'
        });
      }
    };
    reader.readAsText(file);
    // Clear input so same file can be uploaded again
    e.target.value = '';
  };

  // Confirm Restore
  const handleConfirmRestore = () => {
    if (pendingRestoreData) {
      onRestoreData(pendingRestoreData);
      setFormName(pendingRestoreData.settings.associationName);
      setFormLogo(pendingRestoreData.settings.logo);
      setFormWeeklyAmount(pendingRestoreData.settings.weeklyDepositAmount);
      
      setNotification({
        message: 'ব্যাকআপ ডেটা সফলভাবে রিস্টোর করা হয়েছে!',
        type: 'success'
      });
      setPendingRestoreData(null);
      setShowRestoreConfirm(false);
    }
  };

  // Load Demo Data Shortcut
  const handleLoadDemo = () => {
    const demo = getDemoData();
    onRestoreData(demo);
    setFormName(demo.settings.associationName);
    setFormLogo(demo.settings.logo);
    setFormWeeklyAmount(demo.settings.weeklyDepositAmount);

    setNotification({
      message: 'ডেমো ডেটা সফলভাবে লোড করা হয়েছে!',
      type: 'info'
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">অ্যাপ সেটিংস</h1>
          <p className="text-sm text-slate-500 mt-1">সমিতির পরিচিতি তথ্য, সাপ্তাহিক কিস্তি নির্ধারণ এবং ডেটা ব্যাকআপ-রিস্টোর নিয়ন্ত্রণ।</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: PROFILE FORM */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-slate-50/75 border-b border-slate-200 px-5 py-4 flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">সমিতি প্রোফাইল ও কিস্তির পরিমাণ</h2>
            </div>

            <form onSubmit={handleProfileSubmit} className="p-5 space-y-5">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-shake">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-lg flex items-center gap-3 text-sm">
                  <Check className="w-5 h-5 shrink-0 bg-emerald-500 text-white rounded-full p-0.5" />
                  <p>{successMsg}</p>
                </div>
              )}

              {/* Logo Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 p-4 rounded-lg border border-dashed border-slate-200">
                <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {formLogo ? (
                    <img src={formLogo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Building2 className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="block text-xs font-semibold text-slate-700">সমিতির লোগো</span>
                  <span className="block text-[11px] text-slate-500">অনূর্ধ্ব ৫০০ কিলোবাইট ফাইলের স্কয়ার লোগো</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="text-xs text-emerald-600 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Association Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">সমিতির নাম *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="যেমন: হাপানিয়া যুব উন্নয়ন সংঘ"
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-semibold text-slate-850"
                />
              </div>

              {/* Weekly deposit amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">ডিফল্ট সাপ্তাহিক জমার পরিমাণ (টাকা) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 text-xs font-bold font-mono">৳</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formWeeklyAmount}
                    onChange={(e) => setFormWeeklyAmount(Number(e.target.value))}
                    placeholder="যেমন: ২০০"
                    className="w-full border border-slate-200 rounded-lg pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">এই পরিমাণটি প্রতিটি জমার রেকর্ড করার সময় এবং বকেয়া হিসাব করার সময় ডিফল্ট কিস্তির হার হিসেবে ব্যবহৃত হবে।</p>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-50">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                >
                  পরিবর্তন সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: UTILITIES (BACKUP, RESET, DEMO) */}
        <div className="space-y-6">
          {/* GOOGLE DRIVE SYNC PANEL */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-blue-50/40 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">গুগল ড্রাইভ ক্লাউড ব্যাকআপ</h2>
              </div>
              {googleUser && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  কানেক্টেড
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {!googleUser ? (
                <div className="space-y-4">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    আপনার সমিতির সদস্য ও লেনদেনের সমস্ত তথ্য গুগল ড্রাইভে নিরাপদে ক্লাউডে ব্যাকআপ রাখতে পারেন। এর ফলে যেকোনো সময় যেকোনো ডিভাইস থেকে তথ্য রিস্টোর করতে পারবেন।
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={driveLoading}
                    className="w-full inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 text-slate-750 font-bold text-xs py-2.5 px-4 rounded-lg border border-slate-200 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    {driveLoading ? 'সংযোগ করা হচ্ছে...' : 'গুগল ড্রাইভ কানেক্ট করুন'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Google Profile Row */}
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {googleUser.photoURL ? (
                      <img src={googleUser.photoURL} alt={googleUser.displayName || 'Google User'} className="w-9 h-9 rounded-full border border-white shadow-xs" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                        {googleUser.displayName ? googleUser.displayName.charAt(0) : 'G'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{googleUser.displayName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{googleUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogout}
                      title="ডিসকানেক্ট করুন"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Cloud Backup Status */}
                  <div className="text-[11px] bg-blue-50/20 border border-blue-100/30 rounded-lg p-3 text-slate-700 space-y-1.5">
                    <p className="font-semibold text-slate-800">ক্লাউড ব্যাকআপের বিবরণ:</p>
                    {isCheckingDrive ? (
                      <p className="flex items-center gap-1.5 text-slate-500">
                        <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                        ক্লাউড ফাইল খোঁজা হচ্ছে...
                      </p>
                    ) : driveBackup ? (
                      <>
                        <p>• ফাইলের নাম: <span className="font-semibold font-mono text-slate-600">{driveBackup.name}</span></p>
                        <p>• সর্বশেষ ক্লাউড ব্যাকআপ: <span className="font-semibold text-emerald-700">{toBengaliDate(driveBackup.modifiedTime.split('T')[0])} ({new Date(driveBackup.modifiedTime).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })})</span></p>
                      </>
                    ) : (
                      <p className="text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        কোন ব্যাকআপ ফাইল পাওয়া যায়নি!
                      </p>
                    )}
                  </div>

                  {/* Cloud Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleBackupToDrive}
                      disabled={driveLoading}
                      className="inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-3 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      {driveLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Cloud className="w-3.5 h-3.5" />
                      )}
                      ব্যাকআপ রাখুন
                    </button>

                    <button
                      type="button"
                      onClick={handleRestoreFromDrive}
                      disabled={driveLoading || !driveBackup}
                      className="inline-flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-750 font-bold text-xs py-2.5 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      রিস্টোর করুন
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DATA CONTROL PANEL */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-slate-50/75 border-b border-slate-200 px-5 py-4 flex items-center gap-2.5">
              <Download className="w-5 h-5 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">ডেটা ব্যাকআপ ও রিস্টোর</h2>
            </div>

            <div className="p-5 space-y-4">
              {/* BACKUP DOWNLOAD */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700">১. ডেটা ব্যাকআপ তৈরি করুন</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  সমিতির সমস্ত সদস্য তথ্য এবং সঞ্চয় জমা ও বিনিয়োগের ইতিহাস লোকাল ফাইল হিসেবে এক্সপোর্ট করে ডিভাইসে সংরক্ষণ করুন।
                </p>
                <button
                  onClick={handleExportBackup}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  ব্যাকআপ ফাইল এক্সপোর্ট করুন
                </button>
              </div>

              {/* RESTORE UPLOAD */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-700">২. ডেটা রিস্টোর করুন</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  পূর্বে এক্সপোর্টকৃত ব্যাকআপ JSON ফাইলটি সিলেক্ট করে সম্পূর্ণ তথ্য অ্যাপে রিস্টোর করে পুনরায় সচল করুন।
                </p>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-750 font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  ফাইল সিলেক্ট করুন (.json)
                </button>
              </div>
            </div>
          </div>

          {/* DANGER AREA & DEMO SEEDS */}
          <div className="bg-white border border-rose-50/70 rounded-xl shadow-xs overflow-hidden">
            <div className="bg-rose-50/30 border-b border-rose-100/40 px-5 py-4 flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 className="text-sm font-bold text-rose-850 uppercase tracking-wider">ঝুঁকিপূর্ণ জোন (Danger Zone)</h2>
            </div>

            <div className="p-5 space-y-4">
              {/* DEMO DATA SEED BUTTON */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-700">টেস্টিং ডেমো ডেটা লোড করুন</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  যদি আপনি অ্যাপটির ইন্টারফেস, চার্ট ও রিপোর্টিং ফিচারগুলো দ্রুত যাচাই করতে চান, তবে এখানে ক্লিক করে কিছু নমুনা তথ্য লোড করতে পারেন।
                </p>
                <button
                  onClick={handleLoadDemo}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  ডেমো ডেটা লোড করুন
                </button>
              </div>

              {/* FACTORY RESET */}
              <div className="space-y-2 border-t border-rose-100/40 pt-4">
                <h3 className="text-xs font-bold text-rose-800">সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলুন</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  সমিতির সকল সদস্য, সঞ্চয়, জমা, বিনিয়োগ ও উত্তোলনের ইতিহাস ডেটাবেজ থেকে স্থায়ীভাবে মুছে ফেলে পুরো অ্যাপটি সম্পূর্ণ রিসেট করুন।
                </p>
                <button
                  onClick={() => setShowResetConfirm1(true)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-4 h-4" />
                  সকল ডেটা মুছুন (Reset App)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RESTORE DATA VERIFICATION DIALOG */}
      {showRestoreConfirm && pendingRestoreData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto bg-amber-50 p-2.5 rounded-full" />
              <h3 className="text-lg font-bold text-slate-800 mt-3">তথ্য রিস্টোর করার সতর্কতা</h3>
              <p className="text-xs text-slate-500 mt-2 text-justify leading-relaxed">
                রিস্টোর করলে আপনার বর্তমান লোকাল ডেটাবেজের <span className="font-bold text-rose-600">সমস্ত বিদ্যমান ডেটা স্থায়ীভাবে মুছে যাবে</span> এবং ফাইলটি হতে নতুন তথ্য দিয়ে প্রতিস্থাপিত হবে। আপনি কি আসলেই এই ব্যাকআপ ফাইলটি রিস্টোর করতে চান?
              </p>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <p>• সমিতি: <span className="font-bold text-slate-800">{pendingRestoreData.settings?.associationName}</span></p>
              <p>• সদস্য সংখ্যা: <span className="font-bold text-slate-800">{toBengaliNumber(pendingRestoreData.members?.length || 0)} জন</span></p>
              <p>• জমা রেকর্ড: <span className="font-bold text-slate-800">{toBengaliNumber(pendingRestoreData.deposits?.length || 0)} টি</span></p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setPendingRestoreData(null);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleConfirmRestore}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                হ্যাঁ, প্রতিস্থাপন করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE DRIVE CLOUD RESTORE CONFIRMATION DIALOG */}
      {showDriveRestoreConfirm && pendingDriveData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="text-center">
              <Cloud className="w-12 h-12 text-blue-600 mx-auto bg-blue-50 p-2.5 rounded-full" />
              <h3 className="text-lg font-bold text-slate-800 mt-3">ক্লাউড রিস্টোর করার সতর্কতা</h3>
              <p className="text-xs text-slate-500 mt-2 text-justify leading-relaxed">
                গুগল ড্রাইভ ব্যাকআপ রিস্টোর করলে আপনার বর্তমান লোকাল ডেটাবেজের <span className="font-bold text-rose-600">সব বিদ্যমান তথ্য মুছে যাবে</span> এবং ক্লাউড ফাইল হতে নতুন তথ্য দিয়ে প্রতিস্থাপিত হবে। আপনি কি আসলেই এই ব্যাকআপ রিস্টোর করতে চান?
              </p>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <p>• সমিতি: <span className="font-bold text-slate-800">{pendingDriveData.settings?.associationName}</span></p>
              <p>• সদস্য সংখ্যা: <span className="font-bold text-slate-800">{toBengaliNumber(pendingDriveData.members?.length || 0)} জন</span></p>
              <p>• জমা রেকর্ড: <span className="font-bold text-slate-800">{toBengaliNumber(pendingDriveData.deposits?.length || 0)} টি</span></p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  setShowDriveRestoreConfirm(false);
                  setPendingDriveData(null);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                onClick={handleConfirmDriveRestore}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                হ্যাঁ, ক্লাউড থেকে প্রতিস্থাপন করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL DELETE CONFIRMATION - LEVEL 1 */}
      {showResetConfirm1 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto bg-rose-50 p-2.5 rounded-full animate-pulse" />
              <h3 className="text-lg font-bold text-slate-800 mt-3">গুরুত্বপূর্ণ সতর্কতা (১ম ধাপ)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                আপনি কি নিশ্চিতভাবে হাপানিয়া যুব উন্নয়ন সংঘের <span className="font-bold text-rose-600">সকল তথ্য এবং সম্পূর্ণ ইতিহাস মুছে ফেলতে চান?</span> মুছে ফেলা ডেটা আর কখনোই কোনো উপায়ে ফিরিয়ে আনা যাবে না!
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm1(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                বাতিল করুন
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm1(false);
                  setShowResetConfirm2(true);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                পরবর্তী ধাপ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUAL DELETE CONFIRMATION - LEVEL 2 */}
      {showResetConfirm2 && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center">
              <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto bg-rose-100 p-2.5 rounded-full" />
              <h3 className="text-lg font-bold text-rose-700 mt-3">চূড়ান্ত নিশ্চিতকরণ (২য় ধাপ)</h3>
              <p className="text-xs text-rose-600 font-bold mt-1 leading-relaxed">
                আমি স্পষ্টভাবে বুঝতে পারছি যে এই অপারেশনের পর সমস্ত সদস্য ও লেনদেন ডেটা হারিয়ে যাবে। আমি সম্মতি দিচ্ছি।
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm2(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                না, শেষবার ভেবে পিছিয়ে যান
              </button>
              <button
                onClick={() => {
                  onResetAllData();
                  setShowResetConfirm2(false);
                }}
                className="flex-1 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                হ্যাঁ, সম্পূর্ণ মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

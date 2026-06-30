import React, { useState, useMemo } from 'react';
import { Member, Deposit, AppSettings } from '../types';
import { calculateMemberDues, toBengaliNumber, toBengaliCurrency, toBengaliDate } from '../utils/calculations';
import { 
  UserPlus, Search, Phone, Calendar, Trash2, Edit2, 
  CheckCircle, XCircle, FileText, ArrowLeft, User, CreditCard, Check, AlertCircle 
} from 'lucide-react';

interface MembersProps {
  members: Member[];
  deposits: Deposit[];
  settings: AppSettings;
  onAddMember: (member: Omit<Member, 'id'>) => void;
  onUpdateMember: (member: Member) => void;
  onDeleteMember: (id: string) => void;
  onBulkPayMemberDues: (id: string) => void;
  onRecordDeposit: (deposit: Omit<Deposit, 'id'>) => void;
  onUpdateDeposit: (deposit: Deposit) => void;
  onDeleteDeposit: (id: string) => void;
  setActiveTab: (tab: string) => void;
  setPreselectedMemberId: (id: string | null) => void;
}

export default function Members({
  members,
  deposits,
  settings,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onBulkPayMemberDues,
  onRecordDeposit,
  onUpdateDeposit,
  onDeleteDeposit,
  setActiveTab,
  setPreselectedMemberId
}: MembersProps) {
  // Navigation states
  const [viewMode, setViewMode] = useState<'list' | 'add' | 'edit' | 'details'>('list');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modals / dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formJoinDate, setFormJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  // Deposit edit & delete state
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null);
  const [editingDepositAmount, setEditingDepositAmount] = useState<number | ''>('');
  const [editingDepositWeek, setEditingDepositWeek] = useState<number | ''>('');
  const [editingDepositDate, setEditingDepositDate] = useState('');
  const [editingDepositNote, setEditingDepositNote] = useState('');
  const [editingDepositError, setEditingDepositError] = useState('');
  
  const [depositIdToDelete, setDepositIdToDelete] = useState<string | null>(null);

  const handleStartEditDeposit = (dep: Deposit) => {
    setEditingDeposit(dep);
    setEditingDepositAmount(dep.amount);
    setEditingDepositWeek(dep.weekNumber);
    setEditingDepositDate(dep.date);
    setEditingDepositNote(dep.note || '');
    setEditingDepositError('');
  };

  const handleSaveEditDeposit = () => {
    if (!editingDeposit) return;
    if (editingDepositWeek === '' || Number(editingDepositWeek) <= 0) {
      setEditingDepositError('সঠিক সপ্তাহ নম্বর প্রদান করুন।');
      return;
    }
    const finalAmount = editingDepositAmount === '' ? settings.weeklyDepositAmount : Number(editingDepositAmount);
    if (finalAmount <= 0) {
      setEditingDepositError('জমার পরিমাণ ০ এর চেয়ে বেশি হতে হবে।');
      return;
    }

    onUpdateDeposit({
      ...editingDeposit,
      weekNumber: Number(editingDepositWeek),
      amount: finalAmount,
      date: editingDepositDate,
      note: editingDepositNote.trim()
    });

    setEditingDeposit(null);
  };

  const handleDeleteDepositClick = (id: string) => {
    setDepositIdToDelete(id);
  };

  const handleConfirmDeleteDeposit = () => {
    if (depositIdToDelete) {
      onDeleteDeposit(depositIdToDelete);
      setDepositIdToDelete(null);
    }
  };

  // Handle image upload and convert to Base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        setFormError('ছবির সাইজ ১ মেগাবাইটের কম হতে হবে।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhoto(reader.result as string);
        setFormError('');
      };
      reader.onerror = () => {
        setFormError('ছবি আপলোড করতে সমস্যা হয়েছে।');
      };
      reader.readAsDataURL(file);
    }
  };

  // Pre-fill form for Edit
  const handleEditClick = (member: Member, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMember(member);
    setFormName(member.name);
    setFormPhone(member.phone);
    setFormJoinDate(member.joinDate);
    setFormStatus(member.status);
    setFormPhoto(member.photo);
    setFormError('');
    setViewMode('edit');
  };

  // Open Details view
  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setViewMode('details');
  };

  // Handle Form Submit (Add/Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      setFormError('নাম এবং ফোন নম্বর আবশ্যক!');
      return;
    }

    if (viewMode === 'add') {
      onAddMember({
        name: formName.trim(),
        phone: formPhone.trim(),
        joinDate: formJoinDate,
        photo: formPhoto,
        status: formStatus
      });
    } else if (viewMode === 'edit' && selectedMember) {
      onUpdateMember({
        id: selectedMember.id,
        name: formName.trim(),
        phone: formPhone.trim(),
        joinDate: formJoinDate,
        photo: formPhoto,
        status: formStatus
      });
      // Update details view as well
      setSelectedMember({
        id: selectedMember.id,
        name: formName.trim(),
        phone: formPhone.trim(),
        joinDate: formJoinDate,
        photo: formPhoto,
        status: formStatus
      });
    }

    // Reset Form
    resetForm();
    setViewMode('list');
  };

  const resetForm = () => {
    setFormName('');
    setFormPhone('');
    setFormJoinDate(new Date().toISOString().split('T')[0]);
    setFormStatus('active');
    setFormPhoto(null);
    setFormError('');
  };

  // Filter members
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        member.phone.includes(searchTerm);
      const matchesStatus = 
        statusFilter === 'all' || 
        member.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [members, searchTerm, statusFilter]);

  // Selected member statistics
  const memberStats = useMemo(() => {
    if (!selectedMember) return { totalPaid: 0, dues: { dueCount: 0, dueAmount: 0, dueWeeks: [] as number[] } };
    
    const mDeposits = deposits.filter(d => d.memberId === selectedMember.id);
    const totalPaid = mDeposits.reduce((sum, d) => sum + d.amount, 0);
    const dues = calculateMemberDues(selectedMember, deposits, settings.weeklyDepositAmount);
    
    return {
      totalPaid,
      dues,
      history: mDeposits.sort((a, b) => b.weekNumber - a.weekNumber)
    };
  }, [selectedMember, deposits, settings]);

  const handlePayDirectly = (member: Member, weekNum: number) => {
    onRecordDeposit({
      memberId: member.id,
      weekNumber: weekNum,
      amount: settings.weeklyDepositAmount,
      date: new Date().toISOString().split('T')[0],
      note: `বকেয়া পরিশোধ (সপ্তাহ ${weekNum})`
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">সদস্য ব্যবস্থাপনা</h1>
          <p className="text-sm text-slate-500 mt-1">সমিতির সদস্যদের তালিকা, নতুন সদস্য সংযোজন ও বিস্তারিত হিসাব।</p>
        </div>
        
        {viewMode === 'list' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setViewMode('add');
              }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
              id="add-member-btn"
            >
              <UserPlus className="w-4 h-4" />
              নতুন সদস্য যোগ
            </button>
          </div>
        )}
      </div>

      {/* FORM MODE: ADD OR EDIT */}
      {(viewMode === 'add' || viewMode === 'edit') && (
        <div className="max-w-2xl bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              {viewMode === 'add' ? 'নতুন সদস্য যোগ করুন' : 'সদস্যের তথ্য সম্পাদনা করুন'}
            </h2>
            <button 
              onClick={() => {
                resetForm();
                setViewMode(viewMode === 'edit' ? 'details' : 'list');
              }}
              className="text-slate-500 hover:text-slate-800 p-1"
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
              {/* Profile Image Upload */}
              <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-lg border border-dashed border-slate-200">
                <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                  {formPhoto ? (
                    <img src={formPhoto} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <span className="block text-xs font-semibold text-slate-700">সদস্যের ছবি</span>
                  <span className="block text-xs text-slate-500">১ মেগাবাইটের নিচে JPG/PNG ফাইল</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-2 text-xs text-emerald-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">সদস্যের নাম *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ আরিফ হোসেন"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">ফোন নম্বর *</label>
                <input
                  type="tel"
                  required
                  placeholder="যেমন: 01712345678"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Join Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">যোগদানের তারিখ</label>
                <input
                  type="date"
                  value={formJoinDate}
                  onChange={(e) => setFormJoinDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">সদস্য স্ট্যাটাস</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    সক্রিয়
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    নিষ্ক্রিয়
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setViewMode(viewMode === 'edit' ? 'details' : 'list');
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

      {/* MEMBER DETAILS VIEW */}
      {viewMode === 'details' && selectedMember && (
        <div className="space-y-6 animate-fade-in">
          {/* Back Action */}
          <button
            onClick={() => setViewMode('list')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            সদস্য তালিকায় ফিরুন
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Member Profile Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-50 text-emerald-700 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                {selectedMember.photo ? (
                  <img src={selectedMember.photo} alt={selectedMember.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3xl font-bold">{selectedMember.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedMember.name}</h2>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1.5 ${
                  selectedMember.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedMember.status === 'active' ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      সক্রিয় সদস্য
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      নিষ্ক্রিয় সদস্য
                    </>
                  )}
                </span>
              </div>

              {/* Details table */}
              <div className="w-full border-t border-b border-slate-200 py-4 text-sm text-left space-y-3">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><Phone className="w-4 h-4 text-slate-400" /> ফোন:</span>
                  <span className="font-semibold text-slate-800">{toBengaliNumber(selectedMember.phone)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> যোগদানের তারিখ:</span>
                  <span className="font-semibold text-slate-800">{toBengaliDate(selectedMember.joinDate)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> মোট সপ্তাহ:</span>
                  <span className="font-semibold text-slate-800">{toBengaliNumber(memberStats.dues.weeksElapsed)} টি</span>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full flex gap-2">
                <button
                  onClick={(e) => handleEditClick(selectedMember, e)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  সম্পাদনা করুন
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  মুছে ফেলুন
                </button>
              </div>
            </div>

            {/* Financial Overview Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                  <div className="p-3 bg-emerald-100 text-emerald-800 rounded-lg">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-emerald-800 uppercase tracking-wider">মোট জমার পরিমাণ</span>
                    <span className="text-xl font-bold text-emerald-900 mt-1 block">{toBengaliCurrency(memberStats.totalPaid)}</span>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 rounded-xl p-5 flex items-center gap-4 shadow-sm">
                  <div className="p-3 bg-rose-100 text-rose-800 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-rose-800 uppercase tracking-wider">মোট বকেয়ার পরিমাণ</span>
                    <span className="text-xl font-bold text-rose-900 mt-1 block">
                      {toBengaliCurrency(memberStats.dues.dueAmount)}
                    </span>
                    <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">({toBengaliNumber(memberStats.dues.dueCount)} সপ্তাহের বাকি)</span>
                  </div>
                </div>
              </div>

              {/* Bending Dues & Payments lists */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                {selectedMember.status === 'active' && memberStats.dues.dueCount > 0 && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 pb-2 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        বকেয়া কিস্তিসমূহ ({toBengaliNumber(memberStats.dues.dueCount)} টি)
                      </h3>
                      <button
                        onClick={() => onBulkPayMemberDues(selectedMember.id)}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-xs animate-fade-in"
                      >
                        <Check className="w-3.5 h-3.5" />
                        এক ক্লিকে সব পরিশোধ
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {memberStats.dues.dueWeeks.map(weekNum => (
                        <button
                          key={weekNum}
                          onClick={() => handlePayDirectly(selectedMember, weekNum)}
                          className="inline-flex items-center gap-1.5 text-xs bg-rose-50 hover:bg-emerald-600 hover:text-white border border-rose-200 text-rose-700 font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          সপ্তাহ {toBengaliNumber(weekNum)} (জমা দিন)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    জমার ইতিহাস ({toBengaliNumber(memberStats.history.length)} টি রেকর্ড)
                  </h3>
                  
                  {memberStats.history.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                      কোনো জমা রেকর্ড খুঁজে পাওয়া যায়নি।
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-3 text-xs font-semibold text-slate-600">সপ্তাহ</th>
                            <th className="p-3 text-xs font-semibold text-slate-600">জমার পরিমাণ</th>
                            <th className="p-3 text-xs font-semibold text-slate-600">তারিখ</th>
                            <th className="p-3 text-xs font-semibold text-slate-600">নোট/বিবরণ</th>
                            <th className="p-3 text-xs font-semibold text-slate-600 text-center">অ্যাকশন</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                          {memberStats.history.map((dep) => (
                            <tr key={dep.id} className="hover:bg-slate-50">
                              <td className="p-3 font-semibold text-slate-800">সপ্তাহ {toBengaliNumber(dep.weekNumber)}</td>
                              <td className="p-3 font-bold text-emerald-600">{toBengaliCurrency(dep.amount)}</td>
                              <td className="p-3 text-slate-500">{toBengaliDate(dep.date)}</td>
                              <td className="p-3 text-slate-500 italic">{dep.note || '-'}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleStartEditDeposit(dep)}
                                    className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                                    title="সম্পাদনা করুন"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDepositClick(dep.id)}
                                    className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                    title="মুছে ফেলুন"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER LIST MODE */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-4 p-5 animate-fade-in">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                placeholder="সদস্যের নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            
            <div className="flex gap-2 shrink-0">
              {(['all', 'active', 'inactive'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {filter === 'all' && 'সকল সদস্য'}
                  {filter === 'active' && 'সক্রিয়'}
                  {filter === 'inactive' && 'নিষ্ক্রিয়'}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE / LIST */}
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-3">
              <User className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-500">কোনো সদস্য খুঁজে পাওয়া যায়নি।</p>
              <button
                onClick={() => setViewMode('add')}
                className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
              >
                নতুন সদস্য যোগ করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMembers.map((member) => {
                const memberDues = calculateMemberDues(member, deposits, settings.weeklyDepositAmount);
                return (
                  <div
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className="border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/10 rounded-xl p-4 transition-all cursor-pointer shadow-xs hover:shadow-sm flex items-center gap-4"
                  >
                    {/* Photo/Initials */}
                    <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-slate-600 border border-slate-200 shrink-0">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-lg font-bold">{member.name.charAt(0)}</span>
                      )}
                    </div>

                    {/* Member Fast Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-bold text-sm text-slate-800 truncate">{member.name}</h3>
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          member.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {member.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                        <Phone className="w-3.5 h-3.5" />
                        {toBengaliNumber(member.phone)}
                      </p>

                      <div className="flex items-center gap-3 mt-2.5 border-t border-slate-50 pt-2 text-xs">
                        {member.status === 'active' ? (
                          <>
                            <span className="text-rose-600 font-bold block">
                              বকেয়া: {toBengaliCurrency(memberDues.dueAmount)}
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-500 block">
                              মোট কিস্তি: {toBengaliNumber(memberDues.weeksElapsed)} টি
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400">নিষ্ক্রিয় সদস্য হিসাব স্থগিত</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center">
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto bg-rose-50 p-2.5 rounded-full" />
              <h3 className="text-lg font-bold text-slate-800 mt-3">সদস্য মুছে ফেলার নিশ্চিতকরণ</h3>
              <p className="text-xs text-slate-500 mt-1">
                আপনি কি নিশ্চিতভাবে <span className="font-bold text-slate-800">"{selectedMember.name}"</span> কে মুছে ফেলতে চান? সদস্য মুছলে তার সংশ্লিষ্ট সকল জমার ইতিহাস ও রেকর্ড স্থায়ীভাবে মুছে যাবে।
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={() => {
                  onDeleteMember(selectedMember.id);
                  setShowDeleteConfirm(false);
                  setViewMode('list');
                  setSelectedMember(null);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT EDIT DIALOG */}
      {editingDeposit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">জমা কিস্তি সম্পাদন করুন</h3>
              <p className="text-xs text-slate-500 mt-1">সদস্যের পূর্ববর্তী কিস্তি জমার তথ্য আপডেট বা পরিবর্তন করুন।</p>
            </div>

            {editingDepositError && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg font-semibold">
                {editingDepositError}
              </div>
            )}

            <div className="space-y-3.5">
              {/* Week Number */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">সপ্তাহ নম্বর *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editingDepositWeek}
                  onChange={(e) => setEditingDepositWeek(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">জমার পরিমাণ (টাকা) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder={`যেমন: ${toBengaliNumber(settings.weeklyDepositAmount)}`}
                  value={editingDepositAmount}
                  onChange={(e) => setEditingDepositAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">জমার তারিখ *</label>
                <input
                  type="date"
                  required
                  value={editingDepositDate}
                  onChange={(e) => setEditingDepositDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">মন্তব্য/বিবরণ</label>
                <input
                  type="text"
                  placeholder="যেমন: মোবাইল ব্যাংকিং"
                  value={editingDepositNote}
                  onChange={(e) => setEditingDepositNote(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDeposit(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveEditDeposit}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                হিসাব আপডেট
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DEPOSIT DELETE CONFIRMATION DIALOG */}
      {depositIdToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="text-center">
              <Trash2 className="w-12 h-12 text-rose-500 mx-auto bg-rose-50 p-2.5 rounded-full" />
              <h3 className="text-lg font-bold text-slate-800 mt-3">জমা কিস্তি মুছে ফেলার নিশ্চিতকরণ</h3>
              <p className="text-xs text-slate-500 mt-1">
                আপনি কি নিশ্চিতভাবে এই জমার রেকর্ডটি মুছে ফেলতে চান? এটি মুছে ফেললে ওই সপ্তাহের কিস্তিটি পুনরায় বকেয়া হিসেবে গণ্য হবে।
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDepositIdToDelete(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={handleConfirmDeleteDeposit}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
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

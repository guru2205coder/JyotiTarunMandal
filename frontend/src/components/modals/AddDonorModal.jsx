import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { formatINR } from '../../utils/marathiWords';
import { X, UserPlus, Save, Phone, Trash2, CheckCircle2, BookOpen, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AddDonorModal = () => {
  const {
    isDonorModalOpen,
    setIsDonorModalOpen,
    editingDonor,
    activeFestival,
    refreshAll,
    showToast,
    language,
    openNewPayment,
    openReceipt,
    user,
  } = useApp();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [promisedAmount, setPromisedAmount] = useState('');
  const [bookNo, setBookNo] = useState('Book-1');
  const [physicalReceiptNo, setPhysicalReceiptNo] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('paid'); // 'paid' (जमा - पूर्ण भरणा) or 'pending' (बाकी - नंतर जमा)
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin =
    !user ||
    user?.role?.toLowerCase() === 'admin' ||
    user?.role === 'Admin' ||
    (user?.email && (user.email.toLowerCase().includes('admin') || user.email.toLowerCase().includes('gururaj')));

  // Remaining balance when editing an existing donor
  const editingRemaining = editingDonor
    ? Math.max(0, (editingDonor.promisedAmount || 0) - (editingDonor.totalPaid || 0))
    : 0;

  useEffect(() => {
    if (editingDonor) {
      setName(editingDonor.name || '');
      setMobile(editingDonor.mobile || '');
      setPromisedAmount(editingDonor.promisedAmount !== undefined ? String(editingDonor.promisedAmount) : '');
      setBookNo(editingDonor.bookNo || 'Book-1');
      setPhysicalReceiptNo(editingDonor.physicalReceiptNo || '');
      setNotes(editingDonor.notes || '');
      setPaymentStatus('pending');
      setPaymentMethod('Cash');
    } else {
      setName('');
      setMobile('');
      setPromisedAmount('');
      setBookNo('Book-1');
      setPhysicalReceiptNo('');
      setNotes('');
      setPaymentStatus('paid');
      setPaymentMethod('Cash');
    }
  }, [editingDonor, isDonorModalOpen]);

  if (!isDonorModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast(language === 'mr' ? 'कृपया देणगीदाराचे नाव टाका' : 'Please enter donor name', 'error');
      return;
    }

    const numPromised = promisedAmount ? Number(promisedAmount) : 0;

    // When creating new donor with 'paid' status, promised amount must be greater than 0
    if (!editingDonor && paymentStatus === 'paid' && numPromised <= 0) {
      showToast(
        language === 'mr'
          ? 'पूर्ण जमा करण्यासाठी कृपया ठरलेली वर्गणी रक्कम (₹) टाका किंवा "बाकी" रेडिओ बटन निवडा'
          : 'Please enter promised amount to mark fully paid or select Pending',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        festivalId: activeFestival?._id,
        name: name.trim(),
        businessName: '',
        mobile: mobile.trim(),
        address: '',
        area: '',
        promisedAmount: numPromised,
        bookNo: (bookNo || 'Book-1').trim(),
        physicalReceiptNo: physicalReceiptNo.trim(),
        notes: notes.trim(),
      };

      if (editingDonor) {
        const updated = await api.put(`/donors/${editingDonor._id}`, payload);

        // If editing and user selected to pay remaining balance now
        if (paymentStatus === 'paid' && editingRemaining > 0) {
          const receipt = await api.post('/payments', {
            festivalId: activeFestival?._id,
            donorId: editingDonor._id,
            amount: editingRemaining,
            paymentMethod: paymentMethod || 'Cash',
            bookNo: (bookNo || 'Book-1').trim(),
            physicalReceiptNo: physicalReceiptNo.trim(),
            collectedBy: user?.name || 'Admin',
            notes: notes.trim() || 'उर्वरित पूर्ण भरणा जमा (Fully Paid)',
          });

          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch (e) {}

          showToast(`🎉 देणगीदार "${updated.name}" उर्वरित रक्कम ₹${editingRemaining.toLocaleString('en-IN')} पूर्ण जमा झाली!`);
          setIsDonorModalOpen(false);
          await refreshAll();
          openReceipt(receipt);
          return;
        }

        showToast(language === 'mr' ? 'देणगीदार तपशील अपडेट केले' : 'Donor updated successfully');
        setIsDonorModalOpen(false);
        await refreshAll();
      } else {
        // Create new donor record
        const donorRecord = await api.post('/donors', payload);

        // If 'paid' (जमा) radio was selected, immediately record full payment and generate e-receipt
        if (paymentStatus === 'paid' && numPromised > 0) {
          const receipt = await api.post('/payments', {
            festivalId: activeFestival?._id,
            donorId: donorRecord._id,
            amount: numPromised,
            paymentMethod: paymentMethod || 'Cash',
            bookNo: (bookNo || 'Book-1').trim(),
            physicalReceiptNo: physicalReceiptNo.trim(),
            collectedBy: user?.name || 'Admin',
            notes: notes.trim() || 'पूर्ण भरणा जमा (Fully Paid)',
          });

          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch (e) {}

          showToast(`🎉 देणगीदार "${donorRecord.name}" जोडले व पूर्ण वर्गणी (₹${numPromised.toLocaleString('en-IN')}) जमा झाली!`);
          setIsDonorModalOpen(false);
          await refreshAll();
          openReceipt(receipt);
        } else {
          showToast(language === 'mr' ? 'नवीन देणगीदार जोडले (बाकी नोंदवली)' : 'Donor added successfully');
          setIsDonorModalOpen(false);
          await refreshAll();
        }
      }
    } catch (err) {
      showToast(err.message || 'Error saving donor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingDonor) return;
    const hasPayments = (editingDonor.totalPaid && editingDonor.totalPaid > 0) || (editingDonor.payments && editingDonor.payments.length > 0);
    
    let confirmMsg = `देणगीदार "${editingDonor.name}" हटवायचे आहेत का?`;
    if (hasPayments) {
      const pCount = editingDonor.installmentCount || editingDonor.payments?.length || 1;
      confirmMsg = `⚠️ सावधान: देणगीदार "${editingDonor.name}" चे ${pCount} पेमेंट रेकॉर्ड्स (₹${(editingDonor.totalPaid || 0).toLocaleString('en-IN')}) आहेत.\n\nया देणगीदारासह सर्व पावत्या कायमच्या हटवायच्या आहेत का?\n(ही क्रिया पूर्ववत करता येणार नाही)`;
    }

    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const url = hasPayments ? `/donors/${editingDonor._id}?cascade=true` : `/donors/${editingDonor._id}`;
      await api.delete(url);
      showToast('देणगीदार यशस्वीरीत्या हटवले');
      setIsDonorModalOpen(false);
      await refreshAll();
    } catch (err) {
      showToast(err.message || 'Error deleting donor', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#16181d] border border-[#2b2e38] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242731] bg-[#121317]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF5A1F]/20 text-[#FF5A1F] flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {editingDonor
                  ? (language === 'mr' ? 'देणगीदार तपशील संपादित करा' : 'Edit Donor Details')
                  : (language === 'mr' ? 'नवीन देणगीदार जोडा' : 'Add New Donor')}
              </h2>
              <p className="text-xs text-zinc-400">
                {activeFestival?.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDonorModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[#20222a] text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body - Address & Business Name removed as requested */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 text-sm">
          {/* Donor Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {language === 'mr' ? 'देणगीदाराचे नाव *' : 'Donor Name *'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="उदा. सिद्धेश्वर ट्रेडर्स किंवा श्री. महेश जोशी"
              className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F] transition"
              required
              autoFocus
            />
          </div>

          {/* Promised Amount & Book Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'ठरलेली वर्गणी (₹)' : 'Promised Vargani (₹)'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-bold text-zinc-400">₹</span>
                <input
                  type="number"
                  min="0"
                  value={promisedAmount}
                  onChange={(e) => setPromisedAmount(e.target.value)}
                  placeholder="उदा. 2100"
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl pl-8 pr-3.5 py-2.5 text-zinc-100 font-bold text-sm focus:outline-none focus:border-[#FF5A1F] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'पावती वही / पुस्तक क्र. (Book No)' : 'Book Number'}
              </label>
              <div className="relative">
                <BookOpen size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="text"
                  value={bookNo}
                  onChange={(e) => setBookNo(e.target.value)}
                  placeholder="उदा. Book-1 किंवा 1"
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl pl-10 pr-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F] transition"
                />
              </div>
            </div>
          </div>

          {/* Mobile & Physical Receipt No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'मोबाईल नंबर' : 'Mobile Number'}
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-3 text-zinc-500" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl pl-10 pr-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                {language === 'mr' ? 'भौतिक पावती क्र. (ऐच्छिक)' : 'Physical Receipt No (Optional)'}
              </label>
              <input
                type="text"
                value={physicalReceiptNo}
                onChange={(e) => setPhysicalReceiptNo(e.target.value)}
                placeholder="उदा. PR-101"
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F] transition"
              />
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              {language === 'mr' ? 'टीप / शेरा (Notes)' : 'Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. नियमित देणगीदार"
              className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          {/* वर्गणी भरणा प्रकार (Radio Button: जमा vs बाकी) */}
          {!editingDonor && (
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-zinc-200">
                {language === 'mr' ? 'वर्गणी भरणा पर्याय (निवडा) :' : 'Collection Option :'}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {/* Radio 1: जमा (पूर्ण भरणा) */}
                <label
                  onClick={() => setPaymentStatus('paid')}
                  className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition select-none ${
                    paymentStatus === 'paid'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50 shadow-md'
                      : 'bg-[#1a1c22] border-[#282b36] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="collectionOption"
                    value="paid"
                    checked={paymentStatus === 'paid'}
                    onChange={() => setPaymentStatus('paid')}
                    className="w-4 h-4 mt-0.5 accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className={paymentStatus === 'paid' ? 'text-emerald-400' : 'text-zinc-500'} />
                      <span>जमा (पूर्ण भरणा)</span>
                    </span>
                    <span className="text-[10.5px] text-zinc-400 block mt-0.5 leading-tight">
                      {promisedAmount && Number(promisedAmount) > 0
                        ? `₹${Number(promisedAmount).toLocaleString('en-IN')} त्वरित पावती`
                        : 'रक्कम त्वरित जमा व पावती'}
                    </span>
                  </div>
                </label>

                {/* Radio 2: बाकी (नंतर जमा) */}
                <label
                  onClick={() => setPaymentStatus('pending')}
                  className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition select-none ${
                    paymentStatus === 'pending'
                      ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50 shadow-md'
                      : 'bg-[#1a1c22] border-[#282b36] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="collectionOption"
                    value="pending"
                    checked={paymentStatus === 'pending'}
                    onChange={() => setPaymentStatus('pending')}
                    className="w-4 h-4 mt-0.5 accent-[#FF5A1F] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5">
                      <Clock size={14} className={paymentStatus === 'pending' ? 'text-amber-400' : 'text-zinc-500'} />
                      <span>बाकी (नंतर जमा)</span>
                    </span>
                    <span className="text-[10.5px] text-zinc-400 block mt-0.5 leading-tight">
                      केवळ देणगी नोंद होईल
                    </span>
                  </div>
                </label>
              </div>

              {/* Payment method selector when 'जमा (पूर्ण भरणा)' is selected */}
              {paymentStatus === 'paid' && (
                <div className="space-y-1.5 animate-in fade-in duration-150 pt-1">
                  <label className="block text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>{language === 'mr' ? 'जमा पद्धत निवडा :' : 'Payment Method :'}</span>
                    <span className="text-[11px] text-emerald-400 font-medium">पावती तयार होईल</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: '💵 रोख (Cash)' },
                      { id: 'UPI', label: '📱 UPI' },
                      { id: 'Cheque', label: '🏦 चेक (Cheque)' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition ${
                          paymentMethod === m.id
                            ? 'bg-[#0f2d29] border-[#2DD4BF] text-[#2DD4BF] font-bold shadow-sm'
                            : 'bg-[#181a1f] border-[#272b36] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* When editing existing donor with remaining balance */}
          {editingDonor && editingRemaining > 0 && (
            <div className="space-y-2.5 pt-1">
              <label className="block text-xs font-bold text-zinc-200">
                {language === 'mr' ? `उर्वरित वर्गणी (शिल्लक ₹${editingRemaining.toLocaleString('en-IN')}) :` : 'Remaining Balance :'}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label
                  onClick={() => setPaymentStatus('paid')}
                  className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition select-none ${
                    paymentStatus === 'paid'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50 shadow-md'
                      : 'bg-[#1a1c22] border-[#282b36] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="editCollectionOption"
                    value="paid"
                    checked={paymentStatus === 'paid'}
                    onChange={() => setPaymentStatus('paid')}
                    className="w-4 h-4 mt-0.5 accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className={paymentStatus === 'paid' ? 'text-emerald-400' : 'text-zinc-500'} />
                      <span>पूर्ण जमा करा</span>
                    </span>
                    <span className="text-[10.5px] text-zinc-400 block mt-0.5 leading-tight">
                      उर्वरित ₹{editingRemaining.toLocaleString('en-IN')} पावती फाडा
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setPaymentStatus('pending')}
                  className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition select-none ${
                    paymentStatus === 'pending'
                      ? 'bg-amber-950/40 border-amber-500 text-amber-200 ring-1 ring-amber-500/50 shadow-md'
                      : 'bg-[#1a1c22] border-[#282b36] text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="editCollectionOption"
                    value="pending"
                    checked={paymentStatus === 'pending'}
                    onChange={() => setPaymentStatus('pending')}
                    className="w-4 h-4 mt-0.5 accent-[#FF5A1F] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block font-bold text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5">
                      <Clock size={14} className={paymentStatus === 'pending' ? 'text-amber-400' : 'text-zinc-500'} />
                      <span>बाकी ठेवा</span>
                    </span>
                    <span className="text-[10.5px] text-zinc-400 block mt-0.5 leading-tight">
                      फक्त माहिती अपडेट करा
                    </span>
                  </div>
                </label>
              </div>

              {paymentStatus === 'paid' && (
                <div className="space-y-1.5 animate-in fade-in duration-150 pt-1">
                  <label className="block text-xs font-semibold text-zinc-300">
                    {language === 'mr' ? 'जमा पद्धत निवडा :' : 'Payment Method :'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'Cash', label: '💵 रोख (Cash)' },
                      { id: 'UPI', label: '📱 UPI' },
                      { id: 'Cheque', label: '🏦 चेक (Cheque)' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition ${
                          paymentMethod === m.id
                            ? 'bg-[#0f2d29] border-[#2DD4BF] text-[#2DD4BF] font-bold shadow-sm'
                            : 'bg-[#181a1f] border-[#272b36] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            {editingDonor ? (
              <>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={submitting || deleting}
                    className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-red-950/60 border border-red-800/80 hover:bg-red-900/80 text-red-200 font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    title="देणगीदार हटवा (Admin only)"
                  >
                    <Trash2 size={16} className="text-red-400" />
                    <span>{deleting ? 'हटवत आहे...' : 'हटवा'}</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={submitting || deleting}
                  className={`flex-1 w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.99] ${
                    paymentStatus === 'paid' && editingRemaining > 0
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/60 border border-emerald-400/30'
                      : 'bg-[#FF5A1F] hover:bg-[#E04C00] text-white shadow-orange-950/50'
                  }`}
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : paymentStatus === 'paid' && editingRemaining > 0 ? (
                    <>
                      <CheckCircle2 size={18} />
                      <span>अपडेट करा व उर्वरित ₹{editingRemaining.toLocaleString('en-IN')} जमा करा</span>
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      <span>माहिती अपडेट करा</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-[0.99] ${
                  paymentStatus === 'paid'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/70 border border-emerald-400/30'
                    : 'bg-[#FF5A1F] hover:bg-[#E04C00] text-white shadow-orange-950/50'
                }`}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : paymentStatus === 'paid' ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      {promisedAmount && Number(promisedAmount) > 0
                        ? `नोंद करा व जमा करा (₹${Number(promisedAmount).toLocaleString('en-IN')})`
                        : 'नोंद करा व जमा करा'}
                    </span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>देणगीदार नोंद जतन करा (बाकी)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

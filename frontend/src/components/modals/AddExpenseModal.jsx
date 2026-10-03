import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { X, Wallet, Check, Upload, Tag } from 'lucide-react';

export const AddExpenseModal = () => {
  const {
    isExpenseModalOpen,
    setIsExpenseModalOpen,
    activeFestival,
    refreshAll,
    showToast,
    language,
    user,
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Decoration');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paidTo, setPaidTo] = useState('');
  const [description, setDescription] = useState('');
  const [billUrl, setBillUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isExpenseModalOpen) return null;

  const categories = [
    { id: 'Decoration', mr: 'डेकोरेशन / मंडप', en: 'Decoration' },
    { id: 'Lighting', mr: 'लाईटिंग / रोषणाई', en: 'Lighting' },
    { id: 'Sound system', mr: 'साऊंड सिस्टिम', en: 'Sound system' },
    { id: 'Food', mr: 'महाप्रसाद / भोजन', en: 'Food / Prasad' },
    { id: 'Pooja materials', mr: 'पूजा व आरती साहित्य', en: 'Pooja materials' },
    { id: 'Transportation', mr: 'वाहतूक खर्च', en: 'Transportation' },
    { id: 'Other', mr: 'इतर किरकोळ खर्च', en: 'Other' },
  ];

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBillUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast(language === 'mr' ? 'कृपया खर्चाचे नाव टाका' : 'Please enter title', 'error');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showToast(language === 'mr' ? 'कृपया योग्य रक्कम टाका' : 'Please enter valid amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/expenses', {
        festivalId: activeFestival?._id,
        title: title.trim(),
        category,
        amount: numAmount,
        date,
        paymentMethod,
        paidTo: paidTo.trim(),
        description: description.trim(),
        billUrl,
        recordedBy: user?.name || 'Gururaj',
      });

      showToast(language === 'mr' ? `खर्च नोंदवला: ₹${numAmount.toLocaleString('en-IN')}` : 'Expense recorded successfully');
      setIsExpenseModalOpen(false);
      setTitle('');
      setAmount('');
      setPaidTo('');
      setDescription('');
      setBillUrl('');
      await refreshAll();
    } catch (err) {
      showToast(err.message || 'Error recording expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#16181d] border border-[#2b2e38] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242731] bg-[#121317]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <Wallet size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {language === 'mr' ? 'मंडळ खर्च नोंदवा' : 'Record Mandal Expense'}
              </h2>
              <p className="text-xs text-zinc-400">
                {activeFestival?.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpenseModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[#20222a] text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 text-sm">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {language === 'mr' ? 'खर्चाचा तपशील / शीर्षक *' : 'Expense Title *'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="उदा. मंडप सजावट किंवा आरती साहित्य"
              className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F] transition"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {language === 'mr' ? 'खर्चाचा प्रकार (Category) *' : 'Category *'}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F] transition"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {language === 'mr' ? c.mr : c.en}
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'खर्च रक्कम (₹) *' : 'Amount (₹) *'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base font-bold text-red-400">₹</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="उदा. 600"
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl pl-8 pr-3.5 py-2.5 text-zinc-100 font-bold text-base focus:outline-none focus:border-[#FF5A1F] transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'खर्च दिनांक' : 'Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F] transition"
              />
            </div>
          </div>

          {/* Payment Method & Paid To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'पेमेंट प्रकार' : 'Payment Method'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F]"
              >
                <option value="Cash">रोख (Cash)</option>
                <option value="UPI">UPI / Google Pay</option>
                <option value="Bank Transfer">बँक ट्रान्सफर</option>
                <option value="Other">इतर</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'कोणास दिले (Paid To)' : 'Paid To'}
              </label>
              <input
                type="text"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                placeholder="उदा. राहुल डेकोरेटर्स"
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              {language === 'mr' ? 'अधिक माहिती (Description)' : 'Description'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="खर्चाबाबत काही तपशील"
              className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          {/* Bill Receipt Upload */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              {language === 'mr' ? 'पावती / बिलाचा फोटो (ऐच्छिक)' : 'Bill Photo / Receipt (Optional)'}
            </label>
            <label className="flex items-center gap-2 p-3 border border-dashed border-[#343946] bg-[#121316] rounded-2xl cursor-pointer hover:border-zinc-400 transition">
              <Upload size={16} className="text-[#FF5A1F]" />
              <span className="text-xs text-zinc-400">
                {billUrl ? 'बिल निवडले आहे (बदला)' : 'फोटो अपलोड करा किंवा निवडा'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {billUrl && (
              <div className="mt-2 relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-700">
                <img src={billUrl} alt="Bill preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setBillUrl('')}
                  className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-2xl bg-[#FF5A1F] hover:bg-[#E04C00] font-bold text-white shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  <span>{language === 'mr' ? 'खर्च नोंदवा (Record Expense)' : 'Record Expense'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { X, Check, DollarSign } from 'lucide-react';

export const OpeningBalanceModal = () => {
  const {
    isOpeningBalanceModalOpen,
    setIsOpeningBalanceModalOpen,
    activeFestival,
    refreshAll,
    showToast,
    language,
  } = useApp();

  const [openingBalance, setOpeningBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeFestival) {
      setOpeningBalance(String(activeFestival.openingBalance || 0));
    }
  }, [activeFestival, isOpeningBalanceModalOpen]);

  if (!isOpeningBalanceModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const val = Number(openingBalance) || 0;
      await api.put(`/festivals/${activeFestival._id}`, {
        openingBalance: val,
      });

      showToast(language === 'mr' ? `मागील वर्षाची शिल्लक ₹${val.toLocaleString('en-IN')} सेट केली` : 'Opening balance updated');
      setIsOpeningBalanceModalOpen(false);
      await refreshAll();
    } catch (err) {
      showToast(err.message || 'Error updating opening balance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#16181d] border border-[#2b2e38] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#242731]">
          <h2 className="text-base font-bold text-white">
            {language === 'mr' ? 'मागील वर्षाची शिल्लक जोडा' : 'Add Last Year\'s Balance'}
          </h2>
          <button
            onClick={() => setIsOpeningBalanceModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[#20222a] text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {language === 'mr' ? 'मागील शिल्लक रक्कम (Opening Balance ₹)' : 'Opening Balance Amount (₹)'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-zinc-400">₹</span>
              <input
                type="number"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="उदा. 5000"
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl pl-8 pr-3.5 py-2.5 text-zinc-100 font-bold text-base focus:outline-none focus:border-[#FF5A1F]"
                required
              />
            </div>
            <p className="text-[11.5px] text-zinc-400 mt-1">
              {language === 'mr' ? 'ही रक्कम एकूण उपलब्ध शिल्लक मध्ये जोडली जाईल' : 'This amount will be added to Available Balance'}
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-2xl bg-[#FF5A1F] hover:bg-[#E04C00] font-bold text-white shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} />
                <span>{language === 'mr' ? 'शिल्लक जतन करा' : 'Save Balance'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

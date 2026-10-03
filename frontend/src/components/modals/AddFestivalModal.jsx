import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { X, Calendar, Plus, Check } from 'lucide-react';

export const AddFestivalModal = () => {
  const {
    isFestivalModalOpen,
    setIsFestivalModalOpen,
    refreshAll,
    showToast,
    language,
  } = useApp();

  const [name, setName] = useState('नवरात्र उत्सव २०२६');
  const [year, setYear] = useState('2026');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [targetCollection, setTargetCollection] = useState('100000');
  const [submitting, setSubmitting] = useState(false);

  if (!isFestivalModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await api.post('/festivals', {
        name: name.trim(),
        year: Number(year) || new Date().getFullYear(),
        openingBalance: Number(openingBalance) || 0,
        targetCollection: Number(targetCollection) || 100000,
      });

      showToast(language === 'mr' ? `नवीन उत्सव सुरू केला: ${created.name}` : `New festival created: ${created.name}`);
      setIsFestivalModalOpen(false);
      await refreshAll();
    } catch (err) {
      showToast(err.message || 'Error creating festival', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#16181d] border border-[#2b2e38] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#242731]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FF5A1F]/20 text-[#FF5A1F] flex items-center justify-center">
              <Calendar size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {language === 'mr' ? 'नवीन उत्सव / वर्ष सुरू करा' : 'Start New Festival Year'}
              </h2>
              <p className="text-xs text-zinc-400">
                {language === 'mr' ? 'मागील वर्षाचा डेटा सुरक्षित राहील' : 'Old records remain safe'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFestivalModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[#20222a] text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="pt-4 space-y-3.5 text-sm">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {language === 'mr' ? 'उत्सवाचे नाव *' : 'Festival Name *'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="उदा. नवरात्र उत्सव २०२६"
              className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'वर्ष (Year)' : 'Year'}
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                {language === 'mr' ? 'मागील शिल्लक (₹)' : 'Opening Balance (₹)'}
              </label>
              <input
                type="number"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              {language === 'mr' ? 'अपेक्षित एकूण वर्गणी (लक्ष्य ₹)' : 'Target Collection (₹)'}
            </label>
            <input
              type="number"
              value={targetCollection}
              onChange={(e) => setTargetCollection(e.target.value)}
              placeholder="100000"
              className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-2xl bg-[#FF5A1F] hover:bg-[#E04C00] font-bold text-white shadow-lg shadow-orange-950/50 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus size={18} />
                <span>{language === 'mr' ? 'उत्सव सुरू करा' : 'Create Festival'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { formatINR } from '../utils/marathiWords';
import { Plus, Receipt, Trash2, Calendar, Tag, FileText, Image as ImageIcon, ShieldCheck } from 'lucide-react';

export const ExpensesView = () => {
  const {
    activeFestival,
    setIsExpenseModalOpen,
    showToast,
    language,
    user,
  } = useApp();

  const canManageExpenses = user?.role === 'Admin' || user?.role === 'Treasurer';

  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewBillUrl, setPreviewBillUrl] = useState(null);

  const loadExpenses = (showSpinner = false) => {
    if (!activeFestival) return;
    if (showSpinner) setLoading(true);
    api.get(`/expenses?festivalId=${activeFestival._id}`)
      .then((data) => {
        setAllExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadExpenses(true);
  }, [activeFestival]);

  // Instant 0ms in-memory filtering across expense categories
  const expenses = React.useMemo(() => {
    if (selectedCategory === 'All') return allExpenses;
    return allExpenses.filter(
      (e) => (e.category || '').toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [allExpenses, selectedCategory]);

  // Dynamically compute total amount for currently selected category
  const totalAmount = React.useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const handleDeleteExpense = async (id, title) => {
    if (!window.confirm(`खर्च "${title}" हटवायचा आहे का?`)) return;
    try {
      await api.delete(`/expenses/${id}`);
      showToast('खर्च नोंद हटवली');
      loadExpenses();
    } catch (err) {
      showToast(err.message || 'Error deleting expense', 'error');
    }
  };

  const categories = [
    'All',
    'Decoration',
    'Lighting',
    'Sound system',
    'Food',
    'Pooja materials',
    'Transportation',
    'Other',
  ];

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-extrabold text-white tracking-tight">Expense</h2>
        <span className="text-xs text-zinc-400 font-medium">
          {expenses.length} entries
        </span>
      </div>

      {/* Volunteer read-only badge */}
      {!canManageExpenses && (
        <div className="bg-[#181a20] border border-[#2d303b] rounded-2xl p-3 flex items-center gap-2 text-xs text-zinc-400">
          <ShieldCheck size={16} className="text-[#2DD4BF] flex-shrink-0" />
          <span>खर्च नोंदणी व व्यवस्थापन अधिकार केवळ 💰 <strong>खजिनदार</strong> व 👑 <strong>ॲडमिन</strong>साठी आहेत. (फक्त वाचन अधिकार)</span>
        </div>
      )}

      {/* Category filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-[#FF5A1F] text-white shadow-md'
                : 'bg-[#181a1f] border border-[#272b36] text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Total expense banner if any expenses */}
      {expenses.length > 0 && (
        <div className="rounded-[22px] bg-[#211618] border border-[#442125] p-3.5 flex items-center justify-between">
          <span className="text-xs font-bold text-red-300">
            एकूण मंडळ खर्च (Total Expenses):
          </span>
          <span className="text-lg font-black text-red-400">
            {formatINR(totalAmount)}
          </span>
        </div>
      )}

      {/* Empty State matching screenshot image-0.png */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 text-xs">लोड होत आहे...</div>
      ) : expenses.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
          {/* Circular coral receipt icon (Exact match with screenshot image-0.png) */}
          <div className="w-24 h-24 rounded-full bg-[#2b191c] text-[#f87171] flex items-center justify-center mb-5 border border-[#4d252b]">
            <Receipt size={40} strokeWidth={1.7} />
          </div>

          <h3 className="text-base font-bold text-white mb-1.5">
            No expenses yet
          </h3>
          <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
            Record what the mandal spends to keep the ledger complete
          </p>
        </div>
      ) : (
        /* Expenses List */
        <div className="space-y-2.5">
          {expenses.map((e) => {
            const dateStr = new Date(e.date).toLocaleDateString('mr-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={e._id}
                className="rounded-[22px] bg-[#16171c] border border-[#252832] p-4 flex items-start justify-between shadow-sm hover:border-[#383d4c] transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-zinc-100">{e.title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#29171b] text-red-300 border border-red-900/40">
                      {e.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11.5px] text-zinc-400">
                    <span>{dateStr}</span>
                    {e.paidTo && <span>• {e.paidTo}</span>}
                    <span>• {e.paymentMethod}</span>
                  </div>

                  {e.description && (
                    <p className="text-xs text-zinc-500 mt-1">{e.description}</p>
                  )}

                  {e.billUrl && (
                    <button
                      onClick={() => setPreviewBillUrl(e.billUrl)}
                      className="mt-2 text-xs text-[#2DD4BF] hover:underline flex items-center gap-1 font-medium"
                    >
                      <ImageIcon size={13} />
                      <span>बिल पावती पहा</span>
                    </button>
                  )}
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                  <span className="text-base font-extrabold text-red-400">
                    -{formatINR(e.amount)}
                  </span>
                  {canManageExpenses && (
                    <button
                      onClick={() => handleDeleteExpense(e._id, e.title)}
                      className="p-1.5 rounded-lg bg-[#20222a] text-zinc-400 hover:text-red-400 transition"
                      title="Delete Expense"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bill Preview Modal */}
      {previewBillUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#16181d] border border-zinc-700 rounded-3xl p-4 max-w-md w-full relative">
            <button
              onClick={() => setPreviewBillUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center"
            >
              ✕
            </button>
            <h4 className="text-sm font-bold text-white mb-2">खर्च पावती / बिल</h4>
            <div className="max-h-[70vh] overflow-auto rounded-2xl">
              <img src={previewBillUrl} alt="Bill attachment" className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button - Record expense (Admin and Treasurer only) */}
      {canManageExpenses && (
        <div className="fixed bottom-16 right-4 sm:right-8 z-30">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="py-3 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E04C00] text-white font-bold text-sm shadow-xl shadow-orange-950/60 flex items-center gap-2 border border-orange-400/40 active:scale-95 transition"
          >
            <Plus size={20} strokeWidth={2.6} />
            <span>Record expense</span>
          </button>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { formatINR } from '../utils/marathiWords';
import { Search, ChevronRight, Plus, Filter, Calendar } from 'lucide-react';

export const ReceiptsView = () => {
  const {
    activeFestival,
    openReceipt,
    openNewPayment,
    openAddDonor,
    language,
  } = useApp();

  const [allReceipts, setAllReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Today' | 'Cash' | 'UPI'

  const loadReceipts = (showSpinner = false) => {
    if (!activeFestival) return;
    if (showSpinner) setLoading(true);
    api.get(`/payments?festivalId=${activeFestival._id}`)
      .then((data) => {
        setAllReceipts(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReceipts(true);
  }, [activeFestival]);

  const todayStr = new Date().toISOString().split('T')[0];

  // Instant 0ms filtering across filter pills ('All' | 'Today' | 'Cash' | 'UPI') and search
  const receipts = React.useMemo(() => {
    let list = allReceipts;

    if (activeFilter === 'Today') {
      list = list.filter((rec) => {
        const d = new Date(rec.paymentDate).toISOString().split('T')[0];
        return d === todayStr;
      });
    } else if (activeFilter === 'Cash') {
      list = list.filter((rec) => (rec.paymentMethod || '').toLowerCase() === 'cash');
    } else if (activeFilter === 'UPI') {
      list = list.filter((rec) => (rec.paymentMethod || '').toLowerCase() === 'upi');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((rec) => {
        const donor = rec.donorId || rec.donor || {};
        const donorName = (donor.name || '').toLowerCase();
        const donorMobile = (donor.mobile || '').toLowerCase();
        const recNo = (rec.receiptNo || '').toString().toLowerCase();
        const recCode = (rec.receiptCode || '').toLowerCase();
        const collectedBy = (rec.collectedBy || '').toLowerCase();
        return (
          donorName.includes(q) ||
          donorMobile.includes(q) ||
          recNo.includes(q) ||
          recCode.includes(q) ||
          collectedBy.includes(q)
        );
      });
    }

    return list;
  }, [allReceipts, activeFilter, searchTerm, todayStr]);

  // Group receipts by Date (e.g. "Today", "Yesterday", or formatted date)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const groupedReceipts = receipts.reduce((acc, rec) => {
    const recDate = new Date(rec.paymentDate).toISOString().split('T')[0];
    let label = recDate;
    if (recDate === todayStr) label = 'Today';
    else if (recDate === yesterdayStr) label = 'Yesterday';

    if (!acc[label]) acc[label] = [];
    acc[label].push(rec);
    return acc;
  }, {});

  const filterOptions = ['All', 'Today', 'Cash', 'UPI'];

  const getInstallmentLabel = (rec) => {
    const instNum = rec.installmentNumber || 1;
    const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
    const instWord = ordinals[instNum - 1] || `${instNum}th`;
    const donor = rec.donorId || rec.donor || {};
    const promised = donor.promisedAmount || 0;
    const isFull = promised > 0 ? (donor.remaining === 0 || rec.isFullyPaid) : true;

    return `${instWord} instalment of ${formatINR(rec.amount)} • ${isFull ? 'fully paid' : `${formatINR(donor.remaining || 0)} pending`}`;
  };

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Title */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xl font-extrabold text-white tracking-tight">Receipt</h2>
        <span className="text-xs text-zinc-400 font-medium">
          {receipts.length} entries
        </span>
      </div>

      {/* Search Bar (Matching screenshot image-3.png) */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-3 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search name or receipt number"
          className="w-full bg-[#181a1f] border border-[#272b36] rounded-2xl pl-10 pr-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F] transition placeholder:text-zinc-500"
        />
      </div>

      {/* Filter Pills (Matching screenshot image-3.png) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        {filterOptions.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-[#0f2d29] border border-[#1d6b62] text-[#2DD4BF]'
                  : 'bg-[#181a1f] border border-[#272b36] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Receipts List grouped by date */}
      {loading ? (
        <div className="py-12 text-center text-zinc-500 text-xs">
          लोड होत आहे...
        </div>
      ) : receipts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-zinc-400 text-sm font-medium">कोणतीही पावती सापडली नाही</p>
          <p className="text-zinc-500 text-xs mt-1">नवीन पावती फाडण्यासाठी खालील बटण दाबा</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedReceipts).map(([dateLabel, items]) => {
            const groupTotal = items.reduce((sum, r) => sum + r.amount, 0);

            return (
              <div key={dateLabel} className="space-y-2">
                {/* Date Section Header */}
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 px-1">
                  <span>{dateLabel}</span>
                  <div className="flex-1 border-t border-[#22252e]" />
                  <span>
                    {items.length} • {formatINR(groupTotal)}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {items.map((rec) => {
                    const donor = rec.donorId || rec.donor || {};
                    const time = rec.paymentDate
                      ? new Date(rec.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <div
                        key={rec._id}
                        onClick={() => openReceipt(rec)}
                        className={`rounded-[22px] bg-[#16171c] border border-[#252832] p-3.5 cursor-pointer hover:border-[#3a3f50] transition shadow-sm ${
                          rec.isReversed ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {/* Teal No. Badge */}
                            <div className="w-10 h-10 rounded-xl bg-[#0f2d29] border border-[#19564f] text-[#2DD4BF] flex flex-col items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[9px] uppercase font-bold leading-none">No.</span>
                              <span className="text-sm font-black leading-tight">{rec.receiptNo}</span>
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-zinc-100">
                                {donor.name || 'देणगीदार'}
                              </h3>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 rounded-md bg-[#382314] text-[#FB923C] text-[10.5px] font-bold">
                                  {rec.paymentMethod}
                                </span>
                                <span className="text-xs text-zinc-400">
                                  {time} • {rec.collectedBy || 'Gururaj'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-base font-extrabold text-[#22C55E]">
                              {formatINR(rec.amount)}
                            </span>
                            <ChevronRight size={16} className="text-zinc-500" />
                          </div>
                        </div>

                        {/* Subtitle with installment info */}
                        <div className="mt-2 pt-2 border-t border-[#20222a] text-[11.5px] text-zinc-400 font-medium">
                          {getInstallmentLabel(rec)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button "+ New Pavti" -> opens new donor page as requested */}
      <div className="fixed bottom-22 right-4 sm:right-8 z-30">
        <button
          onClick={() => openAddDonor()}
          className="py-3 px-5 rounded-full bg-[#FF5A1F] hover:bg-[#E04C00] text-white font-bold text-sm shadow-xl shadow-orange-950/60 flex items-center gap-2 border border-orange-400/40 active:scale-95 transition"
        >
          <Plus size={20} strokeWidth={2.6} />
          <span>New Pavti</span>
        </button>
      </div>
    </div>
  );
};

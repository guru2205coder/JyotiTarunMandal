import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/marathiWords';
import {
  Calendar,
  CheckCircle,
  Plus,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  TrendingDown,
  Users,
  Share2,
  MessageSquare,
} from 'lucide-react';

export const DashboardView = () => {
  const {
    dashboardStats,
    activeFestival,
    festivals,
    switchFestival,
    openNewPayment,
    openAddDonor,
    openReceipt,
    setIsOpeningBalanceModalOpen,
    setIsFestivalModalOpen,
    setCurrentTab,
    showToast,
    language,
    user,
  } = useApp();

  const [isFestivalMenuOpen, setIsFestivalMenuOpen] = useState(false);

  const stats = dashboardStats || {
    totalCollection: 0,
    totalExpenses: 0,
    availableBalance: 0,
    openingBalance: 0,
    percentSpent: 0,
    todayCollection: 0,
    todayReceiptsCount: 0,
    totalDonors: 0,
    pendingVargani: 0,
    whoOwesList: [],
    recentReceipts: [],
  };

  const festivalName = activeFestival?.name || 'नवरात्र उत्सव २०२६';

  const handleSendReminder = (donor) => {
    const promised = donor.promised || 0;
    const paid = donor.paid || 0;
    const remaining = donor.remaining || 0;

    const text = `🚩 *${activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर'}*\n*${activeFestival?.name || 'नवरात्र उत्सव २०२६'}*\n\nसस्नेह नमस्कार, *${donor.name}* जी.\nमंडळाच्या उत्सवासाठी आपली ठरलेली वर्गणी रक्कम ₹${promised.toLocaleString('en-IN')} असून, यापूर्वी ₹${paid.toLocaleString('en-IN')} जमा झालेली आहे.\nअद्याप *₹${remaining.toLocaleString('en-IN')}* वर्गणी शिल्लक आहे.\n\nकृपया मंडळाच्या कार्यकर्त्यांकडे वर्गणी जमा करून सहकार्य करावे ही नम्र विनंती.\n\n🙏 मंडळास सहकार्य केल्याबद्दल धन्यवाद!`;

    const encoded = encodeURIComponent(text);
    const url = donor.mobile
      ? `https://api.whatsapp.com/send?phone=91${donor.mobile.replace(/\D/g, '')}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-24 pt-2">
      {/* Top Main Dark Teal Balance Card (Matching mobile screenshot image-4.png) */}
      <div className="rounded-[28px] bg-gradient-to-br from-[#0c2f2b] to-[#08221f] border border-[#144e47] p-5 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top line of card: Balance label + Festival selector pill */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-teal-200/80 uppercase tracking-wider block">
              Balance
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-[#FEEA85] tracking-tight mt-0.5">
              {formatINR(stats.availableBalance)}
            </div>

            {/* + Add last year's balance button (Admin or Treasurer only) */}
            {(user?.role === 'Admin' || user?.role === 'Treasurer') && (
              <button
                onClick={() => setIsOpeningBalanceModalOpen(true)}
                className="mt-1.5 text-xs text-teal-200 hover:text-white flex items-center gap-1 font-medium transition group"
              >
                <span className="text-[#FF5A1F] font-bold">+</span>
                <span className="underline decoration-teal-400/40 underline-offset-2">
                  {language === 'mr' ? 'मागील शिल्लक जोडा' : 'Add last year\'s balance'}
                </span>
                {stats.openingBalance > 0 && (
                  <span className="text-[11px] text-teal-300 ml-1">
                    ({formatINR(stats.openingBalance)})
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Festival selector pill button */}
          <div className="relative">
            <button
              onClick={() => setIsFestivalMenuOpen(!isFestivalMenuOpen)}
              className="px-3 py-1.5 rounded-full bg-[#0a2320] border border-[#1b635b] text-[#FEEA85] text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:border-[#2DD4BF] transition"
            >
              <span>{festivalName}</span>
              <ChevronDown size={14} className="text-teal-300" />
            </button>

            {isFestivalMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#16181d] border border-[#2c303c] rounded-2xl shadow-2xl p-2 z-30 animate-in fade-in duration-150">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-zinc-400 border-b border-[#242732] mb-1">
                  उत्सव निवडा (Select Festival)
                </div>
                {festivals.map((fest) => (
                  <button
                    key={fest._id}
                    onClick={() => {
                      switchFestival(fest);
                      setIsFestivalMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                      fest._id === activeFestival?._id
                        ? 'bg-[#0f2d29] text-[#2DD4BF] font-bold'
                        : 'text-zinc-200 hover:bg-[#20232c]'
                    }`}
                  >
                    <span>{fest.name}</span>
                    {fest._id === activeFestival?._id && (
                      <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
                    )}
                  </button>
                ))}
                {user?.role === 'Admin' && (
                  <>
                    <div className="border-t border-[#242732] my-1" />
                    <button
                      onClick={() => {
                        setIsFestivalMenuOpen(false);
                        setIsFestivalModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#FF5A1F] hover:bg-[#20232c] font-semibold flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>+ नवीन उत्सव जोडा (Admin)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress summary banner */}
        <div className="mt-4 pt-3 border-t border-[#13443e] text-xs text-teal-100/90 font-medium">
          {stats.percentSpent}% of what came in has been spent
        </div>

        {/* Total Collection & Total Expense Indicators */}
        <div className="mt-2.5 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] flex-shrink-0" />
            <div>
              <span className="text-[11px] text-teal-200/80 block">Total Collection</span>
              <span className="text-base font-bold text-white tracking-tight">
                {formatINR(stats.totalCollection)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-[#13443e] pl-4">
            <span className="w-2 h-2 rounded-full bg-[#F87171] flex-shrink-0" />
            <div>
              <span className="text-[11px] text-teal-200/80 block">Total Expense</span>
              <span className="text-base font-bold text-white tracking-tight">
                {formatINR(stats.totalExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Collection Card (Matching screenshot image-4.png) */}
      <div
        onClick={() => setCurrentTab('receipt')}
        className="rounded-[24px] bg-[#16171c] border border-[#252832] p-4 flex items-center justify-between cursor-pointer hover:border-[#383d4c] transition shadow-md group"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#372314] text-[#FB923C] flex items-center justify-center flex-shrink-0 border border-[#52331b]">
            <Calendar size={22} />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium block">Today's Collection</span>
            <span className="text-xl font-extrabold text-[#FEEA85] tracking-tight">
              {formatINR(stats.todayCollection)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-zinc-400 group-hover:text-zinc-200 font-medium">
          <span>{stats.todayReceiptsCount} receipts</span>
          <ChevronRight size={16} />
        </div>
      </div>

      {/* "Who owes" (Pending Donors / Promises) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-zinc-400 tracking-wider">Who owes</h3>
          {stats.pendingVargani > 0 && (
            <span className="text-xs text-amber-400 font-bold">
              एकूण शिल्लक: {formatINR(stats.pendingVargani)}
            </span>
          )}
        </div>

        {/* If nothing is pending, show the exact checkmark state from screenshot image-4.png */}
        {(!stats.whoOwesList || stats.whoOwesList.length === 0) ? (
          <div className="rounded-[24px] bg-[#16171c] border border-[#252832] p-6 text-center shadow-md">
            <div className="w-14 h-14 rounded-full bg-[#143323] text-[#22C55E] flex items-center justify-center mx-auto mb-3 border border-[#1b4e33]">
              <CheckCircle size={28} />
            </div>
            <h4 className="text-sm font-bold text-white">Nothing pending</h4>
            <p className="text-xs text-zinc-400 mt-0.5">सर्व वर्गणी जमा झाली आहे</p>
            <button
              onClick={() => openAddDonor()}
              className="mt-3 text-xs text-[#FF5A1F] hover:text-[#ff7438] font-bold inline-block hover:underline"
            >
              Record a promise
            </button>
          </div>
        ) : (
          <div className="rounded-[24px] bg-[#16171c] border border-[#252832] divide-y divide-[#21242d] overflow-hidden shadow-md">
            {stats.whoOwesList.slice(0, 4).map((donor) => (
              <div
                key={donor.donorId}
                className="p-3.5 flex items-center justify-between hover:bg-[#1a1c22] transition"
              >
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">
                    {donor.name}
                  </h4>
                  <p className="text-xs text-zinc-400">
                    ठरलेली: {formatINR(donor.promised)} • जमा: {formatINR(donor.paid)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-extrabold text-amber-400 mr-1">
                    {formatINR(donor.remaining)}
                  </span>
                  <button
                    onClick={() => handleSendReminder(donor)}
                    className="p-1.5 rounded-lg bg-[#143d2c] text-[#25D366] hover:bg-[#1a523b] transition"
                    title="WhatsApp वर आठवण पाठवा"
                  >
                    <MessageSquare size={13} />
                  </button>
                  <button
                    onClick={() => openNewPayment({ _id: donor.donorId, name: donor.name, promisedAmount: donor.promised, totalPaid: donor.paid })}
                    className="px-2.5 py-1 rounded-xl bg-[#FF5A1F] text-white text-xs font-bold hover:bg-[#E04C00] transition"
                  >
                    जमा
                  </button>
                </div>
              </div>
            ))}

            {stats.whoOwesList.length > 4 && (
              <button
                onClick={() => setCurrentTab('workers')}
                className="w-full py-2.5 text-center text-xs font-bold text-zinc-400 hover:text-[#FF5A1F] transition"
              >
                सर्व {stats.whoOwesList.length} थकबाकीदार पहा →
              </button>
            )}
          </div>
        )}
      </div>


      {/* Recent Receipts (Matching screenshot image-4.png) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-zinc-400 tracking-wider">Recent Receipts</h3>
          <button
            onClick={() => setCurrentTab('receipt')}
            className="text-xs font-bold text-zinc-400 hover:text-[#FF5A1F] transition"
          >
            View all
          </button>
        </div>

        {(!stats.recentReceipts || stats.recentReceipts.length === 0) ? (
          <div className="rounded-[24px] bg-[#16171c] border border-[#252832] p-6 text-center text-xs text-zinc-400">
            कोणतीही पावती फाडलेली नाही. खालील बटणावर क्लिक करून पहिली पावती फाडा!
          </div>
        ) : (
          <div className="space-y-2">
            {stats.recentReceipts.map((rec) => (
              <div
                key={rec._id}
                onClick={() => openReceipt(rec)}
                className="rounded-[22px] bg-[#16171c] border border-[#252832] p-3.5 flex items-center justify-between cursor-pointer hover:border-[#3a3f50] transition shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {/* Teal Badge with No. */}
                  <div className="w-10 h-10 rounded-xl bg-[#0f2d29] border border-[#19564f] text-[#2DD4BF] flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[9px] uppercase font-bold leading-none">No.</span>
                    <span className="text-sm font-black leading-tight">{rec.receiptNo}</span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-zinc-100">
                      {rec.donorName}
                    </h4>
                    <span className="inline-block mt-0.5 text-[11px] font-semibold text-zinc-400">
                      {rec.paymentMethod}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-[#22C55E]">
                    {formatINR(rec.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

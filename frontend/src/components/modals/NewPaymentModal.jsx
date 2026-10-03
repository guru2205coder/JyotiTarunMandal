import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { formatINR, numberToMarathiWords } from '../../utils/marathiWords';
import {
  X,
  Check,
  AlertTriangle,
  UserPlus,
  CreditCard,
  Banknote,
  QrCode,
  Search,
  ChevronDown,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const NewPaymentModal = () => {
  const {
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    selectedDonorForPayment,
    activeFestival,
    refreshAll,
    openReceipt,
    showToast,
    openAddDonor,
    language,
    user,
  } = useApp();

  const [donors, setDonors] = useState([]);
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [donorSearchInput, setDonorSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookNo, setBookNo] = useState('');
  const [physicalReceiptNo, setPhysicalReceiptNo] = useState('');
  const [notes, setNotes] = useState('');
  const [allowOverpayment, setAllowOverpayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overpaymentError, setOverpaymentError] = useState(null);

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Load donors list
  useEffect(() => {
    if (isPaymentModalOpen && activeFestival) {
      api.get(`/donors?festivalId=${activeFestival._id}`)
        .then((data) => {
          setDonors(data);
          if (selectedDonorForPayment) {
            setSelectedDonorId(selectedDonorForPayment._id);
            setDonorSearchInput(selectedDonorForPayment.name || '');
          } else if (data.length > 0 && !selectedDonorId) {
            setSelectedDonorId(data[0]._id);
            setDonorSearchInput(data[0].name || '');
          }
        })
        .catch(console.error);
    }
  }, [isPaymentModalOpen, activeFestival, selectedDonorForPayment]);

  // Update book numbers when donor changes
  useEffect(() => {
    const selected = donors.find((d) => d._id === selectedDonorId);
    if (selected) {
      setBookNo(selected.bookNo || 'Book-1');
      setPhysicalReceiptNo(selected.physicalReceiptNo || '');
      setDonorSearchInput(selected.name || '');
    }
  }, [selectedDonorId, donors]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isPaymentModalOpen) return null;

  const currentDonor = donors.find((d) => d._id === selectedDonorId) || selectedDonorForPayment;
  const promised = currentDonor?.promisedAmount || 0;
  const paid = currentDonor?.totalPaid || 0;
  const remaining = Math.max(0, promised - paid);

  // Live filter for donors by typing
  const filteredDonors = donors.filter((d) => {
    if (!donorSearchInput.trim()) return true;
    const q = donorSearchInput.toLowerCase().trim();
    const matchName = d.name?.toLowerCase().includes(q);
    const matchMobile = d.mobile?.includes(q);
    const matchBook = d.bookNo?.toLowerCase().includes(q);
    return matchName || matchMobile || matchBook;
  });

  const handleSelectDonor = (donor) => {
    setSelectedDonorId(donor._id);
    setDonorSearchInput(donor.name);
    setBookNo(donor.bookNo || 'Book-1');
    setPhysicalReceiptNo(donor.physicalReceiptNo || '');
    setIsDropdownOpen(false);
    setOverpaymentError(null);
  };

  const handleClearDonor = () => {
    setSelectedDonorId('');
    setDonorSearchInput('');
    setIsDropdownOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDonorId) {
      showToast(language === 'mr' ? 'कृपया देणगीदार निवडा किंवा शोधा' : 'Please search and select a donor', 'error');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      showToast(language === 'mr' ? 'कृपया योग्य रक्कम टाका' : 'Please enter valid amount', 'error');
      return;
    }

    setSubmitting(true);
    setOverpaymentError(null);

    try {
      const receipt = await api.post('/payments', {
        festivalId: activeFestival._id,
        donorId: selectedDonorId,
        amount: numAmount,
        paymentDate,
        paymentMethod,
        transactionRef,
        bookNo: (bookNo || 'Book-1').trim(),
        physicalReceiptNo: physicalReceiptNo.trim(),
        collectedBy: user?.name || 'Gururaj',
        notes,
        allowOverpayment,
      });

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (err) {}

      showToast(language === 'mr' ? `पावती क्रमांक #${receipt.receiptNo} यशस्वीरीत्या तयार केली!` : `Receipt #${receipt.receiptNo} generated!`);
      setIsPaymentModalOpen(false);
      await refreshAll();

      // Open Marathi e-Receipt Modal directly
      openReceipt(receipt);
    } catch (err) {
      if (err.data?.overpaymentWarning) {
        setOverpaymentError(err.data.message);
      } else {
        showToast(err.message || 'Error recording payment', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#16181d] border border-[#2b2e38] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#242731] bg-[#121317]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5A1F]" />
              {language === 'mr' ? 'नवीन पावती फाडा / वर्गणी जमा' : 'Record Vargani Payment'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {activeFestival?.name || 'नवरात्र उत्सव'}
            </p>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(false)}
            className="w-8 h-8 rounded-full bg-[#20222a] text-zinc-400 hover:text-white flex items-center justify-center transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Requirement: Type to search donor rather than selecting from static dropdown */}
          <div className="space-y-1.5" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Search size={13} className="text-[#FF5A1F]" />
                <span>{language === 'mr' ? 'देणगीदार शोधा (टाईप करा) *' : 'Search Donor by Typing *'}</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  openAddDonor();
                }}
                className="text-xs text-[#FF5A1F] hover:underline flex items-center gap-1 font-semibold"
              >
                <UserPlus size={13} />
                <span>{language === 'mr' ? '+ नवीन देणगीदार' : '+ New Donor'}</span>
              </button>
            </div>

            {/* Type-to-Search Input Box */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={donorSearchInput}
                onChange={(e) => {
                  setDonorSearchInput(e.target.value);
                  setIsDropdownOpen(true);
                  if (selectedDonorId && e.target.value !== currentDonor?.name) {
                    setSelectedDonorId('');
                  }
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="देणगीदाराचे नाव, मोबाईल किंवा वही क्र. टाईप करा..."
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl pl-10 pr-20 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F] transition placeholder:text-zinc-500"
              />

              <div className="absolute right-2.5 top-2 flex items-center gap-1">
                {donorSearchInput && (
                  <button
                    type="button"
                    onClick={handleClearDonor}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white transition"
                    title="Clear"
                  >
                    <X size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Autocomplete / Instant Filter Dropdown */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#16181f] border border-[#2d3240] rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-[#222632] animate-in fade-in slide-in-from-top-1 duration-150">
                  {filteredDonors.length === 0 ? (
                    <div className="p-4 text-center space-y-2">
                      <p className="text-xs text-zinc-400">
                        "{donorSearchInput}" नावाचा कोणताही देणगीदार सापडला नाही
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPaymentModalOpen(false);
                          openAddDonor();
                        }}
                        className="text-xs font-bold text-[#FF5A1F] hover:underline block mx-auto"
                      >
                        + नवीन देणगीदार म्हणून जोडा
                      </button>
                    </div>
                  ) : (
                    filteredDonors.map((d) => {
                      const isSelected = d._id === selectedDonorId;
                      const dPromised = d.promisedAmount || 0;
                      const dPaid = d.totalPaid || 0;
                      const dRem = d.remaining !== undefined ? d.remaining : Math.max(0, dPromised - dPaid);

                      return (
                        <div
                          key={d._id}
                          onClick={() => handleSelectDonor(d)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition hover:bg-[#20232c] ${
                            isSelected ? 'bg-[#232734] border-l-4 border-l-[#FF5A1F]' : ''
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-zinc-100">{d.name}</span>
                              {d.bookNo && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1d2332] text-zinc-300 border border-[#2b3346] flex items-center gap-0.5">
                                  <BookOpen size={9} />
                                  <span>{d.bookNo}</span>
                                </span>
                              )}
                              {dRem === 0 && dPromised > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                                  पूर्ण
                                </span>
                              )}
                            </div>
                            {d.mobile && (
                              <p className="text-[11px] text-zinc-400">
                                मो: {d.mobile}
                              </p>
                            )}
                          </div>

                          <div className="text-right text-xs">
                            <span className="block font-bold text-amber-300">
                              बाकी: {formatINR(dRem)}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              ठरलेली: {formatINR(dPromised)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected Donor Confirmation Tag */}
            {currentDonor && (
              <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#13231d] border border-[#1e4d3e] text-xs text-emerald-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>निवडलेले देणगीदार: <strong className="text-white">{currentDonor.name}</strong></span>
                  {currentDonor.bookNo && <span className="text-[11px] text-zinc-400">({currentDonor.bookNo})</span>}
                </span>
                <button
                  type="button"
                  onClick={handleClearDonor}
                  className="text-xs text-zinc-400 hover:text-white underline font-semibold ml-2"
                >
                  बदला
                </button>
              </div>
            )}
          </div>

          {/* Donor Ledger Glance Card */}
          {currentDonor && (
            <div className="bg-[#0f2423] border border-[#144944] rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-teal-200/80 font-medium">
                  {language === 'mr' ? 'एकूण ठरलेली वर्गणी:' : 'Total Promised:'}
                </span>
                <span className="font-bold text-teal-100 text-sm">
                  {formatINR(promised)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-teal-200/80 font-medium">
                  {language === 'mr' ? 'यापूर्वी जमा रक्कम:' : 'Already Paid:'}
                </span>
                <span className="font-semibold text-emerald-400">
                  {formatINR(paid)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#195650]">
                <span className="text-teal-200/90 font-semibold">
                  {language === 'mr' ? 'शिल्लक रक्कम:' : 'Remaining Balance:'}
                </span>
                <span className="font-bold text-amber-300 text-sm">
                  {formatINR(remaining)}
                </span>
              </div>
            </div>
          )}

          {/* Payment Amount */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {language === 'mr' ? 'जमा रक्कम (₹) *' : 'Amount Received (₹) *'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-zinc-400">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setOverpaymentError(null);
                }}
                placeholder="उदा. 1500"
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl pl-8 pr-3.5 py-2.5 text-zinc-100 font-bold text-base focus:outline-none focus:border-[#FF5A1F] transition"
                required
              />
            </div>
            {amount && !isNaN(amount) && Number(amount) > 0 && (
              <p className="text-[11.5px] text-zinc-400 mt-1 pl-1 italic">
                {numberToMarathiWords(amount)}
              </p>
            )}
          </div>

          {/* Overpayment Alert & Confirmation */}
          {overpaymentError && (
            <div className="bg-amber-950/40 border border-amber-600/50 rounded-2xl p-3 text-xs text-amber-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p>{overpaymentError}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1 font-semibold text-white">
                <input
                  type="checkbox"
                  checked={allowOverpayment}
                  onChange={(e) => setAllowOverpayment(e.target.checked)}
                  className="rounded text-[#FF5A1F] focus:ring-0"
                />
                <span>{language === 'mr' ? 'जास्त रक्कम घेण्याची खात्री आहे (Allow overpayment)' : 'Authorize overpayment'}</span>
              </label>
            </div>
          )}

          {/* Payment Method Pills */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {language === 'mr' ? 'पेमेंट प्रकार *' : 'Payment Method *'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['Cash', 'UPI', 'Other'].map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                    paymentMethod === method
                      ? 'bg-[#3b2816] border-[#FF5A1F] text-[#FB923C] font-semibold'
                      : 'bg-[#1c1f26] border-[#2b2f3a] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {method === 'Cash' && <Banknote size={14} />}
                  {method === 'UPI' && <QrCode size={14} />}
                  {method === 'Other' && <CreditCard size={14} />}
                  <span>{method === 'Cash' ? 'रोख (Cash)' : method}</span>
                </button>
              ))}
            </div>
          </div>

          {/* UPI Reference if applicable */}
          {paymentMethod === 'UPI' && (
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                {language === 'mr' ? 'UPI संदर्भ / UTR क्रमांक (ऐच्छिक)' : 'UPI Reference / UTR No (Optional)'}
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="उदा. UPI/429381..."
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
          )}

          {/* Payment Date & Collector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                {language === 'mr' ? 'तारीख' : 'Date'}
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                {language === 'mr' ? 'पावती घेणारा (कार्यकर्ता)' : 'Collector'}
              </label>
              <input
                type="text"
                defaultValue={user?.name || 'Gururaj'}
                className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3 py-2 text-zinc-300 text-xs focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>
          </div>

          {/* Physical Book link */}
          <div className="border border-[#262a34] bg-[#121316] rounded-2xl p-3 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
              {language === 'mr' ? 'पावती वही / पुस्तक नोंद (Book Number)' : 'Book Number'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  value={bookNo}
                  onChange={(e) => setBookNo(e.target.value)}
                  placeholder="वही क्र. (उदा. Book-1)"
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={physicalReceiptNo}
                  onChange={(e) => setPhysicalReceiptNo(e.target.value)}
                  placeholder="भौतिक पावती क्र."
                  className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-xl px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-[#FF5A1F]"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              {language === 'mr' ? 'टीप (Notes)' : 'Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="उदा. प्रथम हप्ता / गुगल पे द्वारे"
              className="w-full bg-[#1c1f26] border border-[#2e3340] rounded-2xl px-3.5 py-2 text-zinc-100 text-xs focus:outline-none focus:border-[#FF5A1F]"
            />
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
                  <span>{language === 'mr' ? 'पावती तयार करा (Generate Receipt)' : 'Generate Receipt'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

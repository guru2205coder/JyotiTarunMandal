import React, { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../utils/api';
import { formatINR, numberToMarathiWords } from '../../utils/marathiWords';
import { openWhatsApp } from '../../utils/whatsapp';
import { X, Printer, Download, Share2, AlertOctagon, CheckCircle2, ShieldCheck, MessageCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const ReceiptModal = () => {
  const {
    isReceiptModalOpen,
    setIsReceiptModalOpen,
    selectedReceipt,
    refreshAll,
    showToast,
    language,
    user,
  } = useApp();

  const receiptRef = useRef();
  const [downloading, setDownloading] = useState(false);
  const [showReversalPrompt, setShowReversalPrompt] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  if (!isReceiptModalOpen || !selectedReceipt) return null;

  const payment = selectedReceipt;
  const donor = payment.donor || payment.donorId || {};
  const festival = payment.festival || payment.festivalId || {};

  const donorName = donor.name || payment.donorName || 'देणगीदार';
  const businessName = donor.businessName || payment.businessName || '';
  const mobile = donor.mobile || payment.donorMobile || payment.mobile || '';
  const receiptNo = payment.receiptNo;
  const installmentNo = payment.installmentNumber || 1;
  const amount = payment.amount || 0;
  const promisedAmount = donor.promisedAmount !== undefined ? donor.promisedAmount : (payment.promisedAmount || 0);
  const previouslyPaid = payment.previouslyPaid !== undefined ? payment.previouslyPaid : 0;
  const totalPaidSoFar = payment.totalPaidSoFar !== undefined ? payment.totalPaidSoFar : (previouslyPaid + amount);
  const remaining = payment.remainingBalance !== undefined ? payment.remainingBalance : Math.max(0, promisedAmount - totalPaidSoFar);
  const isFullyPaid = payment.isFullyPaid !== undefined ? payment.isFullyPaid : (promisedAmount > 0 ? totalPaidSoFar >= promisedAmount : true);
  const marathiWords = payment.amountInMarathiWords || numberToMarathiWords(amount);
  const paymentDate = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('mr-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }) : new Date().toLocaleDateString('mr-IN');
  const bookNo = payment.bookNo || donor.bookNo || '';
  const paymentMethod = payment.paymentMethod || 'रोख (Cash)';
  const collectedBy = payment.collectedBy || user?.name || 'मंडळ प्रतिनिधी';

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Helper to convert any oklch color string to canvas-supported hex/rgb
  const convertOklchColor = (val) => {
    if (!val || typeof val !== 'string' || !val.includes('oklch')) return val;
    try {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      const ctx = c.getContext('2d');
      ctx.fillStyle = val;
      return ctx.fillStyle;
    } catch (e) {
      return '#18181b';
    }
  };

  // Shared Receipt PDF Generator
  const generateReceiptPDF = async () => {
    if (!receiptRef.current) return null;
    const element = receiptRef.current;

    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        const all = clonedDoc.querySelectorAll('#printable-receipt, #printable-receipt *');
        all.forEach((el) => {
          const comp = window.getComputedStyle(el);
          ['color', 'backgroundColor', 'borderColor', 'outlineColor', 'fill', 'stroke'].forEach((prop) => {
            const val = comp[prop];
            if (val && typeof val === 'string' && val.includes('oklch')) {
              el.style[prop] = convertOklchColor(val);
            }
          });
        });
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a5');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return { pdf, canvas };
  };

  // Download PDF Handler
  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await generateReceiptPDF();
      if (!res) return;
      res.pdf.save(`Pavti_${receiptNo}_${donorName.replace(/\s+/g, '_')}.pdf`);
      showToast(language === 'mr' ? 'पावती PDF डाऊनलोड झाली!' : 'Receipt PDF downloaded!');
    } catch (err) {
      console.error(err);
      showToast('PDF generation failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // WhatsApp Share Handler - Shares complete PDF receipt
  const handleShareWhatsApp = async () => {
    setDownloading(true);
    try {
      const res = await generateReceiptPDF();
      if (!res) return;

      const fileName = `Pavti_${receiptNo}_${donorName.replace(/\s+/g, '_')}.pdf`;
      const pdfBlob = res.pdf.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      const text = `*${festival.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ'}*
📍 ${festival.mandalAddress || 'इंदिरा नगर, सोलापूर'}
🚩 ${festival.name || 'नवरात्र उत्सव २०२६'}

📜 *अधिकृत वर्गणी पावती क्र:* ${receiptNo}
👤 *देणगीदार:* ${donorName}${businessName ? ` (${businessName})` : ''}
💰 *वर्गणी जमा रक्कम:* ₹${amount.toLocaleString('en-IN')}
✍️ *अक्षरी:* ${marathiWords}
💳 *पद्धत:* ${paymentMethod}
📅 *दिनांक:* ${paymentDate}
✍️ *पावती देणारा:* ${collectedBy}

📎 *अधिकृत PDF पावती सोबत जोडलेली आहे.*
🙏 *मंडळास सहकार्य केल्याबद्दल मनःपूर्वक धन्यवाद!*`;

      // 1. If Web Share API supports file sharing (Mobile phones / WhatsApp app)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `वर्गणी पावती क्र. ${receiptNo} - ${donorName}`,
          text: text,
        });
        showToast(language === 'mr' ? 'पावती PDF WhatsApp वर शेअर झाली!' : 'Receipt PDF shared on WhatsApp!');
        return;
      }

      // 2. Fallback for Desktop: download the PDF file and open WhatsApp
      res.pdf.save(fileName);
      openWhatsApp(mobile, text);
      showToast(language === 'mr' ? 'पावती PDF डाऊनलोड झाली व WhatsApp उघडले!' : 'Receipt PDF downloaded & WhatsApp opened!');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('WhatsApp share error:', err);
        showToast('WhatsApp शेअर करताना त्रुटी आली', 'error');
      }
    } finally {
      setDownloading(false);
    }
  };

  // Reversal / Correction Handler
  const handleReversePayment = async () => {
    if (!reversalReason.trim()) {
      showToast('कृपया दुरुस्तीचे कारण नमूद करा', 'error');
      return;
    }
    setReversing(true);
    try {
      await api.post(`/payments/${payment._id}/reverse`, {
        reversalReason,
        reversedBy: user?.name || 'Admin',
      });
      showToast('पावती रद्द / दुरुस्त करण्यात आली (Audit trail recorded)');
      setShowReversalPrompt(false);
      setIsReceiptModalOpen(false);
      await refreshAll();
    } catch (err) {
      showToast(err.message || 'Error reversing payment', 'error');
    } finally {
      setReversing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#14151a] border border-[#2b2e38] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl my-auto animate-in fade-in duration-200">
        {/* Action Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#22252e] bg-[#101115] no-print">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#14B8A6]/20 text-[#2DD4BF] border border-[#14B8A6]/40">
              पावती क्र. {receiptNo}
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              {paymentDate}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-[#1c1f26] hover:bg-[#252833] text-zinc-300 hover:text-white transition"
              title="Print Receipt"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="p-2 rounded-xl bg-[#1c1f26] hover:bg-[#252833] text-zinc-300 hover:text-white transition disabled:opacity-50"
              title="Download PDF"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handleShareWhatsApp}
              disabled={downloading}
              className="p-2 rounded-xl bg-[#128C7E]/20 text-[#25D366] hover:bg-[#128C7E]/30 transition disabled:opacity-50"
              title="Share PDF on WhatsApp"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => setIsReceiptModalOpen(false)}
              className="p-2 rounded-xl bg-[#20222a] text-zinc-400 hover:text-white transition ml-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* RECEIPT PREVIEW (Designed to print and export beautifully as Marathi Pavti) */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[75vh]">
          <div
            id="printable-receipt"
            ref={receiptRef}
            className="rounded-2xl p-5 sm:p-6 shadow-md relative font-serif select-none"
            style={{
              fontFamily: "'Noto Sans Devanagari', 'Inter', serif",
              backgroundColor: '#ffffff',
              color: '#18181b',
              border: '2px solid #f97316',
            }}
          >
            {/* Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
              <img src="/mandal-logo.jpg" alt="watermark" className="w-60 h-60 object-contain rounded-full" />
            </div>

            {/* Religious Invocations */}
            <div
              className="text-center text-[11px] sm:text-xs font-semibold pb-1.5 mb-2"
              style={{ color: '#7c2d12', borderBottom: '1px solid #fed7aa' }}
            >
              ॥ श्री गणेशाय नमः ॥ &nbsp;&nbsp;&nbsp; ॥ श्री अंबाबाई प्रसन्न ॥ &nbsp;&nbsp;&nbsp; ॥ श्री तुळजाभवानी प्रसन्न ॥
            </div>

            {/* Mandal Header */}
            <div className="text-center flex flex-col items-center">
              <img
                src="/mandal-logo.jpg"
                alt="ज्योती नवरात्र मंडळ लोगो"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover shadow-md mb-1.5"
                style={{ border: '2px solid #d97706' }}
              />
              <div
                className="inline-block px-3 py-0.5 rounded-full text-[10.5px] font-bold tracking-wider uppercase mb-1"
                style={{ backgroundColor: '#ffedd5', color: '#9a3412' }}
              >
                रजि. नं: {festival.registrationNo || 'महा./६१३/सोलापूर'}
              </div>
              <h2
                className="text-xl sm:text-2xl font-black tracking-tight leading-tight"
                style={{ color: '#431407' }}
              >
                {festival.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ'}
              </h2>
              <p
                className="text-xs font-medium mt-0.5"
                style={{ color: '#3f3f46' }}
              >
                {festival.mandalAddress || '१९३, एम.आय.डी.सी.रोड, सोलापूर'}
              </p>
              <div
                className="mt-1.5 inline-block px-4 py-0.5 font-bold text-sm sm:text-base tracking-wide"
                style={{ color: '#7c2d12', borderTop: '2px solid #ea580c', borderBottom: '2px solid #ea580c' }}
              >
                🚩 {festival.name || 'नवरात्र उत्सव २०२६'} 🚩
              </div>
            </div>

            {/* Receipt Number & Date bar */}
            <div
              className="mt-4 flex items-center justify-between text-xs font-bold pb-2"
              style={{ borderBottom: '1px solid #d4d4d8', color: '#27272a' }}
            >
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#7c2d12' }}>पावती क्र:</span>
                <span
                  className="px-2 py-0.5 rounded font-black text-sm"
                  style={{ backgroundColor: '#ffedd5', color: '#431407' }}
                >
                  {receiptNo}
                </span>
                {payment.bookNo && (
                  <span className="text-[11px] ml-1" style={{ color: '#52525b' }}>
                    (वही क्र: {payment.bookNo})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span style={{ color: '#7c2d12' }}>दिनांक:</span>
                <span className="font-semibold" style={{ color: '#18181b' }}>{paymentDate}</span>
              </div>
            </div>

            {/* Donor & Details Body */}
            <div className="mt-3.5 space-y-2.5 text-xs sm:text-sm" style={{ color: '#27272a' }}>
              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap" style={{ color: '#3f3f46' }}>श्री. / मे. :</span>
                <div
                  className="flex-1 font-extrabold text-sm sm:text-base pb-0.5"
                  style={{ borderBottom: '1px dotted #a1a1aa', color: '#09090b' }}
                >
                  {donorName}
                </div>
              </div>

              {mobile && (
                <div className="flex items-baseline gap-2">
                  <span className="font-bold whitespace-nowrap" style={{ color: '#3f3f46' }}>मोबाईल :</span>
                  <div
                    className="flex-1 font-medium pb-0.5 text-xs"
                    style={{ borderBottom: '1px dotted #a1a1aa', color: '#27272a' }}
                  >
                    {mobile}
                  </div>
                </div>
              )}

              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap" style={{ color: '#3f3f46' }}>वर्गणी जमा रक्कम :</span>
                <div
                  className="flex-1 font-black text-base sm:text-lg pb-0.5 flex items-center justify-between"
                  style={{ borderBottom: '1px dotted #a1a1aa', color: '#065f46' }}
                >
                  <span>{formatINR(amount)}</span>
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #6ee7b7' }}
                  >
                    {payment.paymentMethod || 'रोख (Cash)'}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-bold whitespace-nowrap" style={{ color: '#3f3f46' }}>अक्षरी रक्कम :</span>
                <div
                  className="flex-1 font-bold pb-0.5 text-xs sm:text-sm"
                  style={{ borderBottom: '1px dotted #a1a1aa', color: '#18181b' }}
                >
                  {marathiWords}
                </div>
              </div>

              {payment.transactionRef && (
                <div className="flex items-baseline gap-2">
                  <span className="font-bold whitespace-nowrap" style={{ color: '#3f3f46' }}>व्यवहार संदर्भ (Ref) :</span>
                  <div
                    className="flex-1 font-medium pb-0.5 text-xs font-mono"
                    style={{ borderBottom: '1px dotted #a1a1aa', color: '#27272a' }}
                  >
                    {payment.transactionRef}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Signatures & QR */}
            <div
              className="mt-6 pt-3 flex items-end justify-between text-xs"
              style={{ borderTop: '1px solid #d4d4d8' }}
            >
              <div className="text-center">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center p-1"
                  style={{ border: '1px solid #d4d4d8', backgroundColor: '#fafafa' }}
                >
                  <svg className="w-14 h-14" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#fff" />
                    <rect x="10" y="10" width="30" height="30" fill="#000" />
                    <rect x="15" y="15" width="20" height="20" fill="#fff" />
                    <rect x="20" y="20" width="10" height="10" fill="#000" />
                    <rect x="60" y="10" width="30" height="30" fill="#000" />
                    <rect x="65" y="15" width="20" height="20" fill="#fff" />
                    <rect x="70" y="20" width="10" height="10" fill="#000" />
                    <rect x="10" y="60" width="30" height="30" fill="#000" />
                    <rect x="15" y="65" width="20" height="20" fill="#fff" />
                    <rect x="20" y="70" width="10" height="10" fill="#000" />
                    <rect x="50" y="50" width="15" height="15" fill="#000" />
                    <rect x="70" y="70" width="20" height="20" fill="#000" />
                  </svg>
                </div>
                <span className="text-[9.5px] block mt-0.5" style={{ color: '#71717a' }}>स्कॅन व पडताळणी</span>
              </div>

              <div className="text-center">
                <p className="text-[11px] font-bold mb-6" style={{ color: '#52525b' }}>
                  {payment.collectedBy || 'Gururaj'}
                </p>
                <div
                  className="w-24 pt-0.5 font-bold text-[11px]"
                  style={{ borderTop: '1px solid #3f3f46', color: '#27272a' }}
                >
                  पावती देणारा
                </div>
              </div>

              <div className="text-center">
                <div className="h-6" />
                <div
                  className="w-24 pt-0.5 font-bold text-[11px]"
                  style={{ borderTop: '1px solid #3f3f46', color: '#27272a' }}
                >
                  खजिनदार / अध्यक्ष
                </div>
              </div>
            </div>

            <div
              className="mt-3 text-center text-[10.5px] font-semibold pt-1.5"
              style={{ color: '#7c2d12', borderTop: '1px solid #ffedd5' }}
            >
              🙏 मंडळास सहकार्य केल्याबद्दल धन्यवाद! आपले सहकार्य हेच आमचे बळ! 🙏
            </div>
          </div>

          {/* Reversal / Admin Correction Section (Traceable audit log - Admin/Treasurer only) */}
          <div className="mt-4 pt-3 border-t border-[#232731] no-print">
            {(user?.role === 'Admin' || user?.role === 'Treasurer') ? (
              !showReversalPrompt ? (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 flex items-center gap-1">
                    <ShieldCheck size={14} className="text-[#2DD4BF]" />
                    नोंद सुरक्षित आणि अंकेक्षित आहे
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReversalPrompt(true)}
                    className="text-red-400 hover:text-red-300 font-medium hover:underline text-[11.5px]"
                  >
                    पावती रद्द / दुरुस्ती (Reverse)
                  </button>
                </div>
              ) : (
                <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-3 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-red-300 font-bold">
                    <AlertOctagon size={16} />
                    <span>पावती दुरुस्ती / उलट करणे (Payment Reversal)</span>
                  </div>
                  <p className="text-zinc-400 text-[11.5px]">
                    टीप: ही पावती पूर्णपणे डिलीट न होता ऑडिट ट्रेलमध्ये राहील आणि लेजरमधून वजा केली जाईल.
                  </p>
                  <input
                    type="text"
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    placeholder="रद्द करण्याचे कारण (उदा. चुकीची रक्कम नोंदवली)"
                    className="w-full bg-[#181a1f] border border-[#373b47] rounded-xl px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-red-500"
                  />
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReversalPrompt(false)}
                      className="px-3 py-1 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white"
                    >
                      रद्द करा
                    </button>
                    <button
                      type="button"
                      disabled={reversing}
                      onClick={handleReversePayment}
                      className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
                    >
                      {reversing ? 'दुरुस्त करत आहे...' : 'खात्री आहे, उलट करा'}
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <ShieldCheck size={14} className="text-[#2DD4BF]" />
                <span>नोंद सुरक्षित आहे (पावती रद्द/दुरुस्तीचे अधिकार केवळ ॲडमिन/खजिनदारांकडे आहेत)</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-3 border-t border-[#22252e] bg-[#101115] flex gap-2 no-print">
          <button
            onClick={handleShareWhatsApp}
            disabled={downloading}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] font-bold text-zinc-950 flex items-center justify-center gap-2 text-xs transition disabled:opacity-50"
          >
            <Share2 size={16} />
            <span>{downloading ? 'PDF तयार होत आहे...' : 'WhatsApp वर PDF पावती पाठवा'}</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex-1 py-2.5 px-3 rounded-2xl bg-[#FF5A1F] hover:bg-[#E04C00] font-bold text-white flex items-center justify-center gap-2 text-xs transition disabled:opacity-50"
          >
            <Download size={16} />
            <span>{downloading ? 'डाऊनलोड होत आहे...' : 'PDF डाऊनलोड करा'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

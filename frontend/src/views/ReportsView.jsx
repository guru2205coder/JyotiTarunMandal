import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../utils/api';
import { formatINR } from '../utils/marathiWords';
import {
  BarChart3,
  Download,
  Calendar,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  Printer,
  FileText,
  Share2,
  Users,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageSquare,
  BookOpen,
  Layers,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import jsPDF from 'jspdf';

import html2canvas from 'html2canvas';
import { exportBookWiseExcel, exportBookWiseCSV } from '../utils/excelExport';

export const ReportsView = () => {
  const {
    activeFestival,
    showToast,
    language,
    openNewPayment,
    openReceipt,
    user,
    reportSubTab: ctxReportSubTab,
    setReportSubTab: ctxSetReportSubTab,
    selectedReportBook,
    setSelectedReportBook,
  } = useApp();

  const canExportReports = user?.role === 'Admin' || user?.role === 'Treasurer';

  const reportSubTab = ctxReportSubTab || 'overview';
  const setReportSubTab = ctxSetReportSubTab || (() => {});

  const [selectedBook, setSelectedBook] = useState(selectedReportBook || 'all');
  const [summary, setSummary] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [expenseData, setExpenseData] = useState(null);
  const [donorLedger, setDonorLedger] = useState([]);
  const [bookWiseSummary, setBookWiseSummary] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [pendingSearch, setPendingSearch] = useState('');
  const [collapsedBooks, setCollapsedBooks] = useState({});
  const [downloadingSheet, setDownloadingSheet] = useState(false);
  const [bookReportSearch, setBookReportSearch] = useState('');

  const balanceSheetRef = useRef();
  const bookReportRef = useRef();

  useEffect(() => {
    if (selectedReportBook) {
      setSelectedBook(selectedReportBook);
    }
  }, [selectedReportBook]);

  const handleSelectBook = (bNo) => {
    setSelectedBook(bNo);
    if (setSelectedReportBook) setSelectedReportBook(bNo);
  };

  const toggleCollapseBook = (bookNo) => {
    setCollapsedBooks((prev) => ({
      ...prev,
      [bookNo]: !prev[bookNo],
    }));
  };

  const loadReports = (showSpinner = true) => {
    if (!activeFestival) return;
    if (showSpinner) setLoading(true);

    let query = `?festivalId=${activeFestival._id}`;
    if (startDate) query += `&startDate=${startDate}`;
    if (endDate) query += `&endDate=${endDate}`;

    Promise.all([
      api.get(`/reports/financial-summary${query}`),
      api.get(`/reports/daily?festivalId=${activeFestival._id}`),
      api.get(`/reports/expenses-summary?festivalId=${activeFestival._id}`),
      api.get(`/reports/donor-wise?festivalId=${activeFestival._id}`),
      api.get(`/reports/book-wise-summary?festivalId=${activeFestival._id}`),
      api.get(`/reports/pending-vargani?festivalId=${activeFestival._id}`),
    ])
      .then(([sum, daily, exp, donors, bookSum, pending]) => {
        setSummary(sum);
        setDailyData(daily);
        setExpenseData(exp);
        setDonorLedger(donors);
        setBookWiseSummary(bookSum);
        setPendingData(pending);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports(true);
  }, [activeFestival, startDate, endDate]);

  // Export to CSV / Excel (Filtered by selected book if chosen - Admin & Treasurer only)
  const handleExportCSV = async () => {
    if (!canExportReports) {
      showToast('अहवाल डाऊनलोड करण्याचे अधिकार केवळ ॲडमिन व खजिनदारांसाठी आहेत', 'error');
      return;
    }
    try {
      let data = donorLedger;
      if (selectedBook !== 'all') {
        const bookData = await api.get(
          `/reports/donor-wise?festivalId=${activeFestival._id}&bookNo=${encodeURIComponent(selectedBook)}`
        );
        if (bookData && Array.isArray(bookData) && bookData.length > 0) {
          data = bookData;
        } else if (donorLedger && Array.isArray(donorLedger)) {
          data = donorLedger.filter((d) => (d.bookNo || '').trim() === selectedBook.trim());
        }
      }

      if (!data || data.length === 0) {
        showToast('कोणताही डेटा उपलब्ध नाही', 'error');
        return;
      }

      const headers = [
        'Sr No',
        'Donor Name',
        'Mobile',
        'Book No',
        'Receipt No',
        'Promised Amount',
        'Total Paid',
        'Remaining',
        'Status',
        'Installment Count',
      ];
      const rows = data.map((d, index) => [
        index + 1,
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${(d.mobile || '').replace(/"/g, '""')}"`,
        `"${(d.bookNo || (selectedBook !== 'all' ? selectedBook : '')).replace(/"/g, '""')}"`,
        `"${(d.physicalReceiptNo || '').replace(/"/g, '""')}"`,
        d.promisedAmount || 0,
        d.totalPaid || 0,
        d.remaining || 0,
        `"${(d.status || '').replace(/"/g, '""')}"`,
        d.installmentCount || 0,
      ]);

      // Prepend UTF-8 BOM so Excel on Windows properly displays Marathi/Devanagari Unicode
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileLabel = selectedBook !== 'all' ? selectedBook.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All_Books';
      link.setAttribute('download', `Vargani_Donors_${fileLabel}_${activeFestival?.year || 2026}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`देणगीदार तपशील (${selectedBook !== 'all' ? selectedBook : 'सर्व वह्या'}) Excel डाऊनलोड झाली!`);
    } catch (err) {
      showToast('CSV डाऊनलोड करताना त्रुटी आली', 'error');
    }
  };

  // Download Balance Sheet as PDF (Admin & Treasurer only)
  const handleDownloadBalanceSheetPDF = async () => {
    if (!canExportReports) {
      showToast('ताळेबंद PDF डाऊनलोड करण्याचे अधिकार केवळ ॲडमिन व खजिनदारांसाठी आहेत', 'error');
      return;
    }
    if (!balanceSheetRef.current) return;
    setDownloadingSheet(true);
    try {
      const element = balanceSheetRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Jama_Kharch_Taleband_${activeFestival?.year || 2026}.pdf`);
      showToast('ताळेबंद PDF डाऊनलोड झाली!');
    } catch (err) {
      console.error(err);
      showToast('PDF तयार करताना त्रुटी आली', 'error');
    } finally {
      setDownloadingSheet(false);
    }
  };

  // Share Balance Sheet on WhatsApp (Pure financial details without book section)
  const handleShareBalanceSheetWhatsApp = () => {
    const totalInc = (summary?.openingBalance || 0) + (summary?.totalVargani || 0);
    const totalExp = summary?.totalExpenses || 0;
    const balance = summary?.currentBalance || 0;

    let expenseLines = '';
    if (expenseData?.categoryBreakdown) {
      expenseLines = expenseData.categoryBreakdown
        .map((c) => `  • ${c.category}: ₹${c.total.toLocaleString('en-IN')}`)
        .join('\n');
    }

    const text = `🚩 *${activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर'}*\n📍 ${activeFestival?.mandalAddress || 'इंदिरा नगर, सोलापूर'}\n📜 *अधिकृत वार्षिक जमा-खर्च ताळेबंद - ${activeFestival?.name || 'नवरात्र उत्सव २०२६'}*\n\n📥 *एकूण जमा (Income):*\n  • मागील वर्षाची शिल्लक: ₹${(summary?.openingBalance || 0).toLocaleString('en-IN')}\n  • वर्गणी संकलन: ₹${(summary?.totalVargani || 0).toLocaleString('en-IN')} (${summary?.receiptCount || 0} पावत्या)\n  *👉 एकूण जमा रक्कम: ₹${totalInc.toLocaleString('en-IN')}*\n\n📤 *एकूण खर्च (Expenses):*\n${expenseLines || '  • तपशील लेजरमध्ये नोंदवला आहे'}\n  *👉 एकूण खर्च रक्कम: ₹${totalExp.toLocaleString('en-IN')}*\n\n═══════════════════\n💰 *अंतिम शिल्लक रक्कम: ₹${balance.toLocaleString('en-IN')}*\n═══════════════════\n\n🙏 *मंडळाच्या सर्व देणगीदारांचे, कार्यकर्त्यांचे व नागरिकांचे मनःपूर्वक आभार!*`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendReminder = (donor) => {
    const promised = donor.promisedAmount || 0;
    const paid = donor.totalPaid || 0;
    const remaining = donor.remaining !== undefined ? donor.remaining : Math.max(0, promised - paid);

    const text = `🚩 *${activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर'}*\n*${activeFestival?.name || 'नवरात्र उत्सव २०२६'}*\n\nसस्नेह नमस्कार, *${donor.name}* जी.\nमंडळाच्या उत्सवासाठी आपली ठरलेली वर्गणी रक्कम ₹${promised.toLocaleString('en-IN')} असून, यापूर्वी ₹${paid.toLocaleString('en-IN')} जमा झालेली आहे.\nअद्याप *₹${remaining.toLocaleString('en-IN')}* वर्गणी शिल्लक आहे.\n\nकृपया मंडळाच्या कार्यकर्त्यांकडे उर्वरित वर्गणी जमा करून डिजिटल पावती प्राप्त करून घ्यावी ही नम्र विनंती.\n\n🙏 मंडळास सहकार्य केल्याबद्दल धन्यवाद!`;

    const encoded = encodeURIComponent(text);
    const url = donor.mobile
      ? `https://api.whatsapp.com/send?phone=91${donor.mobile.replace(/\D/g, '')}&text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
  };

  const normalizeBook = (b) => (b || '').replace(/[^0-9]/g, '') || (b || '').trim().toLowerCase();

  const getBookDisplayTitle = (bNo) => {
    if (!bNo || bNo === 'all') return 'सर्व वह्या वर्गणी अहवाल';
    const num = (bNo || '').replace(/[^0-9]/g, '');
    return num ? `बूक न. ${num} वर्गणी` : `बूक ${bNo} वर्गणी`;
  };

  // Filter donors for the active book report
  const bookDonorsList = React.useMemo(() => {
    let list = donorLedger;
    if (selectedBook !== 'all') {
      const targetNorm = normalizeBook(selectedBook);
      list = list.filter((d) => {
        const dNorm = normalizeBook(d.bookNo);
        return dNorm === targetNorm || (d.bookNo || '').trim().toLowerCase() === selectedBook.trim().toLowerCase();
      });
    }
    if (bookReportSearch.trim()) {
      const q = bookReportSearch.toLowerCase().trim();
      list = list.filter((d) => {
        const matchName = d.name && d.name.toLowerCase().includes(q);
        const matchBusiness = d.businessName && d.businessName.toLowerCase().includes(q);
        const matchMobile = d.mobile && d.mobile.includes(q);
        return matchName || matchBusiness || matchMobile;
      });
    }
    return list;
  }, [donorLedger, selectedBook, bookReportSearch]);

  const bookReportTotals = React.useMemo(() => {
    let promised = 0;
    let paid = 0;
    let remaining = 0;

    bookDonorsList.forEach((d) => {
      const p = Number(d.promisedAmount || d.totalPaid || 0);
      const pd = Number(d.totalPaid || 0);
      const rem = Math.max(0, p - pd);
      promised += p;
      paid += pd;
      remaining += rem;
    });

    const percent = promised > 0 ? Math.min(100, Math.round((paid / promised) * 100)) : 100;
    return { promised, paid, remaining, percent, count: bookDonorsList.length };
  }, [bookDonorsList]);

  const handleExportBookExcelAction = () => {
    if (!canExportReports) {
      showToast('अहवाल डाऊनलोड करण्याचे अधिकार केवळ ॲडमिन व खजिनदारांसाठी आहेत', 'error');
      return;
    }
    if (!bookDonorsList || bookDonorsList.length === 0) {
      showToast('कोणताही डेटा उपलब्ध नाही', 'error');
      return;
    }
    exportBookWiseExcel({
      mandalName: activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
      bookNo: selectedBook,
      donors: bookDonorsList,
      festivalYear: activeFestival?.year || 2026,
    });
    showToast(`बूक अहवाल Excel (.xlsx) डाऊनलोड झाली!`);
  };

  const handleExportBookCSVAction = () => {
    if (!canExportReports) {
      showToast('अहवाल डाऊनलोड करण्याचे अधिकार केवळ ॲडमिन व खजिनदारांसाठी आहेत', 'error');
      return;
    }
    if (!bookDonorsList || bookDonorsList.length === 0) {
      showToast('कोणताही डेटा उपलब्ध नाही', 'error');
      return;
    }
    exportBookWiseCSV({
      mandalName: activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
      bookNo: selectedBook,
      donors: bookDonorsList,
      festivalYear: activeFestival?.year || 2026,
    });
    showToast(`बूक अहवाल CSV डाऊनलोड झाली!`);
  };

  const handleDownloadBookReportPDF = async () => {
    if (!bookReportRef.current) return;
    setDownloadingSheet(true);
    try {
      const element = bookReportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printWidth = pageWidth - (margin * 2);
      const printHeight = (canvas.height * printWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      if (printHeight <= pageHeight - (margin * 2)) {
        pdf.addImage(imgData, 'PNG', margin, margin, printWidth, printHeight);
      } else {
        const pagePrintableHeight = pageHeight - (margin * 2);
        let heightLeft = printHeight;
        let position = margin;

        pdf.addImage(imgData, 'PNG', margin, position, printWidth, printHeight);
        heightLeft -= pagePrintableHeight;

        while (heightLeft > 0) {
          position = margin - (printHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', margin, position, printWidth, printHeight);
          heightLeft -= pagePrintableHeight;
        }
      }

      const numericBook = (selectedBook || '').replace(/[^0-9]/g, '');
      const safeLabel = selectedBook === 'all' ? 'All_Books' : `Book_${numericBook || selectedBook}`;
      pdf.save(`Jyoti_Mandal_${safeLabel}_Report_${activeFestival?.year || 2026}.pdf`);
      showToast('बूक अहवाल PDF डाऊनलोड झाली!');
    } catch (err) {
      console.error(err);
      showToast('PDF तयार करताना त्रुटी आली', 'error');
    } finally {
      setDownloadingSheet(false);
    }
  };

  const handleShareBookReportWhatsApp = () => {
    const numericBook = (selectedBook || '').replace(/[^0-9]/g, '');
    const cleanBookLabel = selectedBook === 'all' ? 'सर्व वह्या एकत्र' : (numericBook ? `बूक न. ${numericBook}` : `बूक ${selectedBook}`);
    const title = activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर';

    let lines = '';
    const sample = bookDonorsList.slice(0, 35);
    sample.forEach((d, idx) => {
      const promised = Number(d.promisedAmount || d.totalPaid || 0);
      const paid = Number(d.totalPaid || 0);
      const remaining = Math.max(0, promised - paid);
      const statusIcon = remaining === 0 ? '✅ जमा' : (paid > 0 ? '⚠️ अपूर्ण' : '❌ बाकी');
      lines += `${idx + 1}. ${d.name}: ठरलेली ₹${promised.toLocaleString('en-IN')} | जमा ₹${paid.toLocaleString('en-IN')} | येणे ₹${remaining.toLocaleString('en-IN')} [${statusIcon}]\n`;
    });

    const text = `🚩 *${title}*\n📖 *${cleanBookLabel} वर्गणी अहवाल*\n\n📊 *एकूण सारांश:*\n• एकूण देणगीदार: ${bookDonorsList.length}\n• ठरलेली वर्गणी: ₹${bookReportTotals.promised.toLocaleString('en-IN')}\n• एकूण जमा: ₹${bookReportTotals.paid.toLocaleString('en-IN')}\n• एकूण येणे (बाकी): ₹${bookReportTotals.remaining.toLocaleString('en-IN')}\n• वसुली: ${bookReportTotals.percent}%\n\n📋 *देणगीदार यादी:*\n${lines}${bookDonorsList.length > 35 ? `\n...आणि इतर ${bookDonorsList.length - 35} देणगीदार` : ''}\n\n🙏 मंडळास सहकार्य केल्याबद्दल धन्यवाद!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // In-memory active book calculations for instant 0ms category switching
  const activeBookSummary = React.useMemo(() => {
    if (selectedBook === 'all') {
      return {
        totalPromised: summary?.totalPromised || bookWiseSummary?.combined?.totalPromised || 0,
        totalCollected: summary?.totalVargani || bookWiseSummary?.combined?.totalCollected || 0,
        totalRemaining: summary?.totalRemaining || bookWiseSummary?.combined?.totalRemaining || 0,
      };
    }
    const b = bookWiseSummary?.books?.find(
      (item) => item.bookNo.toLowerCase() === selectedBook.trim().toLowerCase()
    );
    if (b) {
      return {
        totalPromised: b.totalPromised,
        totalCollected: b.totalCollected,
        totalRemaining: b.totalRemaining,
      };
    }
    return { totalPromised: 0, totalCollected: 0, totalRemaining: 0 };
  }, [selectedBook, summary, bookWiseSummary]);

  const totalIncome = selectedBook === 'all'
    ? (summary?.totalVargani || 0)
    : activeBookSummary.totalCollected;
  const totalExp = summary?.totalExpenses || 0;
  const totalFlow = totalIncome + totalExp || 1;
  const incomePercent = Math.round((totalIncome / totalFlow) * 100);
  const expensePercent = Math.round((totalExp / totalFlow) * 100);

  // Filtered donor ledger (respects selectedBook, filter, and search instantly in-memory)
  const filteredDonors = React.useMemo(() => {
    return donorLedger.filter((d) => {
      if (selectedBook !== 'all' && (d.bookNo || '').toLowerCase() !== selectedBook.trim().toLowerCase()) {
        return false;
      }
      if (ledgerFilter !== 'all' && d.status !== ledgerFilter) return false;
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase().trim();
        const matchName = d.name && d.name.toLowerCase().includes(q);
        const matchBook = d.bookNo && d.bookNo.toLowerCase().includes(q);
        const matchMobile = d.mobile && d.mobile.includes(q);
        return matchName || matchBook || matchMobile;
      }
      return true;
    });
  }, [donorLedger, selectedBook, ledgerFilter, ledgerSearch]);

  // Compute pending metrics for active selection
  const selectedPendingBookObj = selectedBook === 'all'
    ? null
    : (pendingData?.books?.find((b) => b.bookNo.toLowerCase() === selectedBook.trim().toLowerCase()) || null);

  const currentPendingAmount = selectedBook === 'all'
    ? (pendingData?.overall?.totalPendingAmount || 0)
    : (selectedPendingBookObj?.totalPendingAmount || 0);

  const currentPromisedAmount = selectedBook === 'all'
    ? (pendingData?.overall?.totalPromised || 0)
    : (selectedPendingBookObj?.totalPromised || 0);

  const currentPaidAmount = selectedBook === 'all'
    ? (pendingData?.overall?.totalPaid || 0)
    : (selectedPendingBookObj?.totalPaid || 0);

  const currentPendingCount = selectedBook === 'all'
    ? (pendingData?.overall?.count || 0)
    : (selectedPendingBookObj?.pendingCount || 0);

  const currentPercent = currentPromisedAmount > 0
    ? Math.min(100, Math.round((currentPaidAmount / currentPromisedAmount) * 100))
    : 0;

  // Filter books and donors based on selectedBook and pendingSearch
  const displayedPendingBooks = React.useMemo(() => {
    if (!pendingData?.books) return [];
    let sourceBooks = pendingData.books;
    if (selectedBook !== 'all') {
      sourceBooks = sourceBooks.filter((b) => b.bookNo.toLowerCase() === selectedBook.trim().toLowerCase());
    }

    if (!pendingSearch.trim()) return sourceBooks;

    const s = pendingSearch.trim().toLowerCase();
    return sourceBooks
      .map((b) => {
        const filteredDonors = b.donors.filter(
          (d) =>
            (d.name && d.name.toLowerCase().includes(s)) ||
            (d.mobile && d.mobile.includes(s)) ||
            (d.bookNo && d.bookNo.toLowerCase().includes(s))
        );
        return {
          ...b,
          donors: filteredDonors,
        };
      })
      .filter((b) => b.donors.length > 0);
  }, [pendingData, selectedBook, pendingSearch]);

  const pendingDonorsFiltered = React.useMemo(() => {
    const list = [];
    displayedPendingBooks.forEach((b) => list.push(...b.donors));
    return list;
  }, [displayedPendingBooks]);

  const handleExportPendingCSV = () => {
    if (!canExportReports) {
      showToast('अहवाल डाऊनलोड करण्याचे अधिकार केवळ ॲडमिन व खजिनदारांसाठी आहेत', 'error');
      return;
    }
    try {
      const data = pendingDonorsFiltered;
      if (!data || data.length === 0) {
        showToast('कोणताही बाकी देणगीदार डेटा उपलब्ध नाही', 'error');
        return;
      }

      const headers = [
        'Sr No',
        'Donor Name',
        'Mobile',
        'Book Category',
        'Physical Receipt No',
        'Promised Amount',
        'Total Paid',
        'Remaining / Pending Amount',
        'Status',
      ];
      const rows = data.map((d, index) => [
        index + 1,
        `"${(d.name || '').replace(/"/g, '""')}"`,
        `"${(d.mobile || '').replace(/"/g, '""')}"`,
        `"${(d.bookNo || (selectedBook !== 'all' ? selectedBook : '')).replace(/"/g, '""')}"`,
        `"${(d.physicalReceiptNo || '').replace(/"/g, '""')}"`,
        d.promisedAmount || 0,
        d.totalPaid || 0,
        d.remaining || 0,
        `"${d.status === 'partially_paid' ? 'अपूर्ण (Partially Paid)' : 'बाकी (Pending)'}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileLabel = selectedBook !== 'all' ? selectedBook.replace(/[^a-zA-Z0-9_-]/g, '_') : 'All_Books';
      link.setAttribute('download', `Pending_Donors_${fileLabel}_${activeFestival?.year || 2026}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`बाकी वर्गणीदार यादी (${selectedBook !== 'all' ? selectedBook : 'सर्व वह्या'}) Excel डाऊनलोड झाली!`);
    } catch (err) {
      showToast('CSV डाऊनलोड करताना त्रुटी आली', 'error');
    }
  };

  const handleSharePendingSummaryWhatsApp = () => {
    if (!pendingData) return;
    const books = pendingData.books || [];
    let lines = '';
    books.forEach((b) => {
      lines += `📖 *${b.label}:* ${b.pendingCount} बाकीदार • बाकी: ₹${b.totalPendingAmount.toLocaleString('en-IN')}\n`;
    });

    const text = `🚩 *${activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर'}*\n*${activeFestival?.name || 'नवरात्र उत्सव २०२६'}*\n\n📋 *वहीनिहाय बाकी वर्गणीदार सारांश (Pending Vargani Summary)*\n\n${lines}\n═══════════════════\n💰 *एकूण बाकी वर्गणी: ₹${(pendingData.overall?.totalPendingAmount || 0).toLocaleString('en-IN')}*\n👥 *एकूण थकबाकीदार: ${pendingData.overall?.count || 0}*\n═══════════════════\n\n📌 सर्व कार्यकर्त्यांनी आपापल्या वहीनुसार राहिलेली वर्गणी जमा करावी ही नम्र विनंती!`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-24 pt-1">
      {/* Title & Quick Export */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Reports & Ledger</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {activeFestival?.name} • {selectedBook === 'all' ? 'सर्व वह्या एकत्र' : `वही क्र. ${selectedBook}`}
          </p>
        </div>
        <div className="flex gap-2">
          {canExportReports && (
            <>
              {reportSubTab === 'book' ? (
                <>
                  <button
                    onClick={handleExportBookExcelAction}
                    className="px-3 py-1.5 rounded-xl bg-[#143323] border border-[#1b4e33] text-[#22C55E] text-xs font-bold flex items-center gap-1.5 hover:bg-[#1a442e] transition shadow-sm"
                    title="Excel (.xlsx) डाउनलोड"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={handleExportBookCSVAction}
                    className="px-2.5 py-1.5 rounded-xl bg-[#1c1f26] border border-[#2b2f3a] text-[#2DD4BF] text-xs font-bold flex items-center gap-1 hover:bg-[#252833] transition"
                    title="CSV डाउनलोड"
                  >
                    <span>CSV</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={reportSubTab === 'pending' ? handleExportPendingCSV : handleExportCSV}
                  className="px-3 py-1.5 rounded-xl bg-[#1c1f26] border border-[#2b2f3a] text-[#2DD4BF] text-xs font-bold flex items-center gap-1.5 hover:bg-[#252833] transition"
                  title="Export CSV"
                >
                  <FileSpreadsheet size={15} />
                  <span>Excel (CSV)</span>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl bg-[#1c1f26] border border-[#2b2f3a] text-zinc-300 hover:text-white transition"
            title="Print"
          >
            <Printer size={15} />
          </button>
        </div>
      </div>

      {/* REQUIREMENT: Book Number Scope Selector Bar (All Combined vs Specific Book) */}
      <div className="bg-[#15171d] p-3 rounded-2xl border border-[#252833] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
            <BookOpen size={14} className="text-[#FF5A1F]" />
            <span>अहवाल प्रकार निवडा (Report Scope):</span>
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            {selectedBook === 'all' ? 'सर्व वह्या एकत्र अहवाल (All Combined)' : `वही क्र. ${selectedBook} अहवाल`}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => handleSelectBook('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
              selectedBook === 'all'
                ? 'bg-[#FF5A1F] text-white shadow-md'
                : 'bg-[#1c1f26] border border-[#2c303c] text-zinc-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span>सर्व वह्या एकत्र (Combined)</span>
          </button>

          {bookWiseSummary?.books?.map((b) => {
            const isSelected = selectedBook === b.bookNo;
            const bookPending = pendingData?.books?.find((pb) => pb.bookNo === b.bookNo)?.totalPendingAmount || 0;
            return (
              <button
                key={b.bookNo}
                onClick={() => handleSelectBook(b.bookNo)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#0f2d29] border border-[#2DD4BF] text-[#2DD4BF] shadow-md font-extrabold'
                    : 'bg-[#1c1f26] border border-[#2c303c] text-zinc-300 hover:text-white'
                }`}
              >
                <BookOpen size={13} className={isSelected ? 'text-[#2DD4BF]' : 'text-zinc-500'} />
                <span>{b.label}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${isSelected ? 'bg-[#164e47] text-white' : 'bg-[#252833] text-zinc-400'}`}>
                  {formatINR(b.totalCollected)}
                </span>
                {bookPending > 0 && (
                  <span className="px-1.5 py-0.2 rounded-md text-[9.5px] font-mono font-bold bg-amber-950/70 text-amber-400 border border-amber-800/60" title={`बाकी: ${formatINR(bookPending)}`}>
                    बाकी {formatINR(bookPending)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tabs: Overview | Book Report | Pending Donors | Official Balance Sheet | Donor Ledger */}
      <div className="grid grid-cols-5 bg-[#16171c] p-1 rounded-2xl border border-[#262932] gap-1">
        <button
          onClick={() => setReportSubTab('overview')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            reportSubTab === 'overview'
              ? 'bg-[#FF5A1F] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <BarChart3 size={13} />
          <span className="truncate">वित्तीय सारांश</span>
        </button>
        <button
          onClick={() => setReportSubTab('book')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            reportSubTab === 'book'
              ? 'bg-[#599E39] text-white shadow-md font-black'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="बूकनिहाय वर्गणी अहवाल (Book-wise Report)"
        >
          <FileSpreadsheet size={13} className={reportSubTab === 'book' ? 'text-white' : 'text-[#60993E]'} />
          <span className="truncate">बूक अहवाल</span>
        </button>
        <button
          onClick={() => setReportSubTab('pending')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 relative ${
            reportSubTab === 'pending'
              ? 'bg-[#FF5A1F] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Clock size={13} className={reportSubTab === 'pending' ? 'text-white' : 'text-amber-400'} />
          <span className="truncate">बाकीदार</span>
          {(pendingData?.overall?.count || 0) > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] font-bold ${
              reportSubTab === 'pending' ? 'bg-amber-300 text-zinc-950' : 'bg-amber-950 text-amber-300 border border-amber-700/60'
            }`}>
              {pendingData?.overall?.count}
            </span>
          )}
        </button>
        <button
          onClick={() => setReportSubTab('statement')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            reportSubTab === 'statement'
              ? 'bg-[#FF5A1F] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <FileText size={13} />
          <span className="truncate">ताळेबंद</span>
        </button>
        <button
          onClick={() => setReportSubTab('ledger')}
          className={`py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
            reportSubTab === 'ledger'
              ? 'bg-[#FF5A1F] text-white shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users size={13} />
          <span className="truncate">लेजर ({donorLedger.length})</span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL OVERVIEW */}
      {reportSubTab === 'overview' && (
        <div className="space-y-4">
          {/* Date Filter Bar */}
          <div className="bg-[#16171c] p-3 rounded-2xl border border-[#252832] flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-400 font-semibold flex items-center gap-1">
              <Calendar size={13} className="text-[#FF5A1F]" />
              कालावधी:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#1c1f26] border border-[#2e3340] rounded-xl px-2.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-[#FF5A1F]"
            />
            <span className="text-zinc-500">ते</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#1c1f26] border border-[#2e3340] rounded-xl px-2.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-[#FF5A1F]"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-zinc-400 hover:text-white underline ml-auto"
              >
                रिसेट करा
              </button>
            )}
          </div>

          {/* Main Financial Balance Card */}
          <div className="rounded-[28px] bg-gradient-to-br from-[#16181f] to-[#0f1014] border border-[#282c38] p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  {selectedBook === 'all'
                    ? 'अंतिम उपलब्ध शिल्लक (Available Balance - All Combined)'
                    : `वही क्र. ${selectedBook} जमा वर्गणी (Total Collected)`}
                </span>
                <div className="text-3xl sm:text-4xl font-black text-[#FEEA85] tracking-tight mt-1">
                  {selectedBook === 'all'
                    ? formatINR(summary?.currentBalance || 0)
                    : formatINR(totalIncome)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                  {selectedBook === 'all'
                    ? `Current Balance = Opening (${formatINR(summary?.openingBalance || 0)}) + Income (${formatINR(totalIncome)}) − Expenses (${formatINR(totalExp)})`
                    : `ठरलेली: ${formatINR(summary?.totalPromised || 0)} • जमा: ${formatINR(totalIncome)} • बाकी: ${formatINR(summary?.totalRemaining || 0)}`}
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#1d222e] text-[#2DD4BF] border border-[#2e3547]">
                {selectedBook === 'all' ? 'सर्व वह्या एकत्र' : `वही: ${selectedBook}`}
              </span>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#232733] text-center">
              <div className="bg-[#121318] p-2.5 rounded-xl border border-[#1f222c]">
                <span className="text-[10.5px] text-zinc-400 block font-medium">
                  {selectedBook === 'all' ? 'मागील शिल्लक' : 'ठरलेली वर्गणी'}
                </span>
                <span className="text-sm font-bold text-teal-300">
                  {selectedBook === 'all' ? formatINR(summary?.openingBalance || 0) : formatINR(summary?.totalPromised || 0)}
                </span>
              </div>
              <div className="bg-[#121318] p-2.5 rounded-xl border border-[#1f222c]">
                <span className="text-[10.5px] text-zinc-400 block font-medium">एकूण जमा (Collected)</span>
                <span className="text-sm font-bold text-[#22C55E]">
                  {formatINR(totalIncome)}
                </span>
              </div>
              <div className="bg-[#121318] p-2.5 rounded-xl border border-[#1f222c]">
                <span className="text-[10.5px] text-zinc-400 block font-medium">
                  {selectedBook === 'all' ? 'एकूण खर्च' : 'शिल्लक बाकी'}
                </span>
                <span className="text-sm font-bold text-red-400">
                  {selectedBook === 'all' ? formatINR(totalExp) : formatINR(summary?.totalRemaining || 0)}
                </span>
              </div>
            </div>

            {/* Visual Income vs Expense Bar */}
            {selectedBook === 'all' && (
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[#22C55E] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                    जमा (Income): {incomePercent}%
                  </span>
                  <span className="text-red-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    खर्च (Expense): {expensePercent}%
                  </span>
                </div>
                <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${incomePercent}%` }}
                    className="bg-emerald-500 h-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${expensePercent}%` }}
                    className="bg-red-500 h-full transition-all duration-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* REQUIREMENT: Book-wise Performance Breakdown Report Table/Cards */}
          {bookWiseSummary?.books && bookWiseSummary.books.length > 0 && (
            <div className="rounded-[24px] bg-[#16171c] border border-[#252832] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={14} className="text-[#FF5A1F]" />
                  <span>वहीनिहाय संकलन कामगिरी अहवाल (Book-wise Report)</span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {bookWiseSummary.books.length} वह्या
                </span>
              </div>

              <div className="space-y-2">
                {bookWiseSummary.books.map((b) => {
                  const isCur = selectedBook === b.bookNo;
                  return (
                    <div
                      key={b.bookNo}
                      className={`p-3 rounded-2xl border transition ${
                        isCur
                          ? 'bg-[#182622] border-[#2DD4BF]/50'
                          : 'bg-[#121316] border-[#222530] hover:border-[#343a4a]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-[#202430] text-[#2DD4BF] text-xs font-bold flex items-center justify-center">
                            <BookOpen size={13} />
                          </span>
                          <div>
                            <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                              <span>{b.label}</span>
                              <span className="text-[10.5px] text-zinc-400 font-normal">
                                ({b.donorCount} देणगीदार • {b.receiptCount} पावत्या)
                              </span>
                            </h4>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            handleSelectBook(b.bookNo);
                            setReportSubTab('book');
                          }}
                          className="px-2.5 py-1 rounded-xl bg-[#143323] hover:bg-[#1a442e] border border-[#1b4e33] text-[#22C55E] text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <span>बूक अहवाल पहा</span>
                          <ArrowRight size={11} />
                        </button>
                      </div>

                      {/* Financial amounts of this book */}
                      <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-[#1f222c] text-xs text-center">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">ठरलेली</span>
                          <span className="font-bold text-zinc-200">{formatINR(b.totalPromised)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">एकूण जमा</span>
                          <span className="font-bold text-emerald-400">{formatINR(b.totalCollected)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-zinc-500 block">शिल्लक</span>
                          <span className="font-bold text-amber-400">{formatINR(b.totalRemaining)}</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2 flex items-center gap-2 text-[10.5px] text-zinc-400">
                        <div className="h-1.5 flex-1 bg-[#1e222d] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${b.percentCollected}%` }}
                            className="h-full bg-emerald-500 rounded-full"
                          />
                        </div>
                        <span className="font-mono text-[10px] font-bold text-emerald-400">{b.percentCollected}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combined Total Summary Row */}
              <div className="bg-[#1a2130] border border-[#2b354c] rounded-2xl p-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-black text-white block">सर्व वह्या एकूण एकत्रित (All Combined):</span>
                  <span className="text-[11px] text-zinc-400">
                    {bookWiseSummary.combined?.totalDonors} देणगीदार • {bookWiseSummary.combined?.totalReceipts} पावत्या
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-emerald-400 block">
                    जमा: {formatINR(bookWiseSummary.combined?.totalCollected || 0)}
                  </span>
                  <span className="text-[11px] text-amber-300 font-bold">
                    बाकी: {formatINR(bookWiseSummary.combined?.totalRemaining || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Expense Category Breakdown Chart */}
          {expenseData?.categoryBreakdown && expenseData.categoryBreakdown.length > 0 && (
            <div className="rounded-[24px] bg-[#16171c] border border-[#252832] p-4 space-y-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                खर्च विभागवार वर्गीकरण (Expense by Category)
              </h3>
              <div className="space-y-2">
                {expenseData.categoryBreakdown.map((cat) => {
                  const catPercent = totalExp > 0 ? Math.round((cat.total / totalExp) * 100) : 0;
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-300">{cat.category}</span>
                        <span className="font-mono text-zinc-400">
                          {formatINR(cat.total)} ({catPercent}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-[#20222a] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${catPercent}%` }}
                          className="bg-[#FF5A1F] h-full rounded-full transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Daily Collection Table */}
          {dailyData && dailyData.length > 0 && (
            <div className="rounded-[24px] bg-[#16171c] border border-[#252832] p-4 space-y-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                दैनिक वर्गणी संकलन (Daily Collection)
              </h3>
              <div className="divide-y divide-[#22252f] overflow-hidden text-xs">
                {dailyData.map((d) => (
                  <div key={d.date} className="py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-zinc-300">{d.date}</span>
                    <span className="text-zinc-400">{d.count} पावत्या</span>
                    <span className="font-bold text-emerald-400">{formatINR(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: BOOK-WISE REPORT (बूकनिहाय वर्गणी अहवाल - EXACT FORMAT AS REQUESTED) */}
      {reportSubTab === 'book' && (
        <div className="space-y-4">
          {/* Action Toolbar & Book Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#16181d] border border-[#262932] rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#143323] text-[#22C55E] flex items-center justify-center border border-[#1b4e33]">
                <FileSpreadsheet size={16} />
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-100 flex items-center gap-1.5">
                  <span>{getBookDisplayTitle(selectedBook)}</span>
                  <span className="text-[11px] text-zinc-400 font-normal">
                    ({bookDonorsList.length} देणगीदार)
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  ठरलेली: {formatINR(bookReportTotals.promised)} • जमा: <span className="text-emerald-400 font-semibold">{formatINR(bookReportTotals.paid)}</span> • बाकी: <span className="text-amber-400 font-semibold">{formatINR(bookReportTotals.remaining)}</span>
                </p>
              </div>
            </div>

            {/* Export & Share Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {canExportReports && (
                <>
                  <button
                    onClick={handleExportBookExcelAction}
                    className="px-3 py-1.5 rounded-xl bg-[#599E39] hover:bg-[#4d8b31] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md"
                    title="Excel (.xlsx) फाईल डाऊनलोड करा"
                  >
                    <FileSpreadsheet size={14} />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={handleExportBookCSVAction}
                    className="px-2.5 py-1.5 rounded-xl bg-[#1c1f26] hover:bg-[#252833] border border-[#2b2f3a] text-[#2DD4BF] text-xs font-bold flex items-center gap-1 transition"
                    title="CSV फाईल डाऊनलोड करा"
                  >
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={handleDownloadBookReportPDF}
                    disabled={downloadingSheet}
                    className="px-2.5 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04C00] text-white text-xs font-bold flex items-center gap-1 transition disabled:opacity-50"
                    title="PDF डाऊनलोड करा"
                  >
                    <Download size={14} />
                    <span>{downloadingSheet ? '...' : 'PDF'}</span>
                  </button>
                </>
              )}
              <button
                onClick={handleShareBookReportWhatsApp}
                className="px-2.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-zinc-950 text-xs font-bold flex items-center gap-1 transition"
                title="WhatsApp वर अहवाल शेअर करा"
              >
                <Share2 size={13} />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button
                onClick={() => window.print()}
                className="p-1.5 rounded-xl bg-[#20222a] text-zinc-300 hover:text-white transition"
                title="Print करा"
              >
                <Printer size={15} />
              </button>
            </div>
          </div>

          {/* Quick Book Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => handleSelectBook('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedBook === 'all'
                  ? 'bg-[#599E39] text-white shadow-md'
                  : 'bg-[#181a20] border border-[#262933] text-zinc-400 hover:text-white'
              }`}
            >
              <Layers size={13} />
              <span>सर्व बूक एकत्र</span>
            </button>
            {(bookWiseSummary?.books && bookWiseSummary.books.length > 0
              ? bookWiseSummary.books
              : [{ bookNo: '1', label: 'बूक न. 1' }, { bookNo: '2', label: 'बूक न. 2' }]
            ).map((b) => {
              const num = b.bookNo.replace(/[^0-9]/g, '') || b.bookNo;
              const isSel = selectedBook === b.bookNo || (selectedBook !== 'all' && normalizeBook(selectedBook) === normalizeBook(b.bookNo));
              return (
                <button
                  key={b.bookNo}
                  onClick={() => handleSelectBook(b.bookNo)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-[#599E39] text-white shadow-md font-extrabold ring-1 ring-white/30'
                      : 'bg-[#181a20] border border-[#262933] text-zinc-300 hover:text-white'
                  }`}
                >
                  <BookOpen size={13} className={isSel ? 'text-white' : 'text-[#599E39]'} />
                  <span>बूक न. {num}</span>
                  {b.totalCollected !== undefined && (
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${isSel ? 'bg-black/20 text-white' : 'bg-[#222632] text-zinc-400'}`}>
                      {formatINR(b.totalCollected)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Real-time Search Box within this Book */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              value={bookReportSearch}
              onChange={(e) => setBookReportSearch(e.target.value)}
              placeholder="या बूक मधील देणगीदाराचे नाव किंवा मोबाईल शोधा..."
              className="w-full bg-[#181a1f] border border-[#272b36] rounded-2xl pl-10 pr-10 py-2.5 text-zinc-100 text-xs sm:text-sm focus:outline-none focus:border-[#599E39]"
            />
            {bookReportSearch && (
              <button
                onClick={() => setBookReportSearch('')}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* EXACT FORMAT FROM USER SCREENSHOT: EXCEL SPREADSHEET CARD */}
          <div
            id="printable-book-report"
            ref={bookReportRef}
            className="bg-white text-zinc-900 rounded-2xl p-4 sm:p-6 border-2 border-[#599E39]/40 shadow-xl overflow-x-auto select-none"
            style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', Arial, sans-serif" }}
          >
            {/* Header Line 1: Mandal Name (Devanagari, Bold, Centered) */}
            <h1 className="text-xl sm:text-2xl font-black text-center text-zinc-950 tracking-normal font-sans">
              {activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ'}
            </h1>

            {/* Header Line 2: Book Title e.g. "बूक न. 1 वर्गणी" (Bold, Centered) */}
            <h2 className="text-base sm:text-lg font-extrabold text-center text-zinc-900 mt-1 pb-4">
              {getBookDisplayTitle(selectedBook)}
            </h2>

            {/* Data Table with Green Header */}
            {bookDonorsList.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs sm:text-sm border border-dashed border-zinc-300 rounded-xl">
                {bookReportSearch ? 'शोधानुसार कोणतीही देणगीदार नोंद आढळली नाही' : 'या बूक मध्ये अद्याप कोणतीही देणगीदार नोंद नाही'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#599E39] rounded-lg">
                <table className="w-full border-collapse text-xs sm:text-sm font-sans bg-white">
                  <thead>
                    <tr
                      style={{ backgroundColor: '#599E39', color: '#ffffff' }}
                      className="font-bold text-center border-b border-[#477e2e]"
                    >
                      <th className="border border-[#4c8730] py-2.5 px-3 w-14 text-center font-bold text-white whitespace-nowrap">
                        Sr No
                      </th>
                      <th className="border border-[#4c8730] py-2.5 px-4 text-left font-bold text-white">
                        देणगीदार नाव
                      </th>
                      <th className="border border-[#4c8730] py-2.5 px-3 text-right w-28 font-bold text-white whitespace-nowrap">
                        देणगी रक्कम
                      </th>
                      <th className="border border-[#4c8730] py-2.5 px-3 text-right w-24 font-bold text-white whitespace-nowrap">
                        जमा
                      </th>
                      <th className="border border-[#4c8730] py-2.5 px-3 text-right w-24 font-bold text-white whitespace-nowrap">
                        येणे
                      </th>
                      <th className="border border-[#4c8730] py-2.5 px-3 text-center w-24 font-bold text-white whitespace-nowrap">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookDonorsList.map((donor, idx) => {
                      const promised = Number(donor.promisedAmount || donor.totalPaid || 0);
                      const paid = Number(donor.totalPaid || 0);
                      const remaining = Math.max(0, promised - paid);

                      const isFullyPaid = remaining === 0 && paid > 0;
                      const isPartial = paid > 0 && remaining > 0;
                      const isPending = paid === 0;

                      return (
                        <tr
                          key={donor._id || idx}
                          className="hover:bg-emerald-50/50 transition border-b border-zinc-200 even:bg-[#fafbfa]"
                        >
                          {/* Col 1: Sr No */}
                          <td className="border border-zinc-300 py-2 px-3 text-center font-semibold text-zinc-700">
                            {idx + 1}
                          </td>

                          {/* Col 2: देणगीदार नाव */}
                          <td className="border border-zinc-300 py-2 px-4 text-left text-zinc-900">
                            <div className="font-bold flex items-center gap-1.5 flex-wrap">
                              <span>{donor.name}</span>
                              {donor.businessName && (
                                <span className="text-[11px] text-zinc-500 font-normal">
                                  ({donor.businessName})
                                </span>
                              )}
                              {selectedBook === 'all' && donor.bookNo && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-100 text-zinc-600 font-mono border border-zinc-300">
                                  बूक {donor.bookNo}
                                </span>
                              )}
                            </div>
                            {donor.mobile && (
                              <div className="text-[11px] text-zinc-500 print:hidden flex items-center gap-1 mt-0.5">
                                <span>मो: {donor.mobile}</span>
                                {donor.area && <span>• {donor.area}</span>}
                              </div>
                            )}
                          </td>

                          {/* Col 3: देणगी रक्कम */}
                          <td className="border border-zinc-300 py-2 px-3 text-right font-mono font-bold text-zinc-800 whitespace-nowrap">
                            ₹{promised.toLocaleString('en-IN')}
                          </td>

                          {/* Col 4: जमा */}
                          <td className="border border-zinc-300 py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            ₹{paid.toLocaleString('en-IN')}
                          </td>

                          {/* Col 5: येणे */}
                          <td className={`border border-zinc-300 py-2 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            remaining > 0 ? 'text-amber-700 font-black' : 'text-zinc-500'
                          }`}>
                            ₹{remaining.toLocaleString('en-IN')}
                          </td>

                          {/* Col 6: Status */}
                          <td className="border border-zinc-300 py-2 px-3 text-center whitespace-nowrap">
                            {isFullyPaid && (
                              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#A5D6A7]">
                                जमा
                              </span>
                            )}
                            {isPartial && (
                              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#FFF8E1] text-[#F57F17] border border-[#FFE082]">
                                अपूर्ण
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]">
                                बाकी
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {/* Summary / Total Row matching user requirements */}
                    <tr className="bg-[#EDF7ED] font-black border-t-2 border-[#599E39] text-zinc-950">
                      <td className="border border-zinc-300 py-2.5 px-3 text-center font-bold">
                        एकूण
                      </td>
                      <td className="border border-zinc-300 py-2.5 px-4 font-black">
                        एकूण ({bookDonorsList.length} देणगीदार)
                      </td>
                      <td className="border border-zinc-300 py-2.5 px-3 text-right font-black text-zinc-950 font-mono whitespace-nowrap">
                        ₹{bookReportTotals.promised.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-zinc-300 py-2.5 px-3 text-right font-black text-emerald-800 font-mono whitespace-nowrap">
                        ₹{bookReportTotals.paid.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-zinc-300 py-2.5 px-3 text-right font-black text-amber-800 font-mono whitespace-nowrap">
                        ₹{bookReportTotals.remaining.toLocaleString('en-IN')}
                      </td>
                      <td className="border border-zinc-300 py-2.5 px-3 text-center font-bold text-xs text-emerald-800 whitespace-nowrap">
                        {bookReportTotals.percent}% वसूल
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Official e-Signatures Section matching Balance Sheet & Excel */}
            <div className="mt-8 pt-6 border-t-2 border-zinc-300">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                {/* 1. Treasurer e-Sign */}
                <div className="flex flex-col items-center">
                  <div className="h-8 flex items-end justify-center font-serif italic text-xs font-bold text-emerald-800 tracking-wider">
                    Gururaj K. (e-Sign)
                  </div>
                  <div className="w-full border-t border-zinc-700 pt-1 font-black text-zinc-900 text-xs sm:text-sm">
                    श्री. गुरुराज (खजिनदार)
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    खजिनदार सही (Treasurer)
                  </span>
                  <div className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ ई-स्वाक्षरी प्रमाणित
                  </div>
                </div>

                {/* 2. Secretary e-Sign */}
                <div className="flex flex-col items-center">
                  <div className="h-8 flex items-end justify-center font-serif italic text-xs font-bold text-zinc-600 tracking-wider">
                    Secretary (e-Sign)
                  </div>
                  <div className="w-full border-t border-zinc-700 pt-1 font-black text-zinc-900 text-xs sm:text-sm">
                    कार्यवाह / सेक्रेटरी
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    कार्यवाह सही (Secretary)
                  </span>
                  <div className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ ई-स्वाक्षरी प्रमाणित
                  </div>
                </div>

                {/* 3. President e-Sign */}
                <div className="flex flex-col items-center">
                  <div className="h-8 flex items-end justify-center font-serif italic text-xs font-bold text-zinc-600 tracking-wider">
                    President (e-Sign)
                  </div>
                  <div className="w-full border-t border-zinc-700 pt-1 font-black text-zinc-900 text-xs sm:text-sm">
                    अध्यक्ष
                  </div>
                  <span className="text-[10px] text-zinc-500 font-medium">
                    अध्यक्ष सही (President)
                  </span>
                  <div className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ ई-स्वाक्षरी प्रमाणित
                  </div>
                </div>
              </div>

              {/* Official Seal / Notice */}
              <div className="mt-6 pt-3 border-t border-zinc-200 flex flex-wrap items-center justify-between text-[10.5px] text-zinc-500 font-sans gap-2">
                <div>
                  मंडळ: <strong>{activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर'}</strong>
                </div>
                <div className="text-zinc-400">
                  अधिकृत डिजिटल वर्गणी हिशोब पत्रक • ई-स्वाक्षरी व सिस्टीम पडताळणीसह
                </div>
                <div>
                  दिनांक: <strong>{new Date().toLocaleDateString('mr-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PENDING DONORS BY BOOK CATEGORY (वहीनिहाय बाकी वर्गणीदार) */}
      {reportSubTab === 'pending' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2 p-3 bg-[#16181d] border border-[#262932] rounded-2xl">
            <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
              <Clock size={16} className="text-amber-400" />
              <span>
                {selectedBook === 'all'
                  ? 'सर्व वह्या एकत्र थकबाकीदार यादी'
                  : `वही क्र. ${selectedBook} थकबाकीदार यादी`}
              </span>
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={handleSharePendingSummaryWhatsApp}
                className="px-2.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition"
                title="WhatsApp वर बाकी सारांश शेअर करा"
              >
                <Share2 size={13} />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              {canExportReports && (
                <button
                  onClick={handleExportPendingCSV}
                  className="px-3 py-1.5 rounded-xl bg-[#1c1f26] border border-[#2b2f3a] text-[#2DD4BF] text-xs font-bold flex items-center gap-1.5 hover:bg-[#252833] transition"
                  title="Export Pending Donors CSV"
                >
                  <FileSpreadsheet size={14} />
                  <span>Excel (CSV)</span>
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="p-1.5 rounded-xl bg-[#20222a] text-zinc-300 hover:text-white transition"
                title="Print"
              >
                <Printer size={15} />
              </button>
            </div>
          </div>

          {/* Pending Overview Financial Banner Card */}
          <div className="rounded-[28px] bg-gradient-to-br from-[#23150c] to-[#120f0c] border border-[#52331b] p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider block flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-400" />
                  <span>
                    {selectedBook === 'all'
                      ? 'एकूण बाकी वर्गणी रक्कम (Total Remaining Balance)'
                      : `वही क्र. ${selectedBook} बाकी रक्कम`}
                  </span>
                </span>
                <div className="text-3xl sm:text-4xl font-black text-amber-400 tracking-tight mt-1">
                  {formatINR(currentPendingAmount)}
                </div>
                <p className="text-[11.5px] text-zinc-400 mt-1 font-mono">
                  {currentPendingCount} देणगीदारांची वर्गणी येणे बाकी आहे
                </p>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#381c0e] text-amber-300 border border-[#6b3518]">
                {selectedBook === 'all' ? 'सर्व वह्या' : `वही: ${selectedBook}`}
              </span>
            </div>

            {/* 3 Metric Cards for Pending Scope */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#3a2014] text-center">
              <div className="bg-[#17120e] p-2.5 rounded-xl border border-[#2a1b12]">
                <span className="text-[10px] text-zinc-400 block font-medium">ठरलेली वर्गणी</span>
                <span className="text-sm font-bold text-zinc-200">
                  {formatINR(currentPromisedAmount)}
                </span>
              </div>
              <div className="bg-[#17120e] p-2.5 rounded-xl border border-[#2a1b12]">
                <span className="text-[10px] text-zinc-400 block font-medium">जमा वर्गणी</span>
                <span className="text-sm font-bold text-emerald-400">
                  {formatINR(currentPaidAmount)}
                </span>
              </div>
              <div className="bg-[#17120e] p-2.5 rounded-xl border border-[#2a1b12]">
                <span className="text-[10px] text-amber-300 block font-bold">बाकी वर्गणी</span>
                <span className="text-sm font-black text-amber-400">
                  {formatINR(currentPendingAmount)}
                </span>
              </div>
            </div>

            {/* Collection Progress */}
            {currentPromisedAmount > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                  <span>संकलन प्रगती: {currentPercent}%</span>
                  <span className="text-amber-400">बाकी: {100 - currentPercent}%</span>
                </div>
                <div className="h-2 w-full bg-[#20150f] rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${currentPercent}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                  <div
                    style={{ width: `${100 - currentPercent}%` }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Book Category Selector Pills for Pending */}
          <div className="bg-[#15171d] p-3 rounded-2xl border border-[#252833] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                <BookOpen size={14} className="text-amber-400" />
                <span>वही वर्गवारी निवडा (Select Book Category):</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-medium">
                {pendingData?.books?.length || 0} वह्यांमध्ये बाकी
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => handleSelectBook('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedBook === 'all'
                    ? 'bg-[#FF5A1F] text-white shadow-md'
                    : 'bg-[#1c1f26] border border-[#2c303c] text-zinc-400 hover:text-white'
                }`}
              >
                <Layers size={13} />
                <span>सर्व वह्या ({pendingData?.overall?.count || 0})</span>
              </button>

              {pendingData?.books?.map((b) => {
                const isSelected = selectedBook === b.bookNo;
                return (
                  <button
                    key={b.bookNo}
                    onClick={() => handleSelectBook(b.bookNo)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#3b2314] border border-amber-500 text-amber-300 shadow-md font-extrabold'
                        : 'bg-[#1c1f26] border border-[#2c303c] text-zinc-300 hover:text-white'
                    }`}
                  >
                    <BookOpen size={13} className={isSelected ? 'text-amber-400' : 'text-zinc-500'} />
                    <span>{b.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10.5px] font-mono font-bold ${
                      isSelected ? 'bg-amber-500/20 text-amber-300' : 'bg-[#252833] text-amber-400'
                    }`}>
                      {formatINR(b.totalPendingAmount)}
                    </span>
                    <span className="text-[10px] text-zinc-400">({b.pendingCount})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Bar for Pending Donors */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-3 text-zinc-400" />
            <input
              type="text"
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder="बाकी देणगीदाराचे नाव, मोबाईल किंवा वही क्र. शोधा..."
              className="w-full bg-[#181a1f] border border-[#272b36] rounded-2xl pl-10 pr-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 transition placeholder:text-zinc-500"
            />
            {pendingSearch && (
              <button
                onClick={() => setPendingSearch('')}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Pending Donors List / Grouped by Book Category */}
          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-xs">लोड होत आहे...</div>
          ) : displayedPendingBooks.length === 0 ? (
            <div className="rounded-[24px] bg-[#16171c] border border-[#252832] p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-[#143323] text-[#22C55E] flex items-center justify-center mx-auto border border-[#1b4e33]">
                <CheckCircle2 size={30} />
              </div>
              <h4 className="text-base font-bold text-white">अभिनंदन! कोणतीही वर्गणी बाकी नाही</h4>
              <p className="text-xs text-zinc-400">
                {selectedBook === 'all'
                  ? 'सर्व वह्यांमधील देणगीदारांची वर्गणी १००% जमा झाली आहे!'
                  : `वही क्र. ${selectedBook} मधील सर्व देणगीदारांची वर्गणी पूर्ण जमा झाली आहे!`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedPendingBooks.map((bookGroup) => {
                const isCollapsed = !!collapsedBooks[bookGroup.bookNo];
                return (
                  <div
                    key={bookGroup.bookNo}
                    className="rounded-[24px] bg-[#16171c] border border-[#2b2520] overflow-hidden shadow-md"
                  >
                    {/* Book Category Section Header */}
                    <div
                      onClick={() => toggleCollapseBook(bookGroup.bookNo)}
                      className="p-3.5 bg-gradient-to-r from-[#1e1713] to-[#16171c] border-b border-[#2c221a] flex items-center justify-between cursor-pointer hover:bg-[#251c16] transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#372314] text-[#FB923C] flex items-center justify-center border border-[#52331b]">
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-zinc-100">
                              {bookGroup.label}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800">
                              {bookGroup.donors.length} बाकीदार
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            ठरलेली: {formatINR(bookGroup.totalPromised)} • जमा: {formatINR(bookGroup.totalPaid)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-400 block uppercase font-medium">बाकी रक्कम</span>
                          <span className="text-sm sm:text-base font-black text-amber-400">
                            {formatINR(bookGroup.totalPendingAmount)}
                          </span>
                        </div>
                        <button className="text-zinc-400 p-1">
                          {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Donors List in this Book */}
                    {!isCollapsed && (
                      <div className="p-3 space-y-2.5 divide-y divide-[#21242d]">
                        {bookGroup.donors.map((donor, dIndex) => (
                          <div
                            key={donor.donorId}
                            className="pt-2.5 first:pt-0 space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-5 h-5 rounded-full bg-[#20222a] text-zinc-400 text-[10px] font-bold flex items-center justify-center">
                                    {dIndex + 1}
                                  </span>
                                  <h4 className="font-bold text-sm text-zinc-100">
                                    {donor.name}
                                  </h4>
                                  <span className="px-2 py-0.5 rounded-md bg-[#1d1f27] border border-[#2b2e38] text-zinc-300 text-[10px] font-medium">
                                    {bookGroup.label}
                                  </span>
                                  {donor.status === 'partially_paid' ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800">
                                      अपूर्ण (काही जमा)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800">
                                      बाकी (शून्य जमा)
                                    </span>
                                  )}
                                </div>
                                {donor.mobile && (
                                  <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                                    <span>मो: {donor.mobile}</span>
                                    {donor.physicalReceiptNo && <span>• पावती क्र. {donor.physicalReceiptNo}</span>}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleSendReminder(donor)}
                                  className="p-1.5 rounded-lg bg-[#143d2c] text-[#25D366] hover:bg-[#1a523b] transition"
                                  title="WhatsApp आठवण पाठवा"
                                >
                                  <MessageSquare size={14} />
                                </button>
                                <button
                                  onClick={() => openNewPayment({
                                    _id: donor.donorId,
                                    name: donor.name,
                                    promisedAmount: donor.promisedAmount,
                                    totalPaid: donor.totalPaid,
                                    bookNo: donor.bookNo,
                                  })}
                                  className="px-2.5 py-1 rounded-xl bg-[#FF5A1F] text-white text-xs font-bold hover:bg-[#E04C00] transition"
                                >
                                  + हप्ता
                                </button>
                              </div>
                            </div>

                            {/* Financial Amount Bar for Donor */}
                            <div className="grid grid-cols-3 gap-2 bg-[#121316] p-2 rounded-xl border border-[#20222a] text-center text-xs">
                              <div>
                                <span className="text-[10px] text-zinc-500 block">ठरलेली वर्गणी</span>
                                <span className="font-bold text-zinc-300">{formatINR(donor.promisedAmount)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-zinc-500 block">जमा रक्कम</span>
                                <span className="font-bold text-emerald-400">{formatINR(donor.totalPaid)}</span>
                              </div>
                              <div className="bg-[#241710] rounded-lg py-0.5 border border-[#3d2416]">
                                <span className="text-[10px] text-amber-300 block font-bold">बाकी / शिल्लक रक्कम</span>
                                <span className="font-black text-amber-400 text-xs sm:text-sm">
                                  {formatINR(donor.remaining)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OFFICIAL MANDAL AUDITED BALANCE SHEET (जमा-खर्च ताळेबंद पत्रक) */}
      {reportSubTab === 'statement' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2 p-3 bg-[#16181d] border border-[#262932] rounded-2xl">
            <span className="text-xs text-zinc-300 font-semibold flex items-center gap-1.5">
              <FileText size={16} className="text-[#FF5A1F]" />
              <span>{selectedBook === 'all' ? 'सर्वसमावेशक अधिकृत ताळेबंद पत्रक' : `वही क्र. ${selectedBook} ताळेबंद पत्रक`}</span>
            </span>
            <div className="flex gap-2 items-center">
              {canExportReports ? (
                <>
                  <button
                    onClick={handleShareBalanceSheetWhatsApp}
                    className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Share2 size={14} />
                    <span>WhatsApp शेअर</span>
                  </button>
                  <button
                    onClick={handleDownloadBalanceSheetPDF}
                    disabled={downloadingSheet}
                    className="px-3 py-1.5 rounded-xl bg-[#FF5A1F] hover:bg-[#E04C00] text-white text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Download size={14} />
                    <span>{downloadingSheet ? 'डाऊनलोड...' : 'PDF'}</span>
                  </button>
                </>
              ) : (
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-[#2DD4BF]" />
                  <span>डाऊनलोड अधिकार ॲडमिन/खजिनदारांकडे आहेत</span>
                </span>
              )}
              <button
                onClick={() => window.print()}
                className="p-1.5 rounded-xl bg-[#20222a] text-zinc-300 hover:text-white transition"
                title="Print"
              >
                <Printer size={15} />
              </button>
            </div>
          </div>

          {/* Printable Formal Statement Card */}
          <div
            id="printable-balance-sheet"
            ref={balanceSheetRef}
            className="bg-white text-zinc-900 rounded-3xl p-6 sm:p-8 border-2 border-orange-500 shadow-xl font-serif select-none"
            style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', serif" }}
          >
            {/* Header Invocations */}
            <div className="text-center text-xs font-bold text-orange-900 border-b border-orange-200 pb-1 mb-2">
              ॥ श्री गणेशाय नमः ॥ &nbsp;&nbsp;&nbsp; ॥ श्री अंबाबाई प्रसन्न ॥ &nbsp;&nbsp;&nbsp; ॥ श्री तुळजाभवानी प्रसन्न ॥
            </div>

            {/* Mandal Header with Logo */}
            <div className="text-center flex flex-col items-center">
              <img
                src="/mandal-logo.jpg"
                alt="ज्योती नवरात्र मंडळ लोगो"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-amber-600 shadow-md mb-2"
              />
              <span className="inline-block px-3 py-0.5 rounded-full bg-orange-100 text-orange-900 text-[11px] font-bold uppercase mb-1">
                नोंदणी क्र: {activeFestival?.registrationNo || 'महा./६१३/सोलापूर'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-orange-950 tracking-tight leading-tight">
                {activeFestival?.mandalNameMarathi || 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ'}
              </h1>
              <p className="text-xs font-medium text-zinc-700 mt-0.5">
                {activeFestival?.mandalAddress || '१९३, एम.आय.डी.सी.रोड, सोलापूर'}
              </p>
              <div className="mt-2 inline-block border-y-2 border-orange-600 px-5 py-1 font-black text-base text-orange-950">
                🚩 वार्षिक जमा-खर्च ताळेबंद पत्रक - {activeFestival?.name || 'नवरात्र उत्सव २०२६'} 🚩
              </div>
            </div>

            {/* Statement Date & Info */}
            <div className="mt-4 flex items-center justify-between text-xs border-b border-zinc-300 pb-2 text-zinc-700 font-semibold">
              <div>उत्सव वर्ष: {activeFestival?.year || 2026}</div>
              <div>अहवाल: <strong>अधिकृत जमा-खर्च ताळेबंद</strong></div>
              <div>तारीख: {new Date().toLocaleDateString('mr-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>

            {/* Two-Column Traditional Jama & Kharch Ledger Table */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Left Column: जमा (INCOME / RECEIPTS) */}
              <div className="border border-emerald-300 rounded-2xl overflow-hidden bg-emerald-50/30 flex flex-col">
                <div className="bg-emerald-600 text-white font-bold p-2 text-center text-sm">
                  जमा बाजू (INCOME / RECEIPTS)
                </div>
                <div className="p-3 space-y-2 flex-1 divide-y divide-emerald-100">
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-zinc-800">मागील वर्षाची शिल्लक (Opening Balance):</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {formatINR(summary?.openingBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-semibold text-zinc-800 block">
                        वर्गणी संकलन (एकूण संकलित वर्गणी):
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        एकूण पावत्या: {summary?.receiptCount || 0}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-800">
                      {formatINR(summary?.totalVargani || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-semibold text-zinc-800">इतर देणग्या व व्याज:</span>
                    <span className="font-mono font-bold text-zinc-700">₹०</span>
                  </div>
                </div>
                <div className="bg-emerald-100 border-t border-emerald-300 p-2.5 flex items-center justify-between font-black text-sm text-emerald-950">
                  <span>एकूण जमा रक्कम (Total Income):</span>
                  <span>{formatINR((summary?.openingBalance || 0) + (summary?.totalVargani || 0))}</span>
                </div>
              </div>

              {/* Right Column: खर्च (EXPENSES) */}
              <div className="border border-red-300 rounded-2xl overflow-hidden bg-red-50/30 flex flex-col">
                <div className="bg-red-600 text-white font-bold p-2 text-center text-sm">
                  खर्च बाजू (EXPENSES / PAYMENTS)
                </div>
                <div className="p-3 space-y-2 flex-1 divide-y divide-red-100">
                  {expenseData?.categoryBreakdown && expenseData.categoryBreakdown.length > 0 ? (
                    expenseData.categoryBreakdown.map((cat) => (
                      <div key={cat.category} className="flex items-center justify-between pt-1">
                        <span className="font-semibold text-zinc-800">{cat.category}:</span>
                        <span className="font-mono font-bold text-red-800">
                          {formatINR(cat.total)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-500 py-4 text-center">कोणताही खर्च नोंदवलेला नाही</div>
                  )}
                </div>
                <div className="bg-red-100 border-t border-red-300 p-2.5 flex items-center justify-between font-black text-sm text-red-950">
                  <span>एकूण खर्च रक्कम (Total Expenses):</span>
                  <span>{formatINR(summary?.totalExpenses || 0)}</span>
                </div>
              </div>
            </div>

            {/* Net Available Balance Banner */}
            <div className="mt-4 p-4 rounded-2xl bg-orange-100 border-2 border-orange-400 flex items-center justify-between text-orange-950">
              <div>
                <span className="text-xs font-bold block uppercase tracking-wider">
                  अखेर शिल्लक रक्कम (Net Balance in Hand):
                </span>
                <span className="text-[11px] text-zinc-600 font-sans">
                  (एकूण जमा रक्कम − एकूण खर्च रक्कम)
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800">
                {formatINR(summary?.currentBalance || 0)}
              </div>
            </div>

            {/* Official Signatures Section */}
            <div className="mt-8 pt-6 border-t border-zinc-300 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="h-10" />
                <div className="border-t border-zinc-600 pt-1 font-bold text-zinc-800">
                  श्री. गुरुराज (खजिनदार)
                </div>
                <span className="text-[10px] text-zinc-500">खजिनदार सही</span>
              </div>

              <div>
                <div className="h-10" />
                <div className="border-t border-zinc-600 pt-1 font-bold text-zinc-800">
                  कार्यवाह / सेक्रेटरी
                </div>
                <span className="text-[10px] text-zinc-500">कार्यवाह सही</span>
              </div>

              <div>
                <div className="h-10" />
                <div className="border-t border-zinc-600 pt-1 font-bold text-zinc-800">
                  अध्यक्ष
                </div>
                <span className="text-[10px] text-zinc-500">अध्यक्ष सही</span>
              </div>
            </div>

            <div className="mt-5 text-center text-[10.5px] font-semibold text-orange-900 border-t border-orange-100 pt-2">
              🙏 मंडळास सहकार्य करणाऱ्या सर्व भाविकांचे, देणगीदारांचे व कार्यकर्त्यांचे मनःपूर्वक आभार! 🙏
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DONOR-WISE LEDGER (देणगीदार हिशोब पत्रक) */}
      {reportSubTab === 'ledger' && (
        <div className="space-y-3.5">
          {/* Search & Filter Header */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-3 text-zinc-400" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="नाव, मोबाईल किंवा वही क्र. शोधा..."
                className="w-full bg-[#181a1f] border border-[#272b36] rounded-2xl pl-10 pr-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-[#FF5A1F]"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: `सर्व (${donorLedger.length})` },
                { id: 'pending', label: 'बाकी (Pending)' },
                { id: 'partially_paid', label: 'अपूर्ण (Partial)' },
                { id: 'fully_paid', label: 'पूर्ण भरणा (Fully Paid)' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setLedgerFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    ledgerFilter === f.id
                      ? 'bg-[#FF5A1F] text-white'
                      : 'bg-[#181a1f] border border-[#272b36] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Donor Ledger List / Table */}
          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-xs">लोड होत आहे...</div>
          ) : filteredDonors.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              कोणतीही देणगीदार नोंद सापडली नाही
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDonors.map((d, index) => {
                const promised = d.promisedAmount || 0;
                const paid = d.totalPaid || 0;
                const remaining = d.remaining !== undefined ? d.remaining : Math.max(0, promised - paid);

                return (
                  <div
                    key={d._id}
                    className="rounded-[22px] bg-[#16171c] border border-[#252832] p-3.5 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-[#20222b] text-zinc-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-100 flex items-center gap-1.5 flex-wrap">
                            <span>{d.name}</span>
                            {d.bookNo && (
                              <span className="px-2 py-0.5 rounded-md bg-[#191d27] border border-[#262c3b] text-zinc-300 font-semibold text-[10.5px]">
                                वही क्र. {d.bookNo}
                              </span>
                            )}
                            {d.status === 'fully_paid' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                                पूर्ण भरणा
                              </span>
                            )}
                            {d.status === 'partially_paid' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800">
                                अपूर्ण
                              </span>
                            )}
                            {d.status === 'pending' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                बाकी
                              </span>
                            )}
                          </h4>
                          {d.mobile && (
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              मो: {d.mobile}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {remaining > 0 && (
                          <button
                            onClick={() => handleSendReminder(d)}
                            className="p-1.5 rounded-lg bg-[#143d2c] text-[#25D366] hover:bg-[#1a523b] transition"
                            title="WhatsApp आठवण पाठवा"
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => openNewPayment(d)}
                          className="px-2.5 py-1 rounded-xl bg-[#FF5A1F] text-white text-xs font-bold hover:bg-[#E04C00] transition"
                        >
                          हप्ता
                        </button>
                      </div>
                    </div>

                    {/* Ledger amounts bar */}
                    <div className="grid grid-cols-3 gap-2 bg-[#121316] p-2 rounded-xl border border-[#21242d] text-center text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">ठरलेली वर्गणी</span>
                        <span className="font-bold text-zinc-200">{formatINR(promised)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">एकूण जमा</span>
                        <span className="font-bold text-emerald-400">{formatINR(paid)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">शिल्लक रक्कम</span>
                        <span className={`font-bold ${remaining === 0 ? 'text-zinc-500' : 'text-amber-400'}`}>
                          {formatINR(remaining)}
                        </span>
                      </div>
                    </div>

                    {/* Installments sub-list if any */}
                    {d.installments && d.installments.length > 0 && (
                      <div className="pt-1 flex items-center gap-2 overflow-x-auto text-[11px] text-zinc-400">
                        <span className="font-semibold text-zinc-500">हप्ते:</span>
                        {d.installments.map((inst, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-[#1d1f27] border border-[#2b2e38] text-zinc-300 whitespace-nowrap"
                          >
                            #{inst.receiptNo}: {formatINR(inst.amount)} ({inst.method})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

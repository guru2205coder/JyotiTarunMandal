import * as XLSX from 'xlsx';

/**
 * Export Book-Wise Report to native .xlsx format matching the user's report layout:
 * - Row 1: Mandal Name (Center, Bold, Merged A1:F1)
 * - Row 2: Book Title e.g. "बूक न. 1 वर्गणी" (Center, Bold, Merged A2:F2)
 * - Row 3: Blank
 * - Row 4: Column Headers: Sr No, देणगीदार नाव, देणगी रक्कम, जमा, येणे, Status
 * - Row 5+: Donors data
 * - Final Row: Totals summary
 */
export const exportBookWiseExcel = ({
  mandalName = 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
  bookNo = '1',
  donors = [],
  festivalYear = 2026,
}) => {
  const numericBook = (bookNo || '').replace(/[^0-9]/g, '');
  const cleanBookLabel =
    bookNo === 'all'
      ? 'सर्व वह्या एकत्र'
      : numericBook
      ? `बूक न. ${numericBook}`
      : `बूक ${bookNo}`;
  const title1 = mandalName;
  const title2 = `${cleanBookLabel} वर्गणी`;

  const rows = [
    [title1, '', '', '', '', ''],
    [title2, '', '', '', '', ''],
    ['', '', '', '', '', ''],
    ['Sr No', 'देणगीदार नाव', 'देणगी रक्कम', 'जमा', 'येणे', 'Status'],
  ];

  let totalPromised = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  donors.forEach((d, index) => {
    const promised = Number(d.promisedAmount || d.totalPaid || 0);
    const paid = Number(d.totalPaid || 0);
    const remaining = Math.max(0, promised - paid);

    totalPromised += promised;
    totalPaid += paid;
    totalRemaining += remaining;

    let statusText = 'बाकी';
    if (remaining === 0 && paid > 0) {
      statusText = 'जमा';
    } else if (paid > 0 && remaining > 0) {
      statusText = 'अपूर्ण';
    }

    const donorName = d.businessName ? `${d.name} (${d.businessName})` : d.name;

    rows.push([
      index + 1,
      donorName || '',
      promised,
      paid,
      remaining,
      statusText,
    ]);
  });

  // Grand summary total row
  rows.push([
    'एकूण',
    `${donors.length} देणगीदार`,
    totalPromised,
    totalPaid,
    totalRemaining,
    totalPromised > 0 ? `${Math.round((totalPaid / totalPromised) * 100)}% जमा` : '१००% जमा',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column width styling
  ws['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 34 }, // देणगीदार नाव
    { wch: 16 }, // देणगी रक्कम
    { wch: 16 }, // जमा
    { wch: 16 }, // येणे
    { wch: 16 }, // Status
  ];

  // Merge headers for title1 (A1:F1) and title2 (A2:F2)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];

  const wb = XLSX.utils.book_new();
  const sheetName = (cleanBookLabel || 'बूक अहवाल').replace(/[:\\/?*\[\]]/g, '').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeFileLabel = bookNo === 'all' ? 'All_Books' : `Book_${(numericBook || bookNo).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  XLSX.writeFile(wb, `Jyoti_Mandal_${safeFileLabel}_Vargani_${festivalYear}.xlsx`);
};

/**
 * Export Book-Wise Report to standard CSV with UTF-8 BOM for Microsoft Excel Marathi support
 */
export const exportBookWiseCSV = ({
  mandalName = 'ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ',
  bookNo = '1',
  donors = [],
  festivalYear = 2026,
}) => {
  const numericBook = (bookNo || '').replace(/[^0-9]/g, '');
  const cleanBookLabel =
    bookNo === 'all'
      ? 'सर्व वह्या एकत्र'
      : numericBook
      ? `बूक न. ${numericBook}`
      : `बूक ${bookNo}`;
  const title1 = mandalName;
  const title2 = `${cleanBookLabel} वर्गणी`;

  const lines = [
    `"${title1.replace(/"/g, '""')}"`,
    `"${title2.replace(/"/g, '""')}"`,
    '',
    'Sr No,देणगीदार नाव,देणगी रक्कम,जमा,येणे,Status',
  ];

  let totalPromised = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  donors.forEach((d, index) => {
    const promised = Number(d.promisedAmount || d.totalPaid || 0);
    const paid = Number(d.totalPaid || 0);
    const remaining = Math.max(0, promised - paid);

    totalPromised += promised;
    totalPaid += paid;
    totalRemaining += remaining;

    let statusText = 'बाकी';
    if (remaining === 0 && paid > 0) {
      statusText = 'जमा';
    } else if (paid > 0 && remaining > 0) {
      statusText = 'अपूर्ण';
    }

    const donorName = d.businessName ? `${d.name} (${d.businessName})` : d.name;

    lines.push(
      [
        index + 1,
        `"${(donorName || '').replace(/"/g, '""')}"`,
        promised,
        paid,
        remaining,
        `"${statusText}"`,
      ].join(',')
    );
  });

  // Summary row
  lines.push(
    [
      '"एकूण"',
      `"${donors.length} देणगीदार"`,
      totalPromised,
      totalPaid,
      totalRemaining,
      `"${totalPromised > 0 ? Math.round((totalPaid / totalPromised) * 100) : 100}% जमा"`,
    ].join(',')
  );

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFileLabel = bookNo === 'all' ? 'All_Books' : `Book_${(numericBook || bookNo).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  link.setAttribute('download', `Jyoti_Mandal_${safeFileLabel}_Vargani_${festivalYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

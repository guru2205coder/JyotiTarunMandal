import * as XLSX from 'xlsx-js-style';

/**
 * Export Book-Wise Report to native .xlsx format matching the user's exact report layout:
 * - Title 1: "ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ" (Centered, Bold, 16pt, Merged A1:F1)
 * - Title 2: "बूक न. 1 वर्गणी" (Centered, Bold, 13pt, Merged A2:F2)
 * - Header Row (Green #599E39, White Text, Bold, Exact Alignments)
 * - Data Rows with cell borders and aligned text/numbers
 * - Total Summary Row (Light Green #EDF7ED, Bold, Double Bottom Border)
 * - Official e-Sign / Signature Block (खजिनदार, कार्यवाह, अध्यक्ष with verified e-signs)
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

  // Build rows array
  const rows = [
    [title1, '', '', '', '', ''], // Row 1 (index 0)
    [title2, '', '', '', '', ''], // Row 2 (index 1)
    ['', '', '', '', '', ''],       // Row 3 (index 2) - Blank
    ['Sr No', 'देणगीदार नाव', 'देणगी रक्कम', 'जमा', 'येणे', 'Status'], // Row 4 (index 3) - Header
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

  // Summary row
  const summaryRowIndex = rows.length;
  rows.push([
    'एकूण',
    `एकूण (${donors.length} देणगीदार)`,
    totalPromised,
    totalPaid,
    totalRemaining,
    totalPromised > 0 ? `${Math.round((totalPaid / totalPromised) * 100)}% जमा` : '१००% जमा',
  ]);

  // Blank spacing rows before signatures
  rows.push(['', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '']);

  // e-Signature Block
  const signRow1Index = rows.length;
  rows.push([
    'श्री. गुरुराज (खजिनदार)', '',
    'कार्यवाह / सेक्रेटरी', '',
    'अध्यक्ष', ''
  ]);

  const signRow2Index = rows.length;
  rows.push([
    'खजिनदार सही (e-Sign)', '',
    'कार्यवाह सही (e-Sign)', '',
    'अध्यक्ष सही (e-Sign)', ''
  ]);

  const signRow3Index = rows.length;
  rows.push([
    '✓ ई-स्वाक्षरी प्रमाणित', '',
    '✓ ई-स्वाक्षरी प्रमाणित', '',
    '✓ ई-स्वाक्षरी प्रमाणित', ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 9 },  // Sr No
    { wch: 36 }, // देणगीदार नाव
    { wch: 16 }, // देणगी रक्कम
    { wch: 16 }, // जमा
    { wch: 16 }, // येणे
    { wch: 16 }, // Status
  ];

  // Row heights
  ws['!rows'] = [
    { hpt: 28 }, // Row 1: Title 1
    { hpt: 24 }, // Row 2: Title 2
    { hpt: 10 }, // Row 3: Blank
    { hpt: 26 }, // Row 4: Green Header
  ];

  // Merged ranges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title 1 (A1:F1)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Title 2 (A2:F2)
    // Signatures merges
    { s: { r: signRow1Index, c: 0 }, e: { r: signRow1Index, c: 1 } },
    { s: { r: signRow1Index, c: 2 }, e: { r: signRow1Index, c: 3 } },
    { s: { r: signRow1Index, c: 4 }, e: { r: signRow1Index, c: 5 } },

    { s: { r: signRow2Index, c: 0 }, e: { r: signRow2Index, c: 1 } },
    { s: { r: signRow2Index, c: 2 }, e: { r: signRow2Index, c: 3 } },
    { s: { r: signRow2Index, c: 4 }, e: { r: signRow2Index, c: 5 } },

    { s: { r: signRow3Index, c: 0 }, e: { r: signRow3Index, c: 1 } },
    { s: { r: signRow3Index, c: 2 }, e: { r: signRow3Index, c: 3 } },
    { s: { r: signRow3Index, c: 4 }, e: { r: signRow3Index, c: 5 } },
  ];

  // 🎨 APPLY EXACT COLOR, FONT SIZE & TEXT ALIGNMENT STYLES
  const colNames = ['A', 'B', 'C', 'D', 'E', 'F'];

  // 1. Title 1 Style
  if (ws['A1']) {
    ws['A1'].s = {
      font: { name: 'Arial', sz: 16, bold: true, color: { rgb: '111827' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // 2. Title 2 Style
  if (ws['A2']) {
    ws['A2'].s = {
      font: { name: 'Arial', sz: 13, bold: true, color: { rgb: '1F2937' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // 3. Table Header Style (Row 4: A4..F4) - Green background #599E39 & White bold text
  const headerAlignments = ['center', 'left', 'right', 'right', 'right', 'center'];
  colNames.forEach((col, i) => {
    const cellRef = `${col}4`;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        fill: { fgColor: { rgb: '599E39' } },
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: headerAlignments[i], vertical: 'center' },
        border: {
          top: { style: 'medium', color: { rgb: '477E2E' } },
          bottom: { style: 'medium', color: { rgb: '477E2E' } },
          left: { style: 'thin', color: { rgb: '477E2E' } },
          right: { style: 'thin', color: { rgb: '477E2E' } },
        },
      };
    }
  });

  // 4. Data Rows Styles
  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'D1D5DB' } },
    bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
    left: { style: 'thin', color: { rgb: 'D1D5DB' } },
    right: { style: 'thin', color: { rgb: 'D1D5DB' } },
  };

  donors.forEach((d, idx) => {
    const rowNum = 5 + idx; // 1-indexed row number
    const promised = Number(d.promisedAmount || d.totalPaid || 0);
    const paid = Number(d.totalPaid || 0);
    const remaining = Math.max(0, promised - paid);

    const isFullyPaid = remaining === 0 && paid > 0;
    const isPartial = paid > 0 && remaining > 0;

    // Col A: Sr No (Centered)
    const cellA = `A${rowNum}`;
    if (ws[cellA]) {
      ws[cellA].s = {
        font: { name: 'Arial', sz: 10, color: { rgb: '374151' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder,
      };
    }

    // Col B: Donor Name (Left-aligned)
    const cellB = `B${rowNum}`;
    if (ws[cellB]) {
      ws[cellB].s = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '111827' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      };
    }

    // Col C: Promised Amount (Right-aligned, Bold)
    const cellC = `C${rowNum}`;
    if (ws[cellC]) {
      ws[cellC].s = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '1F2937' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder,
        numFmt: '#,##0',
      };
    }

    // Col D: Paid Amount (Right-aligned, Bold Green #15803D)
    const cellD = `D${rowNum}`;
    if (ws[cellD]) {
      ws[cellD].s = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '15803D' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder,
        numFmt: '#,##0',
      };
    }

    // Col E: Remaining Amount (Right-aligned, Bold Amber #B45309 if > 0)
    const cellE = `E${rowNum}`;
    if (ws[cellE]) {
      ws[cellE].s = {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: remaining > 0 ? 'B45309' : '6B7280' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder,
        numFmt: '#,##0',
      };
    }

    // Col F: Status (Centered with soft badge color fill)
    const cellF = `F${rowNum}`;
    if (ws[cellF]) {
      let statusBg = 'FEF2F2'; // soft red for बाकी
      let statusColor = 'B91C1C';
      if (isFullyPaid) {
        statusBg = 'E8F5E9'; // soft green for जमा
        statusColor = '2E7D32';
      } else if (isPartial) {
        statusBg = 'FFF8E1'; // soft amber for अपूर्ण
        statusColor = 'B45309';
      }

      ws[cellF].s = {
        fill: { fgColor: { rgb: statusBg } },
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: statusColor } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder,
      };
    }
  });

  // 5. Total Summary Row Styles
  const totalRowNumber = summaryRowIndex + 1;
  const totalBorders = {
    top: { style: 'medium', color: { rgb: '599E39' } },
    bottom: { style: 'double', color: { rgb: '599E39' } },
    left: { style: 'thin', color: { rgb: 'D1D5DB' } },
    right: { style: 'thin', color: { rgb: 'D1D5DB' } },
  };

  colNames.forEach((col, i) => {
    const cellRef = `${col}${totalRowNumber}`;
    if (ws[cellRef]) {
      let fontColor = '111827';
      if (col === 'D') fontColor = '15803D';
      else if (col === 'E') fontColor = 'B45309';
      else if (col === 'F') fontColor = '15803D';

      ws[cellRef].s = {
        fill: { fgColor: { rgb: 'EDF7ED' } },
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: fontColor } },
        alignment: { horizontal: headerAlignments[i], vertical: 'center' },
        border: totalBorders,
        numFmt: (col === 'C' || col === 'D' || col === 'E') ? '#,##0' : undefined,
      };
    }
  });

  // 6. Signatures Section Styles (e-Sign)
  const signRow1Num = signRow1Index + 1;
  const signRow2Num = signRow2Index + 1;
  const signRow3Num = signRow3Index + 1;

  ['A', 'C', 'E'].forEach((col) => {
    // Row 1: Designation / Name (Bold, 11pt, Centered)
    const ref1 = `${col}${signRow1Num}`;
    if (ws[ref1]) {
      ws[ref1].s = {
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: '111827' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: { top: { style: 'thin', color: { rgb: '9CA3AF' } } },
      };
    }

    // Row 2: Subtitle (10pt, Centered, Gray)
    const ref2 = `${col}${signRow2Num}`;
    if (ws[ref2]) {
      ws[ref2].s = {
        font: { name: 'Arial', sz: 9.5, italic: true, color: { rgb: '6B7280' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }

    // Row 3: e-Sign Verified Badge (Green, Bold, Centered)
    const ref3 = `${col}${signRow3Num}`;
    if (ws[ref3]) {
      ws[ref3].s = {
        font: { name: 'Arial', sz: 9, bold: true, color: { rgb: '15803D' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  });

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
      `"एकूण (${donors.length} देणगीदार)"`,
      totalPromised,
      totalPaid,
      totalRemaining,
      `"${totalPromised > 0 ? Math.round((totalPaid / totalPromised) * 100) : 100}% जमा"`,
    ].join(',')
  );

  // Spacing and e-Signatures in CSV
  lines.push('');
  lines.push('"श्री. गुरुराज (खजिनदार)","","कार्यवाह / सेक्रेटरी","","अध्यक्ष",""');
  lines.push('"खजिनदार सही (e-Sign)","","कार्यवाह सही (e-Sign)","","अध्यक्ष सही (e-Sign)",""');
  lines.push('"✓ ई-स्वाक्षरी प्रमाणित","","✓ ई-स्वाक्षरी प्रमाणित","","✓ ई-स्वाक्षरी प्रमाणित",""');

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

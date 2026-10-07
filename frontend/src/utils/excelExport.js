import * as XLSXStyle from 'xlsx-js-style';
import * as ff from 'fflate';

const XLSX = XLSXStyle.default || XLSXStyle;

/**
 * Export Book-Wise Report to native .xlsx format matching the user's exact specifications:
 * - A4 Paper Size (paperSize: 9)
 * - Horizontal Center on page printing (<printOptions horizontalCentered="1"/>)
 * - Header Row (Row 4): Height = 26
 *   - 'देणगीदार नाव': Column Width = 29.33, Header Height = 26
 *   - 'देणगी रक्कम': Column Width = 11.56, Header Height = 26
 *   - 'जमा': Column Width = 11.30, Header Height = 26
 *   - 'येणे': Column Width = 11.30, Header Height = 26
 *   - 'Status': Column Width = 13.00, Header Height = 26
 * - Actual Data Rows: Height = 27
 * - Summary & Signatures Blocks styled and formatted cleanly
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

  // Build rows array (5 columns: देणगीदार नाव, देणगी रक्कम, जमा, येणे, Status)
  const rows = [
    [title1, '', '', '', ''], // Row 1 (index 0) - Title 1
    [title2, '', '', '', ''], // Row 2 (index 1) - Title 2
    ['', '', '', '', ''],     // Row 3 (index 2) - Blank Spacing
    ['देणगीदार नाव', 'देणगी रक्कम', 'जमा', 'येणे', 'Status'], // Row 4 (index 3) - Header
  ];

  let totalPromised = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  donors.forEach((d) => {
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
    `एकूण (${donors.length} देणगीदार)`,
    totalPromised,
    totalPaid,
    totalRemaining,
    totalPromised > 0 ? `${Math.round((totalPaid / totalPromised) * 100)}% जमा` : '१००% जमा',
  ]);

  // Blank spacing rows before signatures
  rows.push(['', '', '', '', '']);
  rows.push(['', '', '', '', '']);

  // e-Signature Block (5 columns: A:B for खजिनदार, C:D for कार्यवाह, E for अध्यक्ष)
  const signRow1Index = rows.length;
  rows.push([
    'श्री. गुरुराज (खजिनदार)', '',
    'कार्यवाह / सेक्रेटरी', '',
    'अध्यक्ष',
  ]);

  const signRow2Index = rows.length;
  rows.push([
    'खजिनदार सही (e-Sign)', '',
    'कार्यवाह सही (e-Sign)', '',
    'अध्यक्ष सही (e-Sign)',
  ]);

  const signRow3Index = rows.length;
  rows.push([
    '✓ ई-स्वाक्षरी प्रमाणित', '',
    '✓ ई-स्वाक्षरी प्रमाणित', '',
    '✓ ई-स्वाक्षरी प्रमाणित',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Exact column widths as requested:
  // - देणगीदार नाव: 29.33
  // - देणगी रक्कम: 11.56
  // - जमा: 11.30
  // - येणे: 11.30
  // - Status: 13.00
  ws['!cols'] = [
    { wch: 29.33, width: 29.33 }, // Col A: देणगीदार नाव
    { wch: 11.56, width: 11.56 }, // Col B: देणगी रक्कम
    { wch: 11.30, width: 11.30 }, // Col C: जमा
    { wch: 11.30, width: 11.30 }, // Col D: येणे
    { wch: 13.00, width: 13.00 }, // Col E: Status
  ];

  // Exact row heights as requested:
  // - Header row height: 26
  // - Actual data rows height: 27
  const rowHeights = [
    { hpt: 28 }, // Row 1: Title 1
    { hpt: 24 }, // Row 2: Title 2
    { hpt: 10 }, // Row 3: Blank spacing
    { hpt: 26 }, // Row 4: Header row (देणगीदार नाव, देणगी रक्कम, जमा, येणे, Status) - EXACT 26
  ];

  // Actual data rows: EXACT 27 height each
  donors.forEach(() => {
    rowHeights.push({ hpt: 27 });
  });

  // Summary row
  rowHeights.push({ hpt: 27 });

  // Blank spacing rows
  rowHeights.push({ hpt: 12 });
  rowHeights.push({ hpt: 12 });

  // Signatures rows
  rowHeights.push({ hpt: 24 });
  rowHeights.push({ hpt: 20 });
  rowHeights.push({ hpt: 20 });

  ws['!rows'] = rowHeights;

  // Merged ranges (5 columns: A to E)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Title 1 (A1:E1)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Title 2 (A2:E2)
    // Signatures merges
    { s: { r: signRow1Index, c: 0 }, e: { r: signRow1Index, c: 1 } },
    { s: { r: signRow1Index, c: 2 }, e: { r: signRow1Index, c: 3 } },

    { s: { r: signRow2Index, c: 0 }, e: { r: signRow2Index, c: 1 } },
    { s: { r: signRow2Index, c: 2 }, e: { r: signRow2Index, c: 3 } },

    { s: { r: signRow3Index, c: 0 }, e: { r: signRow3Index, c: 1 } },
    { s: { r: signRow3Index, c: 2 }, e: { r: signRow3Index, c: 3 } },
  ];

  // A4 Page Setup & Margins & Horizontal Print Centering
  ws['!margins'] = {
    left: 0.5,
    right: 0.5,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3,
  };
  ws['!pageSetup'] = {
    paperSize: 9, // 9 = A4 paper size (210mm x 297mm)
    orientation: 'portrait',
    horizontalCentered: true,
    hCenter: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };
  ws['!printOptions'] = {
    horizontalCentered: true,
    hCenter: true,
  };

  // 🎨 APPLY EXACT COLOR, FONT SIZE & TEXT ALIGNMENT STYLES
  const colNames = ['A', 'B', 'C', 'D', 'E'];

  // 1. Title 1 Style (Merged A1:E1 - Bold, Centered)
  if (ws['A1']) {
    ws['A1'].s = {
      font: { name: 'Arial', sz: 16, bold: true, color: { rgb: '111827' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // 2. Title 2 Style (Merged A2:E2 - Bold, Centered)
  if (ws['A2']) {
    ws['A2'].s = {
      font: { name: 'Arial', sz: 13, bold: true, color: { rgb: '1F2937' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // 3. Table Header Style (Row 4: A4..E4) - Green #599E39 & White Bold, Centered
  colNames.forEach((col) => {
    const cellRef = `${col}4`;
    if (ws[cellRef]) {
      ws[cellRef].s = {
        fill: { fgColor: { rgb: '599E39' } },
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
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

    // Col A: देणगीदार नाव (Left-aligned, Bold 10pt)
    const cellA = `A${rowNum}`;
    if (ws[cellA]) {
      ws[cellA].s = {
        font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '111827' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      };
    }

    // Col B: देणगी रक्कम (Right-aligned, Bold)
    const cellB = `B${rowNum}`;
    if (ws[cellB]) {
      ws[cellB].s = {
        font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1F2937' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder,
        numFmt: '#,##0',
      };
    }

    // Col C: जमा (Right-aligned, Bold Green #15803D)
    const cellC = `C${rowNum}`;
    if (ws[cellC]) {
      ws[cellC].s = {
        font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '15803D' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder,
        numFmt: '#,##0',
      };
    }

    // Col D: येणे (Right-aligned, Bold Amber #B45309 if > 0)
    const cellD = `D${rowNum}`;
    if (ws[cellD]) {
      ws[cellD].s = {
        font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: remaining > 0 ? 'B45309' : '6B7280' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder,
        numFmt: '#,##0',
      };
    }

    // Col E: Status (Centered with soft badge color fill)
    const cellE = `E${rowNum}`;
    if (ws[cellE]) {
      let statusBg = 'FEF2F2'; // soft red for बाकी
      let statusColor = 'B91C1C';
      if (isFullyPaid) {
        statusBg = 'E8F5E9'; // soft green for जमा
        statusColor = '2E7D32';
      } else if (isPartial) {
        statusBg = 'FFF8E1'; // soft amber for अपूर्ण
        statusColor = 'B45309';
      }

      ws[cellE].s = {
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

  colNames.forEach((col) => {
    const cellRef = `${col}${totalRowNumber}`;
    if (ws[cellRef]) {
      let fontColor = '111827';
      let align = 'center';
      if (col === 'A') {
        fontColor = '111827';
        align = 'center';
      } else if (col === 'B') {
        fontColor = '1F2937';
        align = 'right';
      } else if (col === 'C') {
        fontColor = '15803D';
        align = 'right';
      } else if (col === 'D') {
        fontColor = 'B45309';
        align = 'right';
      } else if (col === 'E') {
        fontColor = '15803D';
        align = 'center';
      }

      ws[cellRef].s = {
        fill: { fgColor: { rgb: 'EDF7ED' } },
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: fontColor } },
        alignment: { horizontal: align, vertical: 'center' },
        border: totalBorders,
        numFmt: (col === 'B' || col === 'C' || col === 'D') ? '#,##0' : undefined,
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

  // OpenXML post-processing for A4 paper and horizontal center print alignment
  let downloadData;
  try {
    const rawBytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const files = ff.unzipSync(new Uint8Array(rawBytes));
    for (const path in files) {
      if (path.startsWith('xl/worksheets/sheet') && path.endsWith('.xml')) {
        let xml = ff.strFromU8(files[path]);
        const pageMarginsRegex = /(<pageMargins[^>]*\/>)/;
        const printOptionsTag = '<printOptions horizontalCentered="1"/>';
        const pageSetupTag = '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>';

        if (pageMarginsRegex.test(xml)) {
          xml = xml.replace(pageMarginsRegex, `${printOptionsTag}$1${pageSetupTag}`);
        } else {
          xml = xml.replace(
            /<\/worksheet>/,
            `${printOptionsTag}<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>${pageSetupTag}</worksheet>`
          );
        }
        files[path] = ff.strToU8(xml);
      }
    }
    downloadData = ff.zipSync(files);
  } catch (err) {
    console.warn('OpenXML A4 pageSetup injection fallback:', err);
    downloadData = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  }

  const blob = new Blob([downloadData], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFileLabel =
    bookNo === 'all'
      ? 'All_Books'
      : `Book_${(numericBook || bookNo).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  link.setAttribute('download', `Jyoti_Mandal_${safeFileLabel}_Vargani_${festivalYear}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
    'देणगीदार नाव,देणगी रक्कम,जमा,येणे,Status',
  ];

  let totalPromised = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  donors.forEach((d) => {
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
      `"एकूण (${donors.length} देणगीदार)"`,
      totalPromised,
      totalPaid,
      totalRemaining,
      `"${totalPromised > 0 ? Math.round((totalPaid / totalPromised) * 100) : 100}% जमा"`,
    ].join(',')
  );

  // Spacing and e-Signatures in CSV
  lines.push('');
  lines.push('"श्री. गुरुराज (खजिनदार)","","कार्यवाह / सेक्रेटरी","","अध्यक्ष"');
  lines.push('"खजिनदार सही (e-Sign)","","कार्यवाह सही (e-Sign)","","अध्यक्ष सही (e-Sign)"');
  lines.push('"✓ ई-स्वाक्षरी प्रमाणित","","✓ ई-स्वाक्षरी प्रमाणित","","✓ ई-स्वाक्षरी प्रमाणित"');

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFileLabel =
    bookNo === 'all'
      ? 'All_Books'
      : `Book_${(numericBook || bookNo).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  link.setAttribute('download', `Jyoti_Mandal_${safeFileLabel}_Vargani_${festivalYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

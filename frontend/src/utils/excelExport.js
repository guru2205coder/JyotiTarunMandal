import * as XLSXStyle from 'xlsx-js-style';
import * as ff from 'fflate';

const XLSX = XLSXStyle.default || XLSXStyle;

/**
 * Export Book-Wise Report to native .xlsx format matching the user's exact specifications:
 * - A4 Paper Size (paperSize: 9)
 * - Horizontal Center on page printing (<printOptions horizontalCentered="1"/>)
 * - Festival Year beside Book Number at top: e.g. "बूक न. 1 (2026) वर्गणी"
 * - Sr No column added as Col A
 * - Header Row (Row 4): Height = 26
 *   - 'Sr No': Column Width = 8.00, Header Height = 26
 *   - 'देणगीदार नाव': Column Width = 29.33, Header Height = 26
 *   - 'देणगी रक्कम': Column Width = 11.56, Header Height = 26
 *   - 'जमा': Column Width = 11.30, Header Height = 26
 *   - 'येणे': Column Width = 11.30, Header Height = 26
 *   - 'Status': Column Width = 13.00, Header Height = 26
 * - Actual Data Rows: Height = 27
 * - Summary Block styled and formatted cleanly
 * - e-Signature section completely removed as requested
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
  // Year of festival placed beside book number at top
  const title2 = `${cleanBookLabel} (${festivalYear}) वर्गणी`;

  // Build rows array (6 columns: Sr No, देणगीदार नाव, देणगी रक्कम, जमा, येणे, Status)
  const rows = [
    [title1, '', '', '', '', ''], // Row 1 (index 0) - Title 1
    [title2, '', '', '', '', ''], // Row 2 (index 1) - Title 2
    ['', '', '', '', '', ''],     // Row 3 (index 2) - Blank Spacing
    ['Sr No', 'देणगीदार नाव', 'देणगी रक्कम', 'जमा', 'येणे', 'Status'], // Row 4 (index 3) - Header
  ];

  let totalPromised = 0;
  let totalPaid = 0;
  let totalRemaining = 0;

  donors.forEach((d, idx) => {
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
      idx + 1,
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
    `(${donors.length} देणगीदार)`,
    totalPromised,
    totalPaid,
    totalRemaining,
    totalPromised > 0 ? `${Math.round((totalPaid / totalPromised) * 100)}% जमा` : '१००% जमा',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Exact column widths as requested:
  // - Sr No: 8.00
  // - देणगीदार नाव: 29.33
  // - देणगी रक्कम: 11.56
  // - जमा: 11.30
  // - येणे: 11.30
  // - Status: 13.00
  ws['!cols'] = [
    { wch: 8.00, width: 8.00 },   // Col A: Sr No
    { wch: 29.33, width: 29.33 }, // Col B: देणगीदार नाव
    { wch: 11.56, width: 11.56 }, // Col C: देणगी रक्कम
    { wch: 11.30, width: 11.30 }, // Col D: जमा
    { wch: 11.30, width: 11.30 }, // Col E: येणे
    { wch: 13.00, width: 13.00 }, // Col F: Status
  ];

  // Exact row heights as requested:
  // - Header row height: 26
  // - Actual data rows height: 27
  const rowHeights = [
    { hpt: 28 }, // Row 1: Title 1
    { hpt: 24 }, // Row 2: Title 2
    { hpt: 10 }, // Row 3: Blank spacing
    { hpt: 26 }, // Row 4: Header row (Sr No, देणगीदार नाव, देणगी रक्कम, जमा, येणे, Status) - EXACT 26
  ];

  // Actual data rows: EXACT 27 height each
  donors.forEach(() => {
    rowHeights.push({ hpt: 27 });
  });

  // Summary row: EXACT 27 height
  rowHeights.push({ hpt: 27 });

  ws['!rows'] = rowHeights;

  // Merged ranges (6 columns: A to F)
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Title 1 (A1:F1)
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Title 2 (A2:F2)
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
  const colNames = ['A', 'B', 'C', 'D', 'E', 'F'];

  // 1. Title 1 Style (Merged A1:F1 - Bold, Centered)
  if (ws['A1']) {
    ws['A1'].s = {
      font: { name: 'Arial', sz: 16, bold: true, color: { rgb: '111827' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // 2. Title 2 Style (Merged A2:F2 - Bold, Centered)
  if (ws['A2']) {
    ws['A2'].s = {
      font: { name: 'Arial', sz: 13, bold: true, color: { rgb: '1F2937' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // 3. Table Header Style (Row 4: A4..F4) - Green #599E39 & White Bold, Centered
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

    // Col A: Sr No (Centered)
    const cellA = `A${rowNum}`;
    if (ws[cellA]) {
      ws[cellA].s = {
        font: { name: 'Arial', sz: 10, color: { rgb: '374151' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder,
      };
    }

    // Col B: देणगीदार नाव (Left-aligned, Bold 10.5pt)
    const cellB = `B${rowNum}`;
    if (ws[cellB]) {
      ws[cellB].s = {
        font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '111827' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      };
    }

    // Col C: देणगी रक्कम (Right-aligned, Bold)
    const cellC = `C${rowNum}`;
    if (ws[cellC]) {
      ws[cellC].s = {
        font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '1F2937' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder,
        numFmt: '#,##0',
      };
    }

    // Col D: जमा (Right-aligned, Bold Green #15803D)
    const cellD = `D${rowNum}`;
    if (ws[cellD]) {
      ws[cellD].s = {
        font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: '15803D' } },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: thinBorder,
        numFmt: '#,##0',
      };
    }

    // Col E: येणे (Right-aligned, Bold Amber #B45309 if > 0)
    const cellE = `E${rowNum}`;
    if (ws[cellE]) {
      ws[cellE].s = {
        font: { name: 'Arial', sz: 10.5, bold: true, color: { rgb: remaining > 0 ? 'B45309' : '6B7280' } },
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

  colNames.forEach((col) => {
    const cellRef = `${col}${totalRowNumber}`;
    if (ws[cellRef]) {
      let fontColor = '111827';
      let align = 'center';
      if (col === 'A') {
        fontColor = '111827';
        align = 'center';
      } else if (col === 'B') {
        fontColor = '111827';
        align = 'center';
      } else if (col === 'C') {
        fontColor = '1F2937';
        align = 'right';
      } else if (col === 'D') {
        fontColor = '15803D';
        align = 'right';
      } else if (col === 'E') {
        fontColor = 'B45309';
        align = 'right';
      } else if (col === 'F') {
        fontColor = '15803D';
        align = 'center';
      }

      ws[cellRef].s = {
        fill: { fgColor: { rgb: 'EDF7ED' } },
        font: { name: 'Arial', sz: 11, bold: true, color: { rgb: fontColor } },
        alignment: { horizontal: align, vertical: 'center' },
        border: totalBorders,
        numFmt: (col === 'C' || col === 'D' || col === 'E') ? '#,##0' : undefined,
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
  const title2 = `${cleanBookLabel} (${festivalYear}) वर्गणी`;

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
      `"(${donors.length} देणगीदार)"`,
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
  const safeFileLabel =
    bookNo === 'all'
      ? 'All_Books'
      : `Book_${(numericBook || bookNo).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  link.setAttribute('download', `Jyoti_Mandal_${safeFileLabel}_Vargani_${festivalYear}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const REPORTS_DIR = path.resolve(process.cwd(), 'uploads/reports');

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function normalize(value) {
  return value ?? '-';
}

function registerVietnameseFont(doc) {
  const candidates = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf'
  ];

  const fontPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (fontPath) {
    doc.font(fontPath);
  }
}

const TABLE_COLUMNS = [
  { key: 'stt', label: 'STT', width: 28 },
  { key: 'title', label: 'Tên công việc', width: 120 },
  { key: 'completed_date', label: 'Ngày hoàn thành', width: 68 },
  { key: 'priority', label: 'Ưu tiên', width: 58 },
  { key: 'status', label: 'Trạng thái', width: 70 },
  { key: 'category', label: 'Loại', width: 55 },
  { key: 'note', label: 'Ghi chú', width: 116 }
];

function drawTableHeader(doc, startX, startY) {
  let x = startX;
  const rowHeight = 24;

  doc.fontSize(9).fillColor('#ffffff');
  for (const col of TABLE_COLUMNS) {
    doc.rect(x, startY, col.width, rowHeight).fillAndStroke('#3b7f3f', '#2d6a31');
    doc.text(col.label, x + 4, startY + 7, {
      width: col.width - 8,
      align: 'left'
    });
    x += col.width;
  }

  doc.fillColor('#000000');
  return rowHeight;
}

function drawTableRow(doc, row, startX, startY) {
  const rowData = {
    stt: String(row.stt),
    title: normalize(row.title),
    completed_date: normalize(row.completed_date),
    priority: normalize(row.priority),
    status: normalize(row.status),
    category: normalize(row.category),
    note: normalize(row.note)
  };

  const heights = TABLE_COLUMNS.map((col) =>
    doc.heightOfString(rowData[col.key], {
      width: col.width - 8,
      align: 'left'
    })
  );

  const rowHeight = Math.max(22, Math.ceil(Math.max(...heights)) + 8);
  let x = startX;

  doc.fontSize(9).fillColor('#000000');
  for (const col of TABLE_COLUMNS) {
    doc.rect(x, startY, col.width, rowHeight).stroke('#d8e0e8');
    doc.text(rowData[col.key], x + 4, startY + 4, {
      width: col.width - 8,
      align: 'left'
    });
    x += col.width;
  }

  return rowHeight;
}

export function createPdfReport({ weekLabel, tasks, stats }) {
  ensureReportsDir();

  const filename = `weekly-report-${Date.now()}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);
    registerVietnameseFont(doc);

    doc.fontSize(16).text('Báo cáo công việc tuần', { align: 'center' });
    doc.moveDown(0.6);
    doc.fontSize(11).text(`Tuần: ${weekLabel}`);
    doc.text(`Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`);

    doc.moveDown();
    doc.fontSize(12).text('Tổng kết', { underline: true });
    doc.fontSize(10);
    doc.text(`Tổng công việc: ${stats.total}`);
    doc.text(`Trạng thái: Hoàn thành ${stats.done} | Đang làm ${stats.inProgress} | Tạm dừng ${stats.blocked} | Chưa làm ${stats.todo}`);
    doc.text(`Ưu tiên: Cao ${stats.high} | Trung bình ${stats.medium} | Thấp ${stats.low}`);

    doc.moveDown();
    doc.fontSize(12).text('Danh sách công việc', { underline: true });
    doc.moveDown(0.4);

    const startX = doc.page.margins.left;
    let cursorY = doc.y;

    cursorY += drawTableHeader(doc, startX, cursorY);

    for (let i = 0; i < tasks.length; i += 1) {
      const task = tasks[i];
      const row = {
        stt: i + 1,
        ...task
      };

      const estimatedHeight = Math.max(
        22,
        Math.ceil(
          doc.heightOfString(normalize(task.title), { width: TABLE_COLUMNS[1].width - 8 }) +
            doc.heightOfString(normalize(task.note), { width: TABLE_COLUMNS[6].width - 8 })
        ) + 8
      );

      const availableBottom = doc.page.height - doc.page.margins.bottom;
      if (cursorY + estimatedHeight > availableBottom) {
        doc.addPage();
        registerVietnameseFont(doc);
        cursorY = doc.page.margins.top;
        cursorY += drawTableHeader(doc, startX, cursorY);
      }

      cursorY += drawTableRow(doc, row, startX, cursorY);
    }

    doc.end();

    stream.on('finish', () => resolve({ filename, filepath }));
    stream.on('error', reject);
  });
}

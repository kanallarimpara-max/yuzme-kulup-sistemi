import regularUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import boldUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';

const toBase64 = async (url: string) => {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let text = '';
  for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
};

let fonts: Promise<[string, string]> | null = null;

async function newDoc(landscape = false) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  fonts ??= Promise.all([toBase64(regularUrl), toBase64(boldUrl)]);
  const [regular, bold] = await fonts;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait' });
  doc.addFileToVFS('DejaVu.ttf', regular);
  doc.addFileToVFS('DejaVu-Bold.ttf', bold);
  doc.addFont('DejaVu.ttf', 'DejaVu', 'normal');
  doc.addFont('DejaVu-Bold.ttf', 'DejaVu', 'bold');
  return { doc, autoTable };
}

export type ReceiptInfo = {
  clubName: string; receiptNo: string; studentName: string; parentName: string; lessonName: string; period: string;
  installmentText: string; dueDate: string; paidDate: string; method: string; amount: string; remaining: string; corrected?: string;
};

/** Taksit makbuzu: öğrenci, dönem, taksit ve ödenen tutar. */
export async function downloadReceiptPdf(fileName: string, r: ReceiptInfo) {
  const { doc, autoTable } = await newDoc();
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(16);
  doc.text(r.clubName, 14, 18);
  doc.setFontSize(12);
  doc.text('Taksit Ödeme Makbuzu', 14, 27);
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(9);
  doc.text(`Makbuz no: ${r.receiptNo}`, 14, 34);
  autoTable(doc, {
    startY: 40, theme: 'grid',
    body: [
      ['Öğrenci', r.studentName], ['Veli', r.parentName], ['Ders', r.lessonName], ['Dönem', r.period], ['Taksit', r.installmentText],
      ['Vade tarihi', r.dueDate], ['Ödeme tarihi', r.paidDate], ['Ödeme yöntemi', r.method], ['Ödenen tutar', r.amount], ['Kalan borç', r.remaining],
      ...(r.corrected ? [['Düzeltme', r.corrected]] : []),
    ],
    styles: { font: 'DejaVu', fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
  });
  const y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120) + 10;
  doc.setFontSize(8);
  doc.text('Bu belge kulübün tahsilat kaydından oluşturulmuştur, fatura yerine geçmez.', 14, y);
  doc.save(fileName);
}

/** Türkçe karakterleri doğru basan tablo PDF'i üretir ve indirir. */
export async function downloadTablePdf(fileName: string, title: string, subtitle: string, head: string[], body: string[][]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  fonts ??= Promise.all([toBase64(regularUrl), toBase64(boldUrl)]);
  const [regular, bold] = await fonts;
  const doc = new jsPDF({ orientation: head.length > 5 ? 'landscape' : 'portrait' });
  doc.addFileToVFS('DejaVu.ttf', regular);
  doc.addFileToVFS('DejaVu-Bold.ttf', bold);
  doc.addFont('DejaVu.ttf', 'DejaVu', 'normal');
  doc.addFont('DejaVu-Bold.ttf', 'DejaVu', 'bold');
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(15);
  doc.text(title, 14, 16);
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, 14, 23);
  autoTable(doc, {
    startY: 28, head: [head], body,
    styles: { font: 'DejaVu', fontSize: 9 },
    headStyles: { font: 'DejaVu', fontStyle: 'bold', fillColor: [14, 94, 122] },
  });
  doc.save(fileName);
}

export type MonthlyReportPdf = {
  clubName: string; studentName: string; monthName: string; lessonName: string; coachName: string;
  attendance: string[][]; results: string[][]; skills: string[][]; comments: string[][]; payment: string[][];
};

/** Veliye aylık rapor: her bölüm başlıklı ayrı tablo, boş bölüm kısa bir notla geçilir. */
export async function downloadMonthlyReportPdf(fileName: string, r: MonthlyReportPdf) {
  const { doc, autoTable } = await newDoc();
  doc.setFont('DejaVu', 'bold');
  doc.setFontSize(16);
  doc.text(r.clubName, 14, 18);
  doc.setFontSize(12);
  doc.text(`${r.monthName} aylık raporu`, 14, 27);
  doc.setFont('DejaVu', 'normal');
  doc.setFontSize(10);
  doc.text(`${r.studentName}${r.lessonName ? ` · ${r.lessonName}` : ''}${r.coachName ? ` · Antrenör: ${r.coachName}` : ''}`, 14, 34);
  let y = 42;
  const last = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  const section = (title: string, head: string[] | null, body: string[][], empty: string) => {
    if (y > 260) { doc.addPage(); y = 18; }
    doc.setFont('DejaVu', 'bold');
    doc.setFontSize(11);
    doc.text(title, 14, y);
    doc.setFont('DejaVu', 'normal');
    if (!body.length) {
      doc.setFontSize(9);
      doc.text(empty, 14, y + 6);
      y += 14;
      return;
    }
    autoTable(doc, {
      startY: y + 3, theme: 'grid', ...(head ? { head: [head] } : {}), body,
      styles: { font: 'DejaVu', fontSize: 9, cellPadding: 2.5 },
      headStyles: { font: 'DejaVu', fontStyle: 'bold', fillColor: [14, 94, 122] },
      ...(head ? {} : { columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } } }),
    });
    y = last() + 10;
  };
  section('Devam', null, r.attendance, 'Bu ay yoklama girilmedi.');
  section('Dereceler', ['Branş', 'Tür', 'Ayın en iyisi', 'Önceki en iyi', 'Fark'], r.results, 'Bu ay derece kaydı yok.');
  section('Beceri karnesi', null, r.skills, 'Antrenör henüz beceri işaretlemedi.');
  section('Antrenör yorumları', ['Tarih', 'Yorum'], r.comments, 'Bu ay antrenör yorumu yok.');
  section('Ödeme', null, r.payment, 'Ödeme planı yok.');
  doc.setFontSize(8);
  doc.text('Bu rapor kulübün uygulamadaki kayıtlarından oluşturulmuştur.', 14, Math.min(y, 285));
  doc.save(fileName);
}

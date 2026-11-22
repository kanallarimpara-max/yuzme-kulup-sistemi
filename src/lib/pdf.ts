import regularUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans.ttf?url';
import boldUrl from 'dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf?url';

const toBase64 = async (url: string) => {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let text = '';
  for (let i = 0; i < bytes.length; i += 32768) text += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(text);
};

let fonts: Promise<[string, string]> | null = null;

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

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_MM = 10;
const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;

async function captureElement(el: HTMLElement): Promise<HTMLCanvasElement> {
  return html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
}

function addCanvasToDoc(
  doc: jsPDF,
  canvas: HTMLCanvasElement,
  startY: number,
): number {
  const imgData = canvas.toDataURL('image/png');
  const imgWidthMm = CONTENT_WIDTH_MM;
  const imgHeightMm = (canvas.height / canvas.width) * imgWidthMm;

  let y = startY;
  const pageContentHeight = A4_HEIGHT_MM - MARGIN_MM * 2 - 8; // leave room for footer

  if (y + imgHeightMm <= pageContentHeight) {
    // Fits on current page
    doc.addImage(imgData, 'PNG', MARGIN_MM, y, imgWidthMm, imgHeightMm);
    return y + imgHeightMm + 4;
  }

  // Need to split across pages
  const pxPerMm = canvas.height / imgHeightMm;
  let srcY = 0;
  let remaining = imgHeightMm;

  while (remaining > 0) {
    const available = y === startY ? pageContentHeight - y : pageContentHeight;
    const sliceHeightMm = Math.min(remaining, available);
    const sliceHeightPx = sliceHeightMm * pxPerMm;

    // Create a slice canvas
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(sliceHeightPx);
    const ctx = sliceCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const sliceImg = sliceCanvas.toDataURL('image/png');
    doc.addImage(sliceImg, 'PNG', MARGIN_MM, y === startY ? y : MARGIN_MM, imgWidthMm, sliceHeightMm);

    srcY += sliceHeightPx;
    remaining -= sliceHeightMm;

    if (remaining > 0) {
      doc.addPage();
      y = MARGIN_MM;
    } else {
      y = (y === startY ? y : MARGIN_MM) + sliceHeightMm + 4;
    }
  }

  return y;
}

export async function exportProfilePdf(profileContainer: HTMLElement, authorName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Find sections to capture
  const summaryCard = profileContainer.querySelector('main > div:first-child') as HTMLElement;
  const tabContent = profileContainer.querySelector('main > div:last-child') as HTMLElement;
  const tabBar = profileContainer.querySelector('main > div:nth-child(2)') as HTMLElement;

  // Capture the profile summary card (includes narrative)
  let y = MARGIN_MM;
  if (summaryCard) {
    const canvas = await captureElement(summaryCard);
    y = addCanvasToDoc(doc, canvas, y);
  }

  // Capture the currently visible tab content
  if (tabContent) {
    if (y > A4_HEIGHT_MM - MARGIN_MM * 2 - 40) {
      doc.addPage();
      y = MARGIN_MM;
    }
    const canvas = await captureElement(tabContent);
    y = addCanvasToDoc(doc, canvas, y);
  }

  // Add footer to every page
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(
      `Data sourced from Google Scholar on ${timestamp}. ScholarFolio — scholarfolio.org`,
      MARGIN_MM,
      A4_HEIGHT_MM - 5,
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      A4_WIDTH_MM - MARGIN_MM - 20,
      A4_HEIGHT_MM - 5,
    );
  }

  const safeName = authorName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`ScholarFolio_${safeName}_${now.toISOString().slice(0, 10)}.pdf`);
}

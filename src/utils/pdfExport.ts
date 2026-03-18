import jsPDF from 'jspdf';
import type { Author } from '../types/scholar';

export function exportProfilePdf(data: Author) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPageBreak = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // --- Header ---
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.name, margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(data.affiliation, margin, y);
  y += 10;

  // --- Key Stats ---
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const stats = [
    `Citations: ${data.totalCitations.toLocaleString()}`,
    `h-index: ${data.hIndex}`,
    `Publications: ${data.publications.length}`,
    `g-index: ${data.metrics.gIndex}`,
    `i10-index: ${data.metrics.i10Index}`,
  ];
  doc.text(stats.join('   |   '), margin, y);
  y += 10;

  // --- Topics ---
  if (data.topics.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80);
    const topicNames = data.topics.map(t => typeof t.name === 'object' ? (t.name as any).title : t.name);
    const topicLine = topicNames.join('  ·  ');
    const topicLines = doc.splitTextToSize(topicLine, contentWidth);
    doc.text(topicLines, margin, y);
    y += topicLines.length * 4 + 4;
  }

  // --- Divider ---
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // --- Impact Metrics ---
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Impact Metrics', margin, y);
  y += 8;

  const metrics = [
    ['Total Citations', data.totalCitations.toLocaleString()],
    ['h-index', String(data.hIndex)],
    ['g-index', String(data.metrics.gIndex)],
    ['i10-index', String(data.metrics.i10Index)],
    ['h5-index (last 5 years)', String(data.metrics.h5Index)],
    ['Publications', String(data.metrics.totalPublications)],
    ['Publications / Year', data.metrics.publicationsPerYear],
    ['Citations / Paper', data.metrics.avgCitationsPerPaper.toFixed(1)],
    ['Citations / Year', data.metrics.avgCitationsPerYear.toFixed(1)],
    ['Citation Growth Rate', `${(data.metrics.citationGrowthRate * 100).toFixed(1)}%`],
    ['Impact Trend', data.metrics.impactTrend],
    ['Peak Year', `${data.metrics.peakCitationYear} (${data.metrics.peakCitations} citations)`],
    ['Citation Half-Life', `${data.metrics.citationHalfLife.toFixed(1)} years`],
    ['Age-normalized Rate', data.metrics.ageNormalizedRate.toFixed(1)],
  ];

  doc.setFontSize(9);
  for (const [label, value] of metrics) {
    checkPageBreak(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(value, margin + 70, y);
    y += 5;
  }
  y += 6;

  // --- Collaboration ---
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Collaboration', margin, y);
  y += 8;

  const collab = [
    ['Total Co-authors', String(data.metrics.totalCoAuthors)],
    ['Avg Authors / Paper', data.metrics.averageAuthors.toFixed(1)],
    ['Collaboration Rate', `${(data.metrics.collaborationScore * 100).toFixed(0)}%`],
    ['Solo Author Rate', `${(data.metrics.soloAuthorScore * 100).toFixed(0)}%`],
    ['Top Co-author', `${data.metrics.topCoAuthor} (${data.metrics.topCoAuthorPapers} papers)`],
  ];

  doc.setFontSize(9);
  for (const [label, value] of collab) {
    checkPageBreak(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(value, margin + 70, y);
    y += 5;
  }
  y += 8;

  // --- Top Publications ---
  checkPageBreak(20);
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Top Publications', margin, y);
  y += 8;

  const topPubs = [...data.publications]
    .sort((a, b) => b.citations - a.citations)
    .slice(0, 15);

  doc.setFontSize(8);
  for (const pub of topPubs) {
    checkPageBreak(14);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    const titleLines = doc.splitTextToSize(pub.title, contentWidth - 20);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const meta = `${pub.venue}${pub.year ? `, ${pub.year}` : ''} — ${pub.citations} citations`;
    doc.text(meta, margin, y);
    y += 5;
  }

  // --- Footer ---
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Add footer to every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(
      `Data sourced from Google Scholar on ${timestamp}. ScholarFolio — scholarfolio.org`,
      margin,
      285
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, 285);
  }

  // Save
  const safeName = data.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`ScholarFolio_${safeName}_${now.toISOString().slice(0, 10)}.pdf`);
}

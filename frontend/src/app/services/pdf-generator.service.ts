import { Injectable } from '@angular/core';
import { InvoiceData } from '../pages/ads/invoice-agent/invoice.models';

@Injectable({ providedIn: 'root' })
export class PdfGeneratorService {

  async generate(data: InvoiceData): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const W = 210;
    const MARGIN = 18;
    const COL2 = W / 2 + 5;
    let y = MARGIN;

    // ── Header bar ──────────────────────────────────────────────
    doc.setFillColor(72, 61, 139);
    doc.rect(0, 0, W, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', MARGIN, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`# ${data.invoiceNumber || 'INV-001'}`, W - MARGIN, 12, { align: 'right' });
    doc.text(`Issue: ${this.fmt(data.issueDate)}`, W - MARGIN, 18, { align: 'right' });
    doc.text(`Due:   ${this.fmt(data.dueDate)}`, W - MARGIN, 24, { align: 'right' });

    y = 38;

    // ── FROM / TO ────────────────────────────────────────────────
    doc.setTextColor(72, 61, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('FROM', MARGIN, y);
    doc.text('BILL TO', COL2, y);
    y += 4;

    doc.setDrawColor(200, 190, 230);
    doc.line(MARGIN, y, MARGIN + 72, y);
    doc.line(COL2, y, COL2 + 72, y);
    y += 5;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(data.freelancer.name || 'Freelancer Name', MARGIN, y);
    doc.text(data.client.name || 'Client Name', COL2, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);

    const freelancerLines = [
      data.freelancer.email,
      data.freelancer.phone,
      data.freelancer.address,
      data.freelancer.siret ? `SIRET: ${data.freelancer.siret}` : '',
    ].filter(Boolean);

    const clientLines = [
      data.client.company,
      data.client.email,
      data.client.address,
    ].filter(Boolean);

    const maxLines = Math.max(freelancerLines.length, clientLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (freelancerLines[i]) doc.text(freelancerLines[i], MARGIN, y);
      if (clientLines[i]) doc.text(clientLines[i], COL2, y);
      y += 5;
    }

    y += 4;

    // ── Project label ────────────────────────────────────────────
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 10, 2, 2, 'F');
    doc.setTextColor(72, 61, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Project: ${data.projectName || ''}`, MARGIN + 4, y + 6.5);
    y += 16;

    // ── Line items table ─────────────────────────────────────────
    autoTable(doc, {
      startY: y,
      head: [['Description', 'Qty', `Unit Price (${data.currency})`, `Total (${data.currency})`]],
      body: data.lineItems.map(it => [
        it.description,
        it.quantity,
        this.fmtMoney(it.unitPrice),
        this.fmtMoney(it.total),
      ]),
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [72, 61, 139], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 246, 255] },
      columnStyles: { 0: { cellWidth: 82 }, 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: MARGIN, right: MARGIN },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // ── Totals ───────────────────────────────────────────────────
    const totalsX = W - MARGIN - 80;
    const valueX = W - MARGIN;

    const drawTotalRow = (label: string, value: string, bold = false, highlight = false): void => {
      if (highlight) {
        doc.setFillColor(72, 61, 139);
        doc.rect(totalsX - 4, y - 4, 80 + 4, 10, 'F');
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(60, 60, 60);
      }
      doc.setFontSize(bold ? 10 : 9);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(label, totalsX, y);
      doc.text(value, valueX, y, { align: 'right' });
      y += 8;
    };

    drawTotalRow('Subtotal', `${this.fmtMoney(data.subtotal)} ${data.currency}`);
    drawTotalRow(`VAT (${data.taxRate}%)`, `${this.fmtMoney(data.taxAmount)} ${data.currency}`);
    drawTotalRow('TOTAL DUE', `${this.fmtMoney(data.total)} ${data.currency}`, true, true);

    y += 8;

    // ── Professional intro ───────────────────────────────────────
    if (data.professionalIntro) {
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const lines = doc.splitTextToSize(data.professionalIntro, W - MARGIN * 2);
      doc.text(lines, MARGIN, y);
      y += lines.length * 5 + 4;
    }

    // ── Notes ────────────────────────────────────────────────────
    if (data.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      const noteLines = doc.splitTextToSize(`Note: ${data.notes}`, W - MARGIN * 2);
      doc.text(noteLines, MARGIN, y);
      y += noteLines.length * 5 + 4;
    }

    // ── Payment terms footer ─────────────────────────────────────
    const pageH = 297;
    doc.setFillColor(245, 243, 255);
    doc.rect(0, pageH - 22, W, 22, 'F');
    doc.setTextColor(72, 61, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const terms = doc.splitTextToSize(data.paymentTerms || 'Payment due within 30 days.', W - MARGIN * 2);
    doc.text(terms, MARGIN, pageH - 14);

    doc.save(`${data.invoiceNumber || 'Invoice'}.pdf`);
  }

  private fmt(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB');
  }

  private fmtMoney(val: number): string {
    return (val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

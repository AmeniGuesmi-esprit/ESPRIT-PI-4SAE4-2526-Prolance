import { Injectable } from '@angular/core';

export interface BadgeData {
  participantNom:    string;
  participantPrenom: string;
  participantRole:   string;
  domaine:           string;
  eventTitle:        string;
  location:          string;
  registrationDate:  string;
  inscriptionId:     number;
  photoBase64?:      string;
}

export type BadgeFormat = 'png' | 'jpg' | 'pdf';

@Injectable({ providedIn: 'root' })
export class BadgeGeneratorService {

  private readonly LOGO_B64 = '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';

  // ═══════════════════════════════════════════════════════════
  //  GENERATE  —  dessine le badge et renvoie le canvas
  // ═══════════════════════════════════════════════════════════
  async generate(data: BadgeData): Promise<HTMLCanvasElement> {
    const W = 600, H = 850;
    const canvas  = document.createElement('canvas');
    canvas.width  = W; canvas.height = H;
    const ctx     = canvas.getContext('2d')!;

    const loadImg = (src: string): Promise<HTMLImageElement> =>
      new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = () => rej();
        i.src = src;
      });

    const rr = (x: number, y: number, w: number, h: number, r: number,
                fill?: string, stroke?: string, lw = 1) => {
      ctx.beginPath();
      ctx.moveTo(x+r, y);
      ctx.lineTo(x+w-r, y);   ctx.quadraticCurveTo(x+w, y,   x+w, y+r);
      ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
      ctx.lineTo(x+r, y+h);   ctx.quadraticCurveTo(x,   y+h, x,   y+h-r);
      ctx.lineTo(x, y+r);     ctx.quadraticCurveTo(x,   y,   x+r, y);
      ctx.closePath();
      if (fill)   { ctx.fillStyle   = fill;   ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };

    const fmtDate = (iso: string) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('fr-FR') + '  ' +
             d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const CARD     = '#161c3c';
    const ACCENT1  = '#00d2b4';
    const ACCENT2  = '#8250ff';
    const GOLD     = '#ffc83c';
    const WHITE    = '#ffffff';
    const GREY     = '#8c9bbe';
    const DARKLINE = '#232d5a';

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0d22');
    bg.addColorStop(1, '#141935');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glowCircle = (cx: number, cy: number, r: number, c1: string, c2: string) => {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    };
    glowCircle(520, 90,  180, 'rgba(130,80,255,0.18)',  'rgba(0,0,0,0)');
    glowCircle(60,  720, 150, 'rgba(0,210,180,0.14)',   'rgba(0,0,0,0)');
    glowCircle(560, 620, 100, 'rgba(255,200,60,0.10)',  'rgba(0,0,0,0)');

    const stripe = ctx.createLinearGradient(0, 0, 0, H);
    stripe.addColorStop(0, ACCENT1);
    stripe.addColorStop(1, ACCENT2);
    ctx.fillStyle = stripe;
    ctx.fillRect(0, 0, 8, H);

    rr(20, 20, W-40, 95, 16, CARD, DARKLINE);

    try {
     const logo = await loadImg('assets/img/prolance.png');
      const lh = 58;
      const lw = Math.floor(logo.width * lh / logo.height);
      ctx.drawImage(logo, 0, 0, logo.width, logo.height, 38, 20 + (95 - lh) / 2, lw, lh);
    } catch {
      ctx.font = 'bold 26px Arial'; ctx.fillStyle = WHITE;
      ctx.fillText('PROLANCE', 42, 74);
    }

    ctx.font = '10px Arial'; ctx.fillStyle = GREY;
    ctx.fillText('BADGE OFFICIEL', W - 148, 52);
    ctx.font = 'bold 13px Arial'; ctx.fillStyle = WHITE;
    ctx.fillText('ÉVÉNEMENT 2026', W - 148, 70);
    ctx.beginPath(); ctx.arc(W - 160, 65, 5, 0, Math.PI * 2);
    ctx.fillStyle = ACCENT1; ctx.fill();

    const sep = ctx.createLinearGradient(20, 0, W - 20, 0);
    sep.addColorStop(0, ACCENT1); sep.addColorStop(1, ACCENT2);
    ctx.strokeStyle = sep; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(20, 115); ctx.lineTo(W - 20, 115); ctx.stroke();

    const PS = 200, PX = W / 2 - PS / 2, PY = 130;

    rr(PX-10, PY-10, PS+20, PS+20, 24, undefined, 'rgba(130,80,255,0.55)', 2);
    rr(PX-16, PY-16, PS+32, PS+32, 28, undefined, 'rgba(0,210,180,0.25)', 1);
    rr(PX, PY, PS, PS, 16, CARD);

    if (data.photoBase64) {
      try {
        const pi = await loadImg(data.photoBase64);
        ctx.save();
        rr(PX, PY, PS, PS, 16); ctx.clip();
        const ratio = pi.width / pi.height;
        let dw = PS, dh = PS / ratio;
        if (dh < PS) { dh = PS; dw = PS * ratio; }
        ctx.drawImage(pi, PX + (PS - dw) / 2, PY + (PS - dh) / 2, dw, dh);
        ctx.restore();
      } catch {}
    } else {
      ctx.fillStyle = 'rgba(40,55,120,1)';
      ctx.beginPath(); ctx.arc(PX + PS/2, PY + PS/2 - 38, 45, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(PX + PS/2, PY + PS/2 + 58, 75, Math.PI, 0);     ctx.fill();
    }

    [[PX-14, PY-14],[PX+PS+2, PY-14],[PX-14, PY+PS+2],[PX+PS+2, PY+PS+2]]
      .forEach(([cx, cy]) => { ctx.fillStyle = GOLD; ctx.fillRect(cx, cy, 12, 12); });

    ctx.font = '10px Arial'; ctx.fillStyle = 'rgba(140,155,190,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('[ PHOTO DU PARTICIPANT ]', W / 2, PY + PS + 18);
    ctx.textAlign = 'left';

    const NY = PY + PS + 38;
    rr(30, NY, W - 60, 76, 14, CARD, DARKLINE);

    ctx.font = 'bold 36px Arial'; ctx.fillStyle = WHITE; ctx.textAlign = 'center';
    ctx.fillText(`${data.participantPrenom} ${data.participantNom}`, W / 2, NY + 40);

    const roleStr = (data.participantRole || 'PARTICIPANT').toUpperCase();
    ctx.font = 'bold 12px Arial';
    const roleW = ctx.measureText(roleStr).width + 28;
    rr(W/2 - roleW/2, NY + 48, roleW, 22, 11, ACCENT1);
    ctx.fillStyle = '#0a0d22'; ctx.fillText(roleStr, W / 2, NY + 63);
    ctx.textAlign = 'left';

    const IY  = NY + 86;
    const GAP = 12;
    const CW  = (W - 60 - GAP) / 2;

    const drawCard = (x: number, y: number, w: number, letter: string,
                      label: string, value: string, accent: string) => {
      rr(x, y, w, 64, 12, CARD, DARKLINE);
      rr(x, y, 4, 64, 2, accent);
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x + 26, y + 20, 14, 0, Math.PI * 2);
      ctx.fillStyle = accent + '22'; ctx.fill(); ctx.stroke();
      ctx.font = 'bold 13px Arial'; ctx.fillStyle = accent;
      ctx.textAlign = 'center'; ctx.fillText(letter, x + 26, y + 25); ctx.textAlign = 'left';
      ctx.font = '10px Arial'; ctx.fillStyle = GREY; ctx.fillText(label, x + 48, y + 16);
      ctx.font = 'bold 14px Arial'; ctx.fillStyle = WHITE; ctx.fillText(value, x + 48, y + 36);
    };

    drawCard(30,          IY,      CW, '📅', 'DATE',     fmtDate(data.registrationDate), ACCENT1);
    drawCard(30 + CW+GAP, IY,      CW, '📍', 'LIEU',     data.location  || '—',          ACCENT2);
    drawCard(30,          IY + 76, CW, '🏷',  'DOMAINE',  data.domaine   || '—',           GOLD);
    drawCard(30 + CW+GAP, IY + 76, CW, '🎫', 'ID BADGE',
             '#INS-' + String(data.inscriptionId).padStart(5, '0'), '#dc6464');

    const EY = IY + 76 + 64 + 16;
    rr(30, EY, W - 60, 50, 12, '#19234f', DARKLINE);
    const evg = ctx.createLinearGradient(30, 0, 220, 0);
    evg.addColorStop(0, ACCENT2 + '55'); evg.addColorStop(1, 'transparent');
    ctx.fillStyle = evg; ctx.fillRect(30, EY, 190, 50);
    ctx.font = '10px Arial'; ctx.fillStyle = GREY; ctx.fillText('ÉVÉNEMENT', 50, EY + 16);
    ctx.font = 'bold 15px Arial'; ctx.fillStyle = WHITE;
    ctx.fillText(data.eventTitle || '—', 50, EY + 36);
    ctx.font = '20px serif'; ctx.fillText('🏆', W - 70, EY + 32);

    const FY = EY + 66;
    const fl  = ctx.createLinearGradient(20, 0, W - 20, 0);
    fl.addColorStop(0, ACCENT1); fl.addColorStop(1, ACCENT2);
    ctx.strokeStyle = fl; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(20, FY); ctx.lineTo(W - 20, FY); ctx.stroke();
    ctx.font = '10px Arial'; ctx.fillStyle = GREY; ctx.textAlign = 'center';
    ctx.fillText('prolance.tn  •  contact@prolance.tn  •  Tunis, Tunisia', W/2, FY + 18);
    ctx.font = 'bold 10px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('© 2026 PROLANCE PLATFORM  —  Tous droits réservés', W/2, FY + 34);
    ctx.textAlign = 'left';

    const border = ctx.createLinearGradient(0, 0, 0, H);
    border.addColorStop(0, ACCENT1); border.addColorStop(1, ACCENT2);
    ctx.strokeStyle = border; ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    return canvas;
  }

  // ═══════════════════════════════════════════════════════════
  //  ✅ NOUVELLE MÉTHODE — retourne le badge en base64 PNG
  //  Appelée par admin-event.component.ts → sendEmail()
  //  pour générer l'image avant upload sur imgbb puis EmailJS
  // ═══════════════════════════════════════════════════════════
  async generateBadgeAsBase64(data: BadgeData): Promise<string> {
    const canvas = await this.generate(data);
    return canvas.toDataURL('image/png');
    // Retourne une string de type :
    // "data:image/png;base64,iVBORw0KGgo..."
  }

  // ═══════════════════════════════════════════════════════════
  //  DOWNLOAD  —  PNG / JPG / PDF  (0 dépendance externe)
  // ═══════════════════════════════════════════════════════════
  async downloadBadge(data: BadgeData, format: BadgeFormat = 'png'): Promise<void> {
    const canvas = await this.generate(data);
    const base   = `badge-${data.participantPrenom}-${data.participantNom}-${data.inscriptionId}`;

    switch (format) {
      case 'png': return this.saveAsBlob(canvas, 'image/png',  1.0,  `${base}.png`);
      case 'jpg': return this.saveAsBlob(canvas, 'image/jpeg', 0.95, `${base}.jpg`);
      case 'pdf': return this.saveAsPdf(canvas, base);
    }
  }

  // ── PNG / JPG ──────────────────────────────────────────────
  private saveAsBlob(canvas: HTMLCanvasElement, mime: string,
                     quality: number, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('toBlob failed')); return; }
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url; a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve();
      }, mime, quality);
    });
  }

  // ── PDF  (canvas → image → PDF minimal, ZÉRO dépendance) ──
  private async saveAsPdf(canvas: HTMLCanvasElement, base: string): Promise<void> {
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    const A4_W = 595.28, A4_H = 841.89;
    const ratio = canvas.height / canvas.width;
    const imgW  = A4_W - 40;
    const imgH  = imgW * ratio;
    const imgX  = 20;
    const imgY  = (A4_H - imgH) / 2;

    const b64   = imgData.split(',')[1];
    const bytes = atob(b64);
    const len   = bytes.length;
    const buf   = new Uint8Array(len);
    for (let i = 0; i < len; i++) buf[i] = bytes.charCodeAt(i);

    const objects: Uint8Array[] = [];
    const offsets: number[] = [];
    let pos = 0;

    const addObj = (id: number, content: string) => {
      offsets[id] = pos;
      const chunk = new TextEncoder().encode(`${id} 0 obj\n${content}\nendobj\n`);
      objects.push(chunk);
      pos += chunk.length;
    };

    const header = new TextEncoder().encode('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
    pos += header.length;

    addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    addObj(2, `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);

    const mediaBox = `[0 0 ${A4_W.toFixed(2)} ${A4_H.toFixed(2)}]`;
    addObj(3, `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} /Contents 5 0 R /Resources << /XObject << /Im1 4 0 R >> >> >>`);

    const imgDict =
      `<< /Type /XObject /Subtype /Image ` +
      `/Width ${canvas.width} /Height ${canvas.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
      `/Filter /DCTDecode /Length ${buf.length} >>`;
    offsets[4] = pos;
    const obj4Header = new TextEncoder().encode(`4 0 obj\n${imgDict}\nstream\n`);
    const obj4Footer = new TextEncoder().encode(`\nendstream\nendobj\n`);
    objects.push(obj4Header); pos += obj4Header.length;
    objects.push(buf);        pos += buf.length;
    objects.push(obj4Footer); pos += obj4Footer.length;

    const cm =
      `q\n` +
      `${imgW.toFixed(2)} 0 0 ${imgH.toFixed(2)} ${imgX.toFixed(2)} ${imgY.toFixed(2)} cm\n` +
      `/Im1 Do\n` +
      `Q`;
    const streamBytes = new TextEncoder().encode(cm);
    const obj5Header  = new TextEncoder().encode(
      `5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
    const obj5Footer  = new TextEncoder().encode(`\nendstream\nendobj\n`);
    offsets[5] = pos;
    objects.push(obj5Header); pos += obj5Header.length;
    objects.push(streamBytes); pos += streamBytes.length;
    objects.push(obj5Footer);  pos += obj5Footer.length;

    const xrefOffset = pos;
    const xrefEntries = [
      '0000000000 65535 f \n',
      ...offsets.slice(1).map(o => `${String(o).padStart(10,'0')} 00000 n \n`)
    ].join('');
    const xref = new TextEncoder().encode(
      `xref\n0 ${offsets.length}\n${xrefEntries}` +
      `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF`
    );

    const total   = header.length + objects.reduce((s,o) => s + o.length, 0) + xref.length;
    const pdfBuf  = new Uint8Array(total);
    let offset    = 0;
    const write   = (arr: Uint8Array) => { pdfBuf.set(arr, offset); offset += arr.length; };

    write(header);
    objects.forEach(write);
    write(xref);

    const blob = new Blob([pdfBuf], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url; a.download = `${base}.pdf`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
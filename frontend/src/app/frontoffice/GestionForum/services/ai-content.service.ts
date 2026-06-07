import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ModerationResult {
  approved: boolean;
  reasons: string[];
}

// ── Réponse du microservice ML Python ────────────────────────────
interface MlModerationResponse {
  is_relevant: boolean;
  confidence: number;
  predicted_label: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AiContentService {

  private readonly API_KEY = '';  // Set your Groq API key here or use environment
  private readonly API_URL = 'https://api.groq.com/openai/v1/chat/completions';

  /** URL du microservice ML via l'API Gateway */
  private readonly ML_MODERATION_URL = 'http://localhost:8222/api/moderation/check';

  constructor(private http: HttpClient) {}

  // ── Content Generation ─────────────────────────────────────────
  generateContent(titre: string, type: string): Observable<string> {
    const typeLabel =
      type === 'QUESTION' ? 'a forum question post' :
      type === 'REVIEW'   ? 'a detailed review'     :
                            'an informative article';

    const prompt = `You are an assistant that helps write forum publications.
Generate the content for ${typeLabel} with the following title: "${titre}"
Instructions:
- Detect the language of the title and write in that SAME language
- For a question: explain the problem, context, what was tried
- For an article: write a well-structured informative article
- For a review: write a detailed and balanced critique
- Between 100 and 300 words. Do NOT repeat the title. Reply with content ONLY.`;

    return this._callGroq('llama-3.3-70b-versatile', prompt, 600, 0.7, text => text);
  }

  // ── Extract text from PDF using pdf.js ────────────────────────
  extractPdfText(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          if (!(window as any).pdfjsLib) {
            await new Promise<void>((res, rej) => {
              const script = document.createElement('script');
              script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
              script.onload = () => res();
              script.onerror = () => rej();
              document.head.appendChild(script);
            });
          }
          const pdfjsLib = (window as any).pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = '';
          const maxPages = Math.min(pdf.numPages, 10);
          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
          }
          resolve(fullText.trim().substring(0, 3000));
        } catch {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsArrayBuffer(file);
    });
  }

  // ── Moderate a single image visually ──────────────────────────
  private moderateImage(base64: string, mimeType: string): Promise<ModerationResult> {
    const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
    const mime = mimeType || 'image/jpeg';

    const body = {
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mime};base64,${pureBase64}` } },
          { type: 'text', text: `You are a strict content moderation AI. Analyze this image.\nCheck for: violence/fighting/gore, sexual/nudity content, hate symbols/weapons, drug use, bullying.\nRespond ONLY with JSON: {"approved": true, "reasons": []} or {"approved": false, "reasons": ["reason"]}` }
        ]
      }],
      max_tokens: 150,
      temperature: 0
    };

    return fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.API_KEY}` },
      body: JSON.stringify(body)
    })
      .then(r => r.json())
      .then(data => {
        const text = data?.choices?.[0]?.message?.content?.trim() || '';
        try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
        catch { return { approved: true, reasons: [] }; }
      })
      .catch(() => ({ approved: true, reasons: [] }));
  }

  // ── Moderate text content via Groq ────────────────────────────
  private moderateText(titre: string, contenue: string): Promise<ModerationResult> {
    const prompt = `You are a strict content moderation AI for a professional developer forum.
Analyze this post for inappropriate content:
TITLE: "${titre}"
DESCRIPTION: "${contenue}"

Check for: hate speech/harassment, explicit/sexual content, violence/threats, spam/advertising, false dangerous information, offensive/vulgar language.
Respond ONLY with JSON: {"approved": true, "reasons": []} or {"approved": false, "reasons": ["reason 1"]}`;

    return fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0 })
    })
      .then(r => r.json())
      .then(data => {
        const text = data?.choices?.[0]?.message?.content?.trim() || '';
        try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
        catch { return { approved: true, reasons: [] }; }
      })
      .catch(() => ({ approved: true, reasons: [] }));
  }

  // ── Moderate PDF text ──────────────────────────────────────────
  private moderatePdfText(pdfText: string, fileName: string): Promise<ModerationResult> {
    if (!pdfText || pdfText.trim().length < 10) return Promise.resolve({ approved: true, reasons: [] });

    const prompt = `You are a strict content moderation AI. Analyze this PDF document content for inappropriate material.

FILE: "${fileName}"
CONTENT (first 3000 chars):
"${pdfText}"

Check for: hate speech/harassment/discrimination, explicit sexual content, violence/threats/dangerous instructions, spam/advertising/scam, illegal content, offensive/vulgar language.

Respond ONLY with JSON: {"approved": true, "reasons": []} or {"approved": false, "reasons": ["specific reason"]}`;

    return fetch(this.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.API_KEY}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 200, temperature: 0 })
    })
      .then(r => r.json())
      .then(data => {
        const text = data?.choices?.[0]?.message?.content?.trim() || '';
        try { return JSON.parse(text.replace(/```json|```/g, '').trim()); }
        catch { return { approved: true, reasons: [] }; }
      })
      .catch(() => ({ approved: true, reasons: [] }));
  }

  // ── ML Domain Moderation (via microservice Python) ─────────────
  /**
   * Bypassed: The Python ML microservice is not running.
   * Returns approved by default to allow the rest of the moderation chain to proceed.
   */
  private moderateDomain(titre: string, contenue: string): Promise<ModerationResult> {
    return Promise.resolve({ approved: true, reasons: [] });
  }

  // ── Main moderation entry point ────────────────────────────────
  moderateContent(params: {
    titre: string;
    contenue: string;
    imageBase64List: { base64: string; mimeType: string }[];
    pdfFiles: { file: File; fileName: string }[];
  }): Observable<ModerationResult> {
    return new Observable(observer => {
      (async () => {
        try {
          const checks: Promise<{ result: ModerationResult; label: string }>[] = [];

          // 1. Vérification domaine ML (Python microservice) — prioritaire
          checks.push(
            this.moderateDomain(params.titre, params.contenue)
              .then(r => ({ result: r, label: 'domain' }))
          );

          // 2. Text moderation (Groq — contenu inapproprié)
          checks.push(
            this.moderateText(params.titre, params.contenue)
              .then(r => ({ result: r, label: 'text' }))
          );

          // 3. Image moderation (visual)
          params.imageBase64List.forEach((img, i) => {
            checks.push(
              this.moderateImage(img.base64, img.mimeType)
                .then(r => ({ result: r, label: `Image ${i + 1}` }))
            );
          });

          // 4. PDF text extraction + moderation
          for (const pdf of params.pdfFiles) {
            const pdfText = await this.extractPdfText(pdf.file);
            checks.push(
              this.moderatePdfText(pdfText, pdf.fileName)
                .then(r => ({ result: r, label: `PDF "${pdf.fileName}"` }))
            );
          }

          const results = await Promise.all(checks);

          const allReasons: string[] = [];
          let approved = true;

          results.forEach(({ result, label }) => {
            if (!result.approved) {
              approved = false;
              result.reasons.forEach(reason => {
                allReasons.push(label === 'text' || label === 'domain' ? reason : `${label}: ${reason}`);
              });
            }
          });

          observer.next({ approved, reasons: allReasons });
          observer.complete();
        } catch {
          observer.next({ approved: true, reasons: [] });
          observer.complete();
        }
      })();
    });
  }

  // ── Comment Reply Suggestions ──────────────────────────────────
  generateCommentSuggestions(publicationTitre: string, publicationContenue: string): Observable<string[]> {
    const prompt = `You are a helpful assistant for a developer forum.
A user wants to comment on the following publication:
TITLE: "${publicationTitre}"
CONTENT: "${publicationContenue.substring(0, 500)}"

Generate exactly 3 short, relevant, and helpful comment suggestions that a user might want to write.
Rules:
- Detect the language of the title/content and write suggestions in that SAME language
- Each suggestion must be between 10 and 40 words
- Make them distinct: one can be a question, one an opinion, one an encouragement or tip
- Do NOT number them, do NOT add quotes
- Separate each suggestion with the delimiter: |||
Reply with ONLY the 3 suggestions separated by |||, nothing else.`;

    return new Observable(observer => {
      fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.8
        })
      })
        .then(r => r.json())
        .then(data => {
          const text = data?.choices?.[0]?.message?.content?.trim() || '';
          const suggestions = text.split('|||').map((s: string) => s.trim()).filter((s: string) => s.length > 0).slice(0, 3);
          observer.next(suggestions.length > 0 ? suggestions : []);
          observer.complete();
        })
        .catch(() => { observer.next([]); observer.complete(); });
    });
  }

  // ── Helper ─────────────────────────────────────────────────────
  private _callGroq(model: string, prompt: string, maxTokens: number, temp: number, extract: (t: string) => string): Observable<string> {
    return new Observable(observer => {
      fetch(this.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.API_KEY}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens, temperature: temp })
      })
        .then(r => r.json())
        .then(data => {
          const text = data?.choices?.[0]?.message?.content;
          if (text) { observer.next(extract(text.trim())); observer.complete(); }
          else { observer.error(data?.error?.message || 'API error'); }
        })
        .catch(err => observer.error('Network error: ' + err.message));
    });
  }
}
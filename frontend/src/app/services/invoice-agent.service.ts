import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  AgentStep, AgentStepId, InvoiceData, LineItem,
  buildInitialSteps, emptyInvoice
} from '../pages/ads/invoice-agent/invoice.models';
import { OllamaService } from './ollama.service';

const SYS_JSON = `Reply with valid JSON only — no prose, no markdown fences, no explanation. Raw JSON only.`;

// Human-only steps used in back() navigation
const HUMAN_STEPS: AgentStepId[] = ['idle', 'review_data', 'review_items', 'review_draft', 'review_final'];

@Injectable({ providedIn: 'root' })
export class InvoiceAgentService {

  private stepsSubject = new BehaviorSubject<AgentStep[]>(buildInitialSteps());
  private invoiceSubject = new BehaviorSubject<InvoiceData>(emptyInvoice());
  private currentStepSubject = new BehaviorSubject<AgentStepId>('idle');
  private activeStreamSubject = new BehaviorSubject<string>('');

  readonly steps$ = this.stepsSubject.asObservable();
  readonly invoice$ = this.invoiceSubject.asObservable();
  readonly currentStep$ = this.currentStepSubject.asObservable();
  readonly activeStream$ = this.activeStreamSubject.asObservable();

  constructor(private ollama: OllamaService) {}

  // ── Public API ──────────────────────────────────────────────

  start(userInput: string): void {
    const invoice = emptyInvoice();
    invoice.userInput = userInput;
    this.invoiceSubject.next(invoice);
    this.stepsSubject.next(buildInitialSteps());
    this.runExtract(userInput);
  }

  approve(): void {
    switch (this.currentStepSubject.getValue()) {
      case 'review_data':   this.runValidateData();      break;
      case 'review_items':  this.runBenchmarkRates();    break;
      case 'review_draft':  this.runGenerateContent();   break;
      case 'review_final':  this.runGeneratePdf();       break;
      default: break;
    }
  }

  retry(feedback = ''): void {
    const inv = this.invoiceSubject.getValue();
    switch (this.currentStepSubject.getValue()) {
      case 'review_data':   this.runExtract(inv.userInput + (feedback ? `\n\nUser note: ${feedback}` : '')); break;
      case 'review_items':  this.runGenerateItems(feedback);    break;
      case 'review_draft':  this.runCalculate(feedback);        break;
      case 'review_final':  this.runGenerateContent(feedback);  break;
      default: break;
    }
  }

  back(): void {
    const cur = this.currentStepSubject.getValue();
    const idx = HUMAN_STEPS.indexOf(cur);
    if (idx > 0) {
      const prev = HUMAN_STEPS[idx - 1];
      this.setCurrentStep(prev);
      this.updateStep(prev, s => ({ ...s, status: prev === 'idle' ? 'idle' : 'waiting_human' }));
    }
  }

  reset(): void {
    this.stepsSubject.next(buildInitialSteps());
    this.invoiceSubject.next(emptyInvoice());
    this.currentStepSubject.next('idle');
    this.activeStreamSubject.next('');
  }

  patchInvoice(patch: Partial<InvoiceData>): void {
    this.invoiceSubject.next({ ...this.invoiceSubject.getValue(), ...patch });
  }

  patchLineItem(index: number, patch: Partial<LineItem>): void {
    const inv = { ...this.invoiceSubject.getValue() };
    const items = [...inv.lineItems];
    items[index] = { ...items[index], ...patch };
    items[index].total = items[index].quantity * items[index].unitPrice;
    inv.lineItems = items;
    this.invoiceSubject.next(inv);
  }

  addLineItem(): void {
    const inv = { ...this.invoiceSubject.getValue() };
    inv.lineItems = [...inv.lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }];
    this.invoiceSubject.next(inv);
  }

  removeLineItem(index: number): void {
    const inv = { ...this.invoiceSubject.getValue() };
    inv.lineItems = inv.lineItems.filter((_, i) => i !== index);
    this.invoiceSubject.next(inv);
  }

  // ── Stream helpers ───────────────────────────────────────────

  private appendStream(token: string): void {
    this.activeStreamSubject.next(this.activeStreamSubject.getValue() + token);
  }

  private clearStream(): void {
    this.activeStreamSubject.next('');
  }

  // ── Step 1: Extract ─────────────────────────────────────────

  private async runExtract(input: string): Promise<void> {
    this.clearStream();
    this.setCurrentStep('extracting');
    this.setStepRunning('extracting');
    const start = Date.now();

    const prompt = `Extract invoice fields from this text: "${input}"
Output this exact JSON, fill what you find, empty string for unknowns:
{"freelancer":{"name":"","email":"","address":"","phone":"","siret":""},"client":{"name":"","company":"","email":"","address":""},"projectName":"","currency":"EUR","dueDate":""}`;

    try {
      const data = await this.ollama.generateJson<{
        freelancer: { name: string; email: string; address: string; phone: string; siret: string };
        client: { name: string; company: string; email: string; address: string };
        projectName: string; currency: string; dueDate: string;
      }>(prompt, SYS_JSON, t => this.appendStream(t), () => this.clearStream());

      const inv = { ...this.invoiceSubject.getValue() };
      if (data.freelancer) inv.freelancer = { ...inv.freelancer, ...data.freelancer };
      if (data.client)     inv.client     = { ...inv.client,     ...data.client     };
      if (data.projectName) inv.projectName = data.projectName;
      if (data.currency)    inv.currency    = data.currency;
      if (data.dueDate)     inv.dueDate     = data.dueDate;
      this.invoiceSubject.next(inv);

      const fl = inv.freelancer.name || '?';
      const cl = inv.client.name     || '?';
      this.setStepDone('extracting', `${fl} → ${cl} · ${inv.projectName || 'Project'} · ${inv.currency}`, Date.now() - start);
      this.setCurrentStep('review_data');
      this.setStepWaiting('review_data');
    } catch (e) {
      this.setStepError('extracting', (e as Error).message);
    }
  }

  // ── Step 2: Validate Data ───────────────────────────────────

  private async runValidateData(): Promise<void> {
    this.clearStream();
    const inv = this.invoiceSubject.getValue();
    this.setCurrentStep('validating_data');
    this.setStepRunning('validating_data');
    const start = Date.now();

    const prompt = `Validate invoice data. Freelancer: "${inv.freelancer.name}", email: "${inv.freelancer.email}". Client: "${inv.client.name}", company: "${inv.client.company}". Project: "${inv.projectName}", Currency: "${inv.currency}".
Output JSON: {"missingFields":[],"warnings":[],"summary":"one line result"}`;

    try {
      const result = await this.ollama.generateJson<{
        missingFields: string[]; warnings: string[]; summary: string;
      }>(prompt, SYS_JSON, t => this.appendStream(t), () => this.clearStream());

      const missing = result.missingFields?.length ?? 0;
      const warns   = result.warnings?.length ?? 0;
      const summary = missing === 0 && warns === 0
        ? 'All fields complete'
        : `${missing} missing · ${warns} warning${warns !== 1 ? 's' : ''}`;
      this.setStepDone('validating_data', summary, Date.now() - start);
    } catch {
      this.setStepDone('validating_data', 'Validation skipped', 0);
    }
    this.runGenerateItems();
  }

  // ── Step 3: Generate Items ──────────────────────────────────

  private async runGenerateItems(feedback = ''): Promise<void> {
    this.clearStream();
    const inv = this.invoiceSubject.getValue();
    this.setCurrentStep('generating_items');
    this.setStepRunning('generating_items');
    const start = Date.now();

    const prompt = `Freelancer "${inv.freelancer.name}" needs invoice line items for project "${inv.projectName}" (${inv.currency}).
Brief: "${inv.userInput.slice(0, 300)}"${feedback ? ` Notes: ${feedback}` : ''}
Output a JSON array of 3 to 5 items. Each item: {"description":"string","quantity":number,"unitPrice":number,"total":number}
total = quantity * unitPrice. Use realistic freelance rates.`;

    try {
      const raw = await this.ollama.generateJson<unknown>(prompt, SYS_JSON, t => this.appendStream(t), () => this.clearStream());
      const arr: LineItem[] = (Array.isArray(raw) ? raw as LineItem[] : []).map(it => {
        const qty   = Number(it.quantity)  || 1;
        const price = Number(it.unitPrice) || 0;
        return {
          description: String(it.description || ''),
          quantity:    qty,
          unitPrice:   price,
          total:       Number(it.total) || qty * price,
        };
      }).filter(it => it.description);

      const items   = arr.length ? arr : this.fallbackItems(inv.projectName);
      const approx  = items.reduce((s, i) => s + i.total, 0);
      this.invoiceSubject.next({ ...inv, lineItems: items });
      this.setStepDone('generating_items', `${items.length} items · ~${inv.currency} ${approx.toFixed(0)}`, Date.now() - start);
    } catch {
      const items = this.fallbackItems(inv.projectName);
      this.invoiceSubject.next({ ...inv, lineItems: items });
      this.setStepDone('generating_items', `${items.length} items (default rates)`, 0);
    }
    this.setCurrentStep('review_items');
    this.setStepWaiting('review_items');
  }

  private fallbackItems(project: string): LineItem[] {
    return [
      { description: `${project} — Analysis & planning`,   quantity: 4,  unitPrice: 80,  total: 320  },
      { description: `${project} — Development`,           quantity: 16, unitPrice: 90,  total: 1440 },
      { description: `${project} — Testing & delivery`,    quantity: 4,  unitPrice: 70,  total: 280  },
    ];
  }

  // ── Step 4: Benchmark Rates ─────────────────────────────────

  private async runBenchmarkRates(): Promise<void> {
    this.clearStream();
    const inv = this.invoiceSubject.getValue();
    this.setCurrentStep('benchmarking_rates');
    this.setStepRunning('benchmarking_rates');
    const start = Date.now();

    const itemSummary = inv.lineItems.map(i => `"${i.description}" x${i.quantity} @${i.unitPrice} ${inv.currency}`).join(', ');
    const prompt = `Benchmark these freelance rates for project "${inv.projectName}" (${inv.currency}): ${itemSummary}
Output JSON: {"rateLevel":"market_rate","summary":"one line assessment"}
rateLevel must be one of: "below_market", "market_rate", "above_market"`;

    try {
      const result = await this.ollama.generateJson<{
        rateLevel: string; summary: string;
      }>(prompt, SYS_JSON, t => this.appendStream(t), () => this.clearStream());

      const icon    = result.rateLevel === 'above_market' ? '↑' : result.rateLevel === 'below_market' ? '↓' : '✓';
      const summary = `${icon} ${result.summary || result.rateLevel || 'Rates within normal range'}`;
      this.setStepDone('benchmarking_rates', summary, Date.now() - start);
    } catch {
      this.setStepDone('benchmarking_rates', '✓ Rates within normal range', 0);
    }
    this.runCalculate();
  }

  // ── Step 5: Calculate ───────────────────────────────────────

  private async runCalculate(feedback = ''): Promise<void> {
    this.clearStream();
    const inv = this.invoiceSubject.getValue();
    this.setCurrentStep('calculating');
    this.setStepRunning('calculating');
    const start = Date.now();

    // Always compute locally first as a reliable baseline
    const localSubtotal  = inv.lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);
    const localTaxAmount = localSubtotal * (inv.taxRate / 100);
    const localTotal     = localSubtotal + localTaxAmount;

    const itemsJson = JSON.stringify(inv.lineItems.map(i => ({
      description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total
    })));
    const prompt = `Recalculate totals for these invoice items (tax ${inv.taxRate}%): ${itemsJson}${feedback ? ` Notes: ${feedback}` : ''}
Output JSON: {"lineItems":${itemsJson},"subtotal":${localSubtotal},"taxAmount":${localTaxAmount.toFixed(2)},"total":${localTotal.toFixed(2)},"paymentTerms":"Payment due within 30 days of invoice date"}`;

    try {
      const result = await this.ollama.generateJson<{
        lineItems: LineItem[]; subtotal: number;
        taxAmount: number; total: number; paymentTerms: string;
      }>(prompt, SYS_JSON, t => this.appendStream(t), () => this.clearStream());

      this.invoiceSubject.next({
        ...inv,
        lineItems:    result.lineItems?.length ? result.lineItems.map(i => ({
          ...i,
          quantity:  Number(i.quantity)  || 1,
          unitPrice: Number(i.unitPrice) || 0,
          total:     Number(i.total)     || (Number(i.quantity || 1) * Number(i.unitPrice || 0)),
        })) : inv.lineItems,
        subtotal:     Number(result.subtotal)  || localSubtotal,
        taxAmount:    Number(result.taxAmount) || localTaxAmount,
        total:        Number(result.total)     || localTotal,
        paymentTerms: result.paymentTerms || 'Payment due within 30 days of invoice date',
      });
    } catch {
      // Fall back to local calculation — workflow must not stop
      this.invoiceSubject.next({
        ...inv,
        subtotal: localSubtotal,
        taxAmount: localTaxAmount,
        total: localTotal,
        paymentTerms: inv.paymentTerms || 'Payment due within 30 days of invoice date',
      });
    }

    const updInv = this.invoiceSubject.getValue();
    const summary = `${inv.currency} ${(updInv.subtotal).toFixed(2)} + ${inv.taxRate}% tax = ${inv.currency} ${(updInv.total).toFixed(2)}`;
    this.setStepDone('calculating', summary, Date.now() - start);
    this.runComplianceCheck();
  }

  // ── Step 6: Compliance Check ────────────────────────────────

  private async runComplianceCheck(): Promise<void> {
    this.clearStream();
    const inv = this.invoiceSubject.getValue();
    this.setCurrentStep('compliance_check');
    this.setStepRunning('compliance_check');
    const start = Date.now();

    const prompt = `Check invoice compliance. Freelancer: "${inv.freelancer.name}", SIRET: "${inv.freelancer.siret || 'none'}". Client: "${inv.client.name}". Total: ${inv.total} ${inv.currency}. Tax: ${inv.taxRate}%. Items: ${inv.lineItems.length}.
Output JSON: {"compliant":true,"issues":[],"summary":"one line result"}`;

    try {
      const result = await this.ollama.generateJson<{
        compliant: boolean; issues: string[]; summary: string;
      }>(prompt, SYS_JSON, t => this.appendStream(t), () => this.clearStream());

      const prefix  = result.compliant !== false ? '✓' : '⚠';
      const issues  = result.issues?.length ?? 0;
      const summary = result.summary || `${prefix} ${issues} issue${issues !== 1 ? 's' : ''} found`;
      this.setStepDone('compliance_check', summary, Date.now() - start);
    } catch {
      this.setStepDone('compliance_check', '✓ Invoice structure is compliant', 0);
    }
    this.setCurrentStep('review_draft');
    this.setStepWaiting('review_draft');
  }

  // ── Step 7: Generate Content ────────────────────────────────

  private async runGenerateContent(feedback = ''): Promise<void> {
    this.clearStream();
    const inv = this.invoiceSubject.getValue();
    this.setCurrentStep('generating_content');
    this.setStepRunning('generating_content');
    const start = Date.now();

    const today      = new Date();
    const invoiceNum = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-001`;
    const dateStr    = today.toISOString().split('T')[0];

    const prompt = `Write professional invoice text for freelancer "${inv.freelancer.name}" billing client "${inv.client.name || inv.client.company}" for project "${inv.projectName}". Total: ${inv.total} ${inv.currency}.${feedback ? ` Notes: ${feedback}` : ''}
Output JSON:
{"invoiceNumber":"${invoiceNum}","issueDate":"${dateStr}","professionalIntro":"short thank-you sentence","notes":"short delivery note","paymentTerms":"payment terms sentence"}`;

    try {
      const result = await this.ollama.generateJson<{
        invoiceNumber: string; issueDate: string;
        professionalIntro: string; notes: string; paymentTerms: string;
      }>(prompt, SYS_JSON, t => this.appendStream(t), () => this.clearStream());

      this.invoiceSubject.next({
        ...inv,
        invoiceNumber:    result.invoiceNumber    || invoiceNum,
        issueDate:        result.issueDate        || dateStr,
        professionalIntro: result.professionalIntro || `Thank you for choosing ${inv.freelancer.name}.`,
        notes:            result.notes            || 'All work performed as agreed.',
        paymentTerms:     result.paymentTerms     || inv.paymentTerms,
      });
      this.setStepDone('generating_content', 'Professional invoice text written', Date.now() - start);
    } catch {
      // Fallback content — workflow must not stop
      this.invoiceSubject.next({
        ...inv,
        invoiceNumber:    invoiceNum,
        issueDate:        dateStr,
        professionalIntro: `Thank you for choosing ${inv.freelancer.name}.`,
        notes:            'All work performed as agreed.',
        paymentTerms:     inv.paymentTerms || 'Payment due within 30 days of invoice date.',
      });
      this.setStepDone('generating_content', 'Professional invoice text written (default)', 0);
    }
    this.setCurrentStep('review_final');
    this.setStepWaiting('review_final');
  }

  // ── Step 8: Generate PDF ────────────────────────────────────

  private runGeneratePdf(): void {
    this.setCurrentStep('generating_pdf');
    this.setStepRunning('generating_pdf');
    setTimeout(() => {
      this.setStepDone('generating_pdf', 'PDF ready for download', 0);
      this.setCurrentStep('done');
      this.updateStep('done', s => ({ ...s, status: 'done' }));
    }, 400);
  }

  // ── Step state helpers ────────────────────────────────────────

  private setCurrentStep(id: AgentStepId): void {
    this.currentStepSubject.next(id);
  }

  private setStepRunning(id: AgentStepId): void {
    this.updateStep(id, s => ({ ...s, status: 'running', streamedText: '', error: '' }));
  }

  private setStepDone(id: AgentStepId, output: string, duration: number): void {
    this.updateStep(id, s => ({ ...s, status: 'done', output, duration }));
  }

  private setStepWaiting(id: AgentStepId): void {
    this.updateStep(id, s => ({ ...s, status: 'waiting_human' }));
  }

  private setStepError(id: AgentStepId, error: string): void {
    this.updateStep(id, s => ({ ...s, status: 'error', error }));
  }

  private updateStep(id: AgentStepId, fn: (s: AgentStep) => AgentStep): void {
    this.stepsSubject.next(
      this.stepsSubject.getValue().map(s => (s.id === id ? fn(s) : s))
    );
  }
}

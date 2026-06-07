import { Component, OnInit, OnDestroy, AfterViewChecked, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { InvoiceAgentService } from '../../../services/invoice-agent.service';
import { PdfGeneratorService } from '../../../services/pdf-generator.service';
import { AgentStep, AgentStepId, InvoiceData, LineItem } from './invoice.models';

const STEP_THOUGHTS: Partial<Record<AgentStepId, string[]>> = {
  extracting: [
    'Reading your project description…',
    'Scanning for freelancer details…',
    'Identifying client information…',
    'Detecting project name and scope…',
    'Mapping contact fields and addresses…',
    'Determining invoice currency…',
    'Finalising data extraction…',
  ],
  validating_data: [
    'Reviewing extracted fields for completeness…',
    'Checking email and address formats…',
    'Verifying SIRET / tax ID presence…',
    'Flagging any missing required fields…',
    'Running data quality checks…',
  ],
  generating_items: [
    'Analysing project scope and complexity…',
    'Researching market rates for this type of work…',
    'Breaking down work into billable units…',
    'Estimating time allocation per task…',
    'Crafting line items with competitive pricing…',
    'Reviewing item descriptions for clarity…',
  ],
  benchmarking_rates: [
    'Comparing rates to industry benchmarks…',
    'Checking consistency across line items…',
    'Cross-referencing local freelance market data…',
    'Evaluating value-to-price ratio…',
    'Assessing rate competitiveness…',
  ],
  calculating: [
    'Summing up all line item totals…',
    'Applying the selected tax rate…',
    'Verifying subtotal accuracy…',
    'Computing final invoice amount…',
    'Generating standard payment terms…',
  ],
  compliance_check: [
    'Checking mandatory invoice fields…',
    'Verifying tax information is present…',
    'Reviewing payment terms for legal clarity…',
    'Cross-checking against billing regulations…',
    'Ensuring SIRET / registration number is valid…',
    'Finalising compliance report…',
  ],
  generating_content: [
    'Crafting a professional opening statement…',
    'Writing courtesy notes for the client…',
    'Drafting clear payment terms and conditions…',
    'Assigning a unique invoice reference number…',
    'Polishing the tone and language…',
    'Finalising document metadata…',
  ],
  generating_pdf: [
    'Building document structure…',
    'Rendering party information…',
    'Laying out the line items table…',
    'Applying professional styling…',
    'Computing final page layout…',
    'Saving PDF to your downloads…',
  ],
};

const THOUGHT_INTERVAL_MS = 1600;

@Component({
  selector: 'app-invoice-agent',
  templateUrl: './invoice-agent.component.html',
  styleUrls: ['./invoice-agent.component.scss']
})
export class InvoiceAgentComponent implements OnInit, OnDestroy, AfterViewChecked {

  steps: AgentStep[] = [];
  invoice: InvoiceData | null = null;
  currentStep: AgentStepId = 'idle';
  isExpanded = false;
  userInput = '';
  retryFeedback = '';
  showRetryInput = false;
  isGeneratingPdf = false;
  expandedStepId: AgentStepId | null = null;

  @ViewChild('streamBox') private streamBoxRef?: ElementRef<HTMLElement>;

  displayedThoughts: string[] = [];
  activeStream = '';
  private shouldScrollStream = false;
  private thoughtTimerId: ReturnType<typeof setTimeout> | null = null;
  private thoughtIdx = 0;
  private activeThoughts: string[] = [];

  private subs = new Subscription();

  constructor(
    private agent: InvoiceAgentService,
    private pdfGen: PdfGeneratorService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subs.add(this.agent.steps$.subscribe(s => { this.steps = s; this.cdr.markForCheck(); }));
    this.subs.add(this.agent.invoice$.subscribe(i => { this.invoice = i; this.cdr.markForCheck(); }));
    this.subs.add(this.agent.activeStream$.subscribe(s => { this.activeStream = s; this.shouldScrollStream = true; this.cdr.markForCheck(); }));
    this.subs.add(this.agent.currentStep$.subscribe(s => {
      const wasRunning = this.isAgentRunningStep(this.currentStep);
      this.currentStep = s;
      const nowRunning = this.isAgentRunningStep(s);
      if (!wasRunning && nowRunning) this.startThoughts(s);
      if (wasRunning && !nowRunning) this.stopThoughts();
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.stopThoughts();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollStream && this.streamBoxRef) {
      const el = this.streamBoxRef.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollStream = false;
    }
  }

  private isAgentRunningStep(step: AgentStepId): boolean {
    return ['extracting', 'validating_data', 'generating_items', 'benchmarking_rates',
            'calculating', 'compliance_check', 'generating_content', 'generating_pdf'].includes(step);
  }

  private startThoughts(step: AgentStepId): void {
    this.stopThoughts();
    this.displayedThoughts = [];
    this.activeStream = '';
    this.thoughtIdx = 0;
    this.activeThoughts = STEP_THOUGHTS[step] ?? ['Processing…'];
    this.scheduleNextThought();
  }

  private scheduleNextThought(): void {
    if (this.thoughtIdx >= this.activeThoughts.length) return;
    this.thoughtTimerId = setTimeout(() => {
      this.displayedThoughts = [...this.displayedThoughts, this.activeThoughts[this.thoughtIdx]];
      this.thoughtIdx++;
      this.cdr.markForCheck();
      this.scheduleNextThought();
    }, this.thoughtIdx === 0 ? 300 : THOUGHT_INTERVAL_MS);
  }

  private stopThoughts(): void {
    if (this.thoughtTimerId !== null) {
      clearTimeout(this.thoughtTimerId);
      this.thoughtTimerId = null;
    }
  }

  // ── UI helpers ───────────────────────────────────────────────

  get isIdle(): boolean { return this.currentStep === 'idle'; }
  get isDone(): boolean { return this.currentStep === 'done'; }

  get isAgentRunning(): boolean {
    return this.isAgentRunningStep(this.currentStep);
  }

  get isHumanTurn(): boolean {
    return ['review_data', 'review_items', 'review_draft', 'review_final'].includes(this.currentStep);
  }

  getStepClass(step: AgentStep): string {
    const classes: string[] = [step.type];
    if (step.status === 'running') classes.push('running');
    if (step.status === 'done') classes.push('done');
    if (step.status === 'waiting_human') classes.push('waiting');
    if (step.status === 'error') classes.push('error');
    if (step.id === this.currentStep) classes.push('active');
    return classes.join(' ');
  }

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
    if (!this.isExpanded) {
      this.agent.reset();
      this.userInput = '';
      this.stopThoughts();
      this.displayedThoughts = [];
      this.activeStream = '';
    }
  }

  toggleStepOutput(id: AgentStepId): void {
    this.expandedStepId = this.expandedStepId === id ? null : id;
  }

  // ── Agent controls ───────────────────────────────────────────

  startAgent(): void {
    if (!this.userInput.trim()) return;
    this.agent.start(this.userInput.trim());
  }

  approve(): void {
    this.agent.approve();
    this.showRetryInput = false;
    this.retryFeedback = '';
  }

  retry(): void {
    if (this.showRetryInput && this.retryFeedback.trim()) {
      this.agent.retry(this.retryFeedback.trim());
      this.showRetryInput = false;
      this.retryFeedback = '';
    } else {
      this.showRetryInput = !this.showRetryInput;
    }
  }

  back(): void {
    this.agent.back();
    this.showRetryInput = false;
  }

  async downloadPdf(): Promise<void> {
    if (!this.invoice) return;
    this.isGeneratingPdf = true;
    this.agent.approve();
    try {
      await this.pdfGen.generate(this.invoice);
    } finally {
      this.isGeneratingPdf = false;
      this.cdr.markForCheck();
    }
  }

  restartAgent(): void {
    this.agent.reset();
    this.userInput = '';
    this.stopThoughts();
    this.displayedThoughts = [];
    this.activeStream = '';
    this.showRetryInput = false;
  }

  // ── Invoice patching ─────────────────────────────────────────

  patchFreelancer(field: string, value: string): void {
    if (!this.invoice) return;
    this.agent.patchInvoice({ freelancer: { ...this.invoice.freelancer, [field]: value } });
  }

  patchClient(field: string, value: string): void {
    if (!this.invoice) return;
    this.agent.patchInvoice({ client: { ...this.invoice.client, [field]: value } });
  }

  patchField(field: keyof InvoiceData, value: string): void {
    this.agent.patchInvoice({ [field]: value } as Partial<InvoiceData>);
  }

  patchLineItem(index: number, field: keyof LineItem, value: string): void {
    this.agent.patchLineItem(index, { [field]: field === 'description' ? value : Number(value) });
  }

  addLineItem(): void { this.agent.addLineItem(); }
  removeLineItem(i: number): void { this.agent.removeLineItem(i); }

  // ── Computed invoice values ──────────────────────────────────

  get computedSubtotal(): number {
    return (this.invoice?.lineItems || []).reduce((s, it) => s + it.total, 0);
  }

  get computedTaxAmount(): number {
    return this.computedSubtotal * ((this.invoice?.taxRate || 0) / 100);
  }

  get computedTotal(): number {
    return this.computedSubtotal + this.computedTaxAmount;
  }

  formatMoney(val: number): string {
    return (val || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  durationLabel(ms: number): string {
    if (!ms) return '';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  }

  trackByIndex(index: number): number { return index; }
}

export type AgentStepId =
  | 'idle'
  | 'extracting'
  | 'review_data'
  | 'validating_data'
  | 'generating_items'
  | 'review_items'
  | 'benchmarking_rates'
  | 'calculating'
  | 'compliance_check'
  | 'review_draft'
  | 'generating_content'
  | 'review_final'
  | 'generating_pdf'
  | 'done';

export type StepStatus = 'idle' | 'running' | 'waiting_human' | 'done' | 'error';
export type StepType = 'agent' | 'human';

export interface AgentStep {
  readonly id: AgentStepId;
  readonly label: string;
  readonly type: StepType;
  status: StepStatus;
  streamedText: string;
  output: string;
  duration: number;
  error: string;
}

export interface FreelancerInfo {
  name: string;
  email: string;
  address: string;
  phone: string;
  siret: string;
}

export interface ClientInfo {
  name: string;
  company: string;
  email: string;
  address: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceData {
  userInput: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  projectName: string;
  freelancer: FreelancerInfo;
  client: ClientInfo;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentTerms: string;
  professionalIntro: string;
  notes: string;
}

export const AGENT_STEPS_DEFINITION: ReadonlyArray<Pick<AgentStep, 'id' | 'label' | 'type'>> = [
  { id: 'idle',               label: 'Describe your invoice',        type: 'human' },
  { id: 'extracting',         label: 'Extract invoice data',          type: 'agent' },
  { id: 'review_data',        label: 'Review parties & project',     type: 'human' },
  { id: 'validating_data',    label: 'Validate data quality',         type: 'agent' },
  { id: 'generating_items',   label: 'Generate line items',           type: 'agent' },
  { id: 'review_items',       label: 'Review & edit items',           type: 'human' },
  { id: 'benchmarking_rates', label: 'Benchmark market rates',        type: 'agent' },
  { id: 'calculating',        label: 'Calculate totals & tax',        type: 'agent' },
  { id: 'compliance_check',   label: 'Compliance & legal check',      type: 'agent' },
  { id: 'review_draft',       label: 'Review invoice draft',          type: 'human' },
  { id: 'generating_content', label: 'Write professional content',    type: 'agent' },
  { id: 'review_final',       label: 'Final approval',                type: 'human' },
  { id: 'generating_pdf',     label: 'Generate PDF',                  type: 'agent' },
  { id: 'done',               label: 'Done',                          type: 'agent' },
];

export function buildInitialSteps(): AgentStep[] {
  return AGENT_STEPS_DEFINITION.map(s => ({
    ...s,
    status: 'idle' as StepStatus,
    streamedText: '',
    output: '',
    duration: 0,
    error: '',
  }));
}

export function emptyInvoice(): InvoiceData {
  return {
    userInput: '',
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
    currency: 'EUR',
    projectName: '',
    freelancer: { name: '', email: '', address: '', phone: '', siret: '' },
    client: { name: '', company: '', email: '', address: '' },
    lineItems: [],
    subtotal: 0,
    taxRate: 20,
    taxAmount: 0,
    total: 0,
    paymentTerms: '',
    professionalIntro: '',
    notes: '',
  };
}

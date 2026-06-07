import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-support-chat',
  template: `
    <button class="chat-fab" (click)="toggleChat()" [class.open]="isOpen" title="Account Support">
      <i class="material-icons">{{ isOpen ? 'close' : 'support_agent' }}</i>
    </button>

    <div class="chat-panel" [class.visible]="isOpen">
      <div class="chat-header">
        <div class="chat-header-left">
          <div class="chat-avatar">
            <i class="material-icons">smart_toy</i>
          </div>
          <div>
            <p class="chat-title">Account Assistant</p>
            <p class="chat-subtitle">Powered by AI</p>
          </div>
        </div>
        <button class="chat-close" (click)="toggleChat()">
          <i class="material-icons">close</i>
        </button>
      </div>

      <div class="chat-messages" #messagesContainer>
        <div *ngFor="let msg of messages"
             class="chat-message"
             [class.user-message]="msg.role === 'user'"
             [class.ai-message]="msg.role === 'ai'">
          <div class="msg-bubble">{{ msg.text }}</div>
          <span class="msg-time">{{ msg.timestamp | date:'HH:mm' }}</span>
        </div>

        <div class="chat-message ai-message" *ngIf="isTyping">
          <div class="msg-bubble typing-bubble">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      </div>

      <div class="quick-questions" *ngIf="messages.length <= 1">
        <button *ngFor="let q of quickQuestions" class="quick-btn" (click)="sendQuick(q)">
          {{ q }}
        </button>
      </div>

      <div class="chat-input-row">
        <input
          type="text"
          class="chat-input"
          [(ngModel)]="inputText"
          (keydown.enter)="send()"
          placeholder="Ask about your account…"
          [disabled]="isTyping" />
        <button class="chat-send" (click)="send()" [disabled]="isTyping || !inputText.trim()">
          <i class="material-icons">send</i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 2000;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: none;
      background: #7c3aed;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
      box-shadow: 0 4px 16px rgba(124,58,237,0.45);
    }
    .chat-fab:hover { background: #6d28d9; transform: scale(1.07); }
    .chat-fab.open  { background: #4b5563; }
    .chat-fab i { font-size: 1.4rem; }

    .chat-panel {
      position: fixed;
      bottom: 92px;
      right: 28px;
      z-index: 1999;
      width: 340px;
      max-height: 480px;
      background: #1e293b;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(16px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.22s ease, transform 0.22s ease;
    }
    .chat-panel.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: all;
    }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.9rem 1rem;
      background: rgba(124,58,237,0.15);
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .chat-header-left { display: flex; align-items: center; gap: 10px; }
    .chat-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: rgba(124,58,237,0.35);
      display: flex; align-items: center; justify-content: center;
    }
    .chat-avatar i { color: #c084fc; font-size: 1.1rem; }
    .chat-title  { font-size: 0.88rem; font-weight: 700; color: white; margin: 0; }
    .chat-subtitle { font-size: 0.7rem; color: rgba(255,255,255,0.45); margin: 0; }
    .chat-close {
      width: 28px; height: 28px; border: none; border-radius: 6px;
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .chat-close:hover { background: rgba(255,255,255,0.15); color: white; }
    .chat-close i { font-size: 1rem; }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 0.75rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.1) transparent;
    }

    .chat-message { display: flex; flex-direction: column; }
    .user-message { align-items: flex-end; }
    .ai-message   { align-items: flex-start; }

    .msg-bubble {
      max-width: 82%;
      padding: 0.5rem 0.8rem;
      border-radius: 12px;
      font-size: 0.82rem;
      line-height: 1.5;
    }
    .user-message .msg-bubble {
      background: rgba(124,58,237,0.6);
      color: white;
      border-bottom-right-radius: 4px;
    }
    .ai-message .msg-bubble {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.85);
      border-bottom-left-radius: 4px;
    }

    .msg-time { font-size: 0.65rem; color: rgba(255,255,255,0.3); margin-top: 3px; }

    .typing-bubble {
      display: flex; gap: 4px; align-items: center; padding: 0.55rem 0.8rem;
    }
    .dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(255,255,255,0.4);
      animation: bounce 1.2s infinite;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%,80%,100% { transform: translateY(0); }
      40%         { transform: translateY(-6px); }
    }

    .quick-questions {
      padding: 0 0.85rem 0.6rem;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      flex-shrink: 0;
    }
    .quick-btn {
      font-size: 0.72rem;
      padding: 0.28rem 0.65rem;
      border-radius: 20px;
      border: 1px solid rgba(124,58,237,0.35);
      background: rgba(124,58,237,0.08);
      color: #c084fc;
      cursor: pointer;
      transition: all 0.15s;
    }
    .quick-btn:hover {
      background: rgba(124,58,237,0.2);
      border-color: rgba(124,58,237,0.6);
      color: #e9d5ff;
    }

    .chat-input-row {
      display: flex;
      gap: 6px;
      padding: 0.65rem 0.85rem;
      border-top: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .chat-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.06);
      color: white;
      font-size: 0.82rem;
      font-family: inherit;
    }
    .chat-input::placeholder { color: rgba(255,255,255,0.3); }
    .chat-input:focus { outline: none; border-color: rgba(124,58,237,0.5); }
    .chat-input:disabled { opacity: 0.5; }

    .chat-send {
      width: 36px; height: 36px; border-radius: 8px; border: none;
      background: #7c3aed; color: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .chat-send:hover:not(:disabled) { background: #6d28d9; }
    .chat-send:disabled { opacity: 0.45; cursor: not-allowed; }
    .chat-send i { font-size: 1rem; }

    @media (max-width: 480px) {
      .chat-panel { width: calc(100vw - 24px); right: 12px; bottom: 80px; }
      .chat-fab   { right: 16px; bottom: 16px; }
    }
  `]
})
export class SupportChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesContainer') private msgContainer!: ElementRef;

  isOpen    = false;
  isTyping  = false;
  inputText = '';
  messages: ChatMessage[] = [];

  private readonly API = 'http://localhost:8222';
  private userId: number | null = null;
  private shouldScrollBottom = false;

  quickQuestions = [
    'Why is my account disabled?',
    'How do I change my password?',
    'How do I verify my email?',
    'What does timed out mean?',
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('sessionUser');
    if (stored) {
      try { this.userId = JSON.parse(stored).id; } catch {}
    }
    this.messages = [{
      role: 'ai',
      text: 'Hi! I\'m your account assistant. I can answer questions about your account, settings, and platform features.',
      timestamp: new Date()
    }];
  }

  ngOnDestroy(): void {}

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.shouldScrollBottom = true;
  }

  sendQuick(question: string): void {
    this.inputText = question;
    this.send();
  }

  send(): void {
    const text = this.inputText.trim();
    if (!text || this.isTyping || !this.userId) return;

    this.messages.push({ role: 'user', text, timestamp: new Date() });
    this.inputText          = '';
    this.isTyping           = true;
    this.shouldScrollBottom = true;

    this.http.post<{ answer: string }>(
      `${this.API}/users/${this.userId}/support-chat`,
      { question: text }
    ).subscribe({
      next: (res) => {
        this.messages.push({ role: 'ai', text: res.answer, timestamp: new Date() });
        this.isTyping           = false;
        this.shouldScrollBottom = true;
      },
      error: () => {
        this.messages.push({
          role: 'ai',
          text: 'Sorry, I\'m having trouble right now. Please try again in a moment.',
          timestamp: new Date()
        });
        this.isTyping           = false;
        this.shouldScrollBottom = true;
      }
    });
  }

  private scrollToBottom(): void {
    try {
      const el = this.msgContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
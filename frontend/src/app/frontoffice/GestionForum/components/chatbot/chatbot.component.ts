import { Component, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements AfterViewChecked {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  isOpen = false;
  inputText = '';
  loading = false;
  unreadCount = 0;

  private readonly GROQ_API_KEY = '';  // Set your Groq API key here or use environment

  private readonly SYSTEM_PROMPT = `You are the official AI assistant of Prolance, a collaborative platform dedicated to software development and UI/UX design.

Your role is to help users ONLY with topics related to:
- Software development (web, mobile, backend, frontend, APIs, databases, DevOps, version control, code review, best practices, frameworks, languages)
- UI/UX design (user experience, user interface, wireframing, prototyping, design systems, accessibility, Figma, usability, color theory, typography, responsive design)
- The Prolance platform itself (how to use the forum, publications, comments, reactions, account management, features)
- Collaboration and project management in a dev/design context
- Technical questions from forum posts on Prolance

If a user asks about anything OUTSIDE these domains (politics, sports, cooking, general knowledge, personal advice, entertainment, etc.), politely decline and redirect them. Example response for out-of-scope questions:
"Je suis l'assistant de Prolance et je suis spécialisé uniquement dans le développement logiciel et le design UI/UX. Je ne peux pas vous aider sur ce sujet, mais je serais ravi de répondre à vos questions techniques ou sur la plateforme Prolance !"

Always detect the language of the user's message and respond in the SAME language (French if they write in French, English if they write in English, etc.).

Be concise, helpful, and technically accurate.`;

  messages: Message[] = [
    {
      role: 'assistant',
      content: '👋 Bonjour ! Je suis l\'assistant IA de **Prolance**, spécialisé en **développement logiciel** et **UI/UX design**. Comment puis-je vous aider ?'
    }
  ];

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
      document.body.classList.add('chatbot-open');
    } else {
      document.body.classList.remove('chatbot-open');
    }
  }

  sendMessage(): void {
    const userText = this.inputText.trim();
    if (!userText || this.loading) { return; }

    this.messages.push({ role: 'user', content: userText });
    this.inputText = '';
    this.loading = true;

    const history = this.messages.map(function(m) {
      return { role: m.role, content: m.content };
    });

    const self = this;

    const requestBody = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: self.SYSTEM_PROMPT
        }
      ].concat(history),
      max_tokens: 500,
      temperature: 0.7
    });

    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + self.GROQ_API_KEY
      },
      body: requestBody
    })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      const reply = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content.trim()
        : 'Désolé, je n\'ai pas pu obtenir une réponse. Veuillez réessayer.';
      self.messages.push({ role: 'assistant', content: reply });
      self.loading = false;
      if (!self.isOpen) {
        self.unreadCount++;
      }
    })
    .catch(function() {
      self.messages.push({ role: 'assistant', content: 'Erreur réseau. Veuillez réessayer.' });
      self.loading = false;
    });
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch (e) {}
  }
}
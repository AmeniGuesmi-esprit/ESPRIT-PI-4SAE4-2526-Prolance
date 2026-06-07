import { Injectable } from '@angular/core';

const OLLAMA_BASE = 'http://localhost:11435';
const MODEL = 'phi3:mini';
const MAX_JSON_RETRIES = 3;

@Injectable({ providedIn: 'root' })
export class OllamaService {

  async generateStream(
    prompt: string,
    systemPrompt: string,
    onToken: (chunk: string) => void
  ): Promise<string> {
    const body = JSON.stringify({
      model: MODEL,
      prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
      stream: true,
      format: 'json',
      options: { temperature: 0.1, top_p: 0.9, num_ctx: 1024 },
    });

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const chunk = JSON.parse(line);
          if (chunk.response) {
            full += chunk.response;
            onToken(chunk.response);
          }
          if (chunk.done) return full;
        } catch { /* skip malformed line */ }
      }
    }
    return full;
  }

  async generateJson<T>(
    prompt: string,
    systemPrompt: string,
    onToken: (chunk: string) => void,
    onAttemptStart?: () => void
  ): Promise<T> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt < MAX_JSON_RETRIES; attempt++) {
      onAttemptStart?.();
      const retryNote = attempt > 0
        ? '\n\nONLY output a JSON object or array. Zero prose. Zero explanation. Zero markdown.'
        : '';
      const raw = await this.generateStream(prompt + retryNote, systemPrompt, onToken);
      try {
        const result = this.extractJson<T>(raw);
        return result;
      } catch (e) {
        lastError = e as Error;
      }
    }
    throw lastError;
  }

  private extractJson<T>(raw: string): T {
    // 1. Try every ```json ... ``` fence block (model may wrap despite format:json)
    const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = fenceRegex.exec(raw)) !== null) {
      const candidate = this.tryParseJsonBlock(m[1]);
      if (candidate !== null) return candidate as T;
    }

    // 2. Try scanning the raw text for the outermost valid JSON structure
    const fromText = this.tryParseJsonBlock(raw);
    if (fromText !== null) return fromText as T;

    throw new Error(`No valid JSON found. Raw (first 200): ${raw.slice(0, 200)}`);
  }

  private tryParseJsonBlock(text: string): unknown | null {
    text = text.trim();

    // Try array first ([ ... ])
    const bi = text.indexOf('[');
    const bj = text.lastIndexOf(']');
    if (bi !== -1 && bj > bi) {
      try { return JSON.parse(text.slice(bi, bj + 1)); } catch {}
    }

    // Try object ({ ... })
    const oi = text.indexOf('{');
    const oj = text.lastIndexOf('}');
    if (oi !== -1 && oj > oi) {
      try { return JSON.parse(text.slice(oi, oj + 1)); } catch {}
    }

    return null;
  }
}

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GeneratedProject {
  title: string;
  description: string;
  budget: number;
  category: string;
  startDate: string;
  endDate: string;
  tasks: GeneratedTask[];
}

export interface GeneratedTask {
  taskName: string;
  description: string;
  priority: string;
}

@Injectable({ providedIn: 'root' })
export class GrokService {

  // ✅ Clé gratuite sur https://console.groq.com → API Keys → Create API Key (gsk_...)
  private readonly API_KEY = '';  // Set your Groq API key here or use environment
  private readonly API_URL = 'https://api.groq.com/openai/v1/chat/completions';

  constructor() {}

  // ── Generate full project ───────────────────────────────────────
  generateProject(userPrompt: string): Observable<GeneratedProject> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + 7);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr   = endDate.toISOString().split('T')[0];

    const prompt = `Tu es un assistant expert en gestion de projets freelance sur Prolance.
Génère un projet complet en JSON valide UNIQUEMENT (sans markdown, sans backticks).
${userPrompt ? 'Thème : ' + userPrompt : 'Génère un projet freelance intéressant.'}
Structure JSON exacte :
{
  "title": "titre (5-100 chars)",
  "description": "description professionnelle (50-300 chars)",
  "budget": 5000,
  "category": "DEV",
  "startDate": "${startStr}",
  "endDate": "${endStr}",
  "tasks": [
    { "taskName": "nom", "description": "desc", "priority": "HIGH" }
  ]
}
category = "DEV" ou "DESIGN". priority = "LOW", "MEDIUM" ou "HIGH". Génère 4-6 tâches.
Réponds UNIQUEMENT avec le JSON.`;

    return this._call(prompt);
  }

  // ── Generate tasks only for an existing project ────────────────
  generateTasksForProject(projectContext: string, startDate: string, endDate: string): Observable<GeneratedTask[]> {
    const prompt = `Tu es un assistant expert en gestion de projets freelance.
${projectContext}
Génère une liste de tâches détaillées pour ce projet en JSON valide UNIQUEMENT (sans markdown, sans backticks).
Structure JSON exacte — un tableau de tâches :
[
  { "taskName": "nom de la tâche", "description": "description claire et précise", "priority": "HIGH" }
]
priority = "LOW", "MEDIUM" ou "HIGH".
Génère entre 5 et 8 tâches pertinentes et réalistes pour ce projet.
Réponds UNIQUEMENT avec le tableau JSON, rien d'autre.`;

    return new Observable(observer => {
      fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7
        })
      })
        .then(res => res.json())
        .then(data => {
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned) as GeneratedTask[];
            observer.next(parsed);
            observer.complete();
          } else if (data?.error) {
            observer.error(data.error.message || 'API error');
          } else {
            observer.error('Unexpected response');
          }
        })
        .catch(err => observer.error('Network error: ' + (err.message || err)));
    });
  }

  // ── Internal fetch helper ──────────────────────────────────────
  private _call(prompt: string): Observable<GeneratedProject> {
    return new Observable(observer => {
      fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7
        })
      })
        .then(res => res.json())
        .then(data => {
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            observer.next(JSON.parse(cleaned) as GeneratedProject);
            observer.complete();
          } else if (data?.error) {
            observer.error(data.error.message || 'API error');
          } else {
            observer.error('Unexpected response');
          }
        })
        .catch(err => observer.error('Network error: ' + (err.message || err)));
    });
  }
}
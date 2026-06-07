import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GeneratedActivityContent {
  description: string;
  requirements: string;
}

export interface GeneratedActivity {
  name: string;
  description: string;
  requirements: string;
}

@Injectable({ providedIn: 'root' })
export class GroqService {

  private readonly API_KEY = '';  // Set your Groq API key here or use environment
  private readonly API_URL = 'https://api.groq.com/openai/v1/chat/completions';

  constructor() {}

  // ── 1. Generate event description ───────────────────────
  generateEventDescription(title: string): Observable<string> {
    const prompt = `You are an expert assistant in professional event organization.
Generate a professional and engaging description in English for an event titled: "${title}".
The description must be between 80 and 150 words.
It must be clear, attractive, and contain no special symbols such as curly apostrophes or special dashes.
Respond ONLY with the description, without any introduction, title, or commentary.`;

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
          max_tokens: 150,
          temperature: 0.7
        })
      })
        .then(res => res.json())
        .then(data => {
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            const truncated = text.trim().substring(0, 2000);
            observer.next(truncated);
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

  // ── 2. Generate description + requirements for an activity ────────
  generateActivityDescription(activityName: string): Observable<GeneratedActivityContent> {
    const prompt = `You are an expert assistant in professional event organization.
For an activity titled: "${activityName}"
Generate valid JSON ONLY (no markdown, no backticks, no text before or after).
Use only simple characters without curly apostrophes or special symbols.
Exact JSON structure:
{
  "description": "activity description in English between 60 and 100 words",
  "requirements": "required prerequisites in English between 15 and 30 words"
}
Respond ONLY with the JSON.`;

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
          max_tokens: 400,
          temperature: 0.7
        })
      })
        .then(res => res.json())
        .then(data => {
          const text = data?.choices?.[0]?.message?.content;
          if (text) {
            const cleaned = text
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
            const parsed = JSON.parse(cleaned) as GeneratedActivityContent;
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

  // ── 3. Generate full activities for an event ────────────
  generateEventActivities(eventTitle: string): Observable<GeneratedActivity[]> {
    const prompt = `You are an expert assistant in professional event organization.
For an event titled: "${eventTitle}"
Generate a list of 3 relevant activities in valid JSON ONLY (no markdown, no backticks, no text before or after).
Use only simple characters without curly apostrophes or special symbols.
Exact JSON structure:
[
  {
    "name": "activity name in English, maximum 80 characters, letters and numbers only",
    "description": "description in English between 60 and 100 words",
    "requirements": "prerequisites in English between 15 and 30 words"
  }
]
Respond ONLY with the JSON array.`;

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
            const cleaned = text
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
            const parsed = JSON.parse(cleaned) as GeneratedActivity[];
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

  evaluateInscription(
  event: { title: string; description: string; activities?: any[]; capacity: number; currentParticipants?: number },
  inscription: { participantNom: string; participantPrenom: string; participantRole: string; domaine: string; message?: string }
): Observable<{ decision: 'ACCEPT' | 'REJECT'; reason: string }> {

  const activitiesText = event.activities?.length
    ? event.activities.map(a =>
        `- ${a.name}: ${a.description || ''}${a.requirements ? ` | Requirements: ${a.requirements}` : ''}`
      ).join('\n')
    : 'No activities listed';

  const spotsLeft = event.capacity - (event.currentParticipants || 0);

  const roleExpectations: { [key: string]: string } = {
    'EXPERT':      'Must demonstrate real domain expertise, professional background, and advanced technical skills. Vague enthusiasm without concrete skills is NOT sufficient.',
    'SPEAKER':     'Must have public speaking experience and recognized expertise to present at the event.',
    'ANIMATOR':    'Must have facilitation or workshop animation experience relevant to the event topic.',
    'PARTICIPANT': 'Should have basic interest and foundational knowledge in the event domain.',
    'VISITEUR':    'Open to anyone with a general interest in the topic.'
  };

  const roleExpectation = roleExpectations[inscription.participantRole] || 'Standard participant criteria apply.';

 const prompt = `You are a balanced but rigorous event registration evaluator.

EVENT DETAILS:
- Title: "${event.title}"
- Description: "${event.description}"
- Activities and their requirements:
${activitiesText}
- Capacity: ${event.capacity} total, ${spotsLeft} spots remaining

CANDIDATE:
- Name: ${inscription.participantPrenom} ${inscription.participantNom}
- Claimed Role: ${inscription.participantRole}
- Domain: ${inscription.domaine}
- Motivation message: "${inscription.message || 'No message provided'}"

ROLE EXPECTATION FOR "${inscription.participantRole}":
${roleExpectation}

EVALUATION METHODOLOGY — read the FULL message holistically:

STEP 1 — CAPACITY CHECK:
If spotsLeft <= 0 → REJECT immediately.

STEP 2 — DOMAIN ALIGNMENT:
Does the candidate's domain match the event topic and activities?
- Clear mismatch (e.g., DESIGN domain for a pure programming workshop) → REJECT.
- Good alignment → continue.

STEP 3 — ROLE vs MESSAGE QUALITY (holistic reading):
Evaluate the OVERALL message, not individual phrases.

For EXPERT / SPEAKER roles → ACCEPT if the message demonstrates AT LEAST 3 of:
  ✓ Mentions concrete years of experience or past projects
  ✓ Uses specific technical terminology relevant to the event
  ✓ Shows understanding of the event's activities or subject matter
  ✓ Explains how they will CONTRIBUTE (not just benefit)
  ✓ References real skills that match the activity requirements

→ REJECT only if the message is PREDOMINANTLY vague enthusiasm with NO concrete evidence of expertise.
   Do NOT reject because the message ends with an enthusiastic closing sentence — that is normal and acceptable.

For ANIMATOR roles → ACCEPT if message shows facilitation or teaching experience.

For PARTICIPANT / VISITEUR roles → ACCEPT if message shows genuine interest and basic domain familiarity.

STEP 4 — ACTIVITY REQUIREMENTS:
Can the candidate reasonably meet the prerequisites listed for the activities?
Cross-check the candidate's stated skills against each activity's requirements.

FINAL RULE: When in doubt between ACCEPT and REJECT for a well-documented candidate,
lean toward ACCEPT if concrete skills are clearly demonstrated.

Respond ONLY with this exact JSON (no markdown, no extra text):
{"decision":"ACCEPT","reason":"brief reason max 40 words"}
or  
{"decision":"REJECT","reason":"brief reason max 40 words"}`;

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
        max_tokens: 150,
        temperature: 0.1  // ← très bas pour des décisions cohérentes et strictes
      })
    })
      .then(res => res.json())
      .then(data => {
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleaned) as { decision: 'ACCEPT' | 'REJECT'; reason: string };
          observer.next(parsed);
          observer.complete();
        } else {
          observer.error(data?.error?.message || 'Unexpected response');
        }
      })
      .catch(err => observer.error('Network error: ' + (err.message || err)));
  });
}

generateRawText(prompt: string): Observable<string> {
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
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) {
          observer.next(text);
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
// src/app/services/face-auth.service.ts
import { Injectable } from '@angular/core';

declare const faceapi: any;

const MODEL_URL    = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const STORAGE_KEY  = 'prolance_face_descriptors_v2'; // new key — v1 was single-user
const MATCH_THRESH = 0.46;

// Shape stored in localStorage:
// { [email]: number[] }
type FaceStore = Record<string, number[]>;

@Injectable({ providedIn: 'root' })
export class FaceAuthService {

  private modelsLoaded = false;

  // ── Model loading ───────────────────────────────────────────────────────

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    this.modelsLoaded = true;
  }

  // ── Enrollment ──────────────────────────────────────────────────────────

  /**
   * Captures `sampleCount` face descriptors, averages them,
   * and saves the result linked to `email` in localStorage.
   */
  async enroll(
    video: HTMLVideoElement,
    email: string,
    sampleCount = 8,
    onProgress?: (n: number, total: number) => void
  ): Promise<void> {
    const descriptors: Float32Array[] = [];

    while (descriptors.length < sampleCount) {
      const det = await this.detect(video);
      if (det) {
        descriptors.push(det.descriptor);
        onProgress?.(descriptors.length, sampleCount);
      }
      await this.wait(350);
    }

    // Average all samples into one 128-D vector
    const avg = new Float32Array(128);
    for (const d of descriptors) {
      for (let i = 0; i < 128; i++) avg[i] += d[i] / sampleCount;
    }

    const store = this.loadStore();
    store[email] = Array.from(avg);
    this.saveStore(store);
  }

  // ── Verification ────────────────────────────────────────────────────────

  /**
   * Scans the video until a face matches any enrolled descriptor.
   * Returns the matched EMAIL on success, throws 'NO_ENROLLMENT' or 'NO_MATCH'.
   */
  async verify(
    video: HTMLVideoElement,
    maxAttempts = 30,
    onStatus?: (msg: string) => void
  ): Promise<string> {
    const store = this.loadStore();
    const entries = Object.entries(store);

    if (entries.length === 0) throw new Error('NO_ENROLLMENT');

    const enrolled: { email: string; descriptor: Float32Array }[] = entries.map(
      ([email, arr]) => ({ email, descriptor: new Float32Array(arr) })
    );

    let attempts = 0;
    while (attempts < maxAttempts) {
      const det = await this.detect(video);
      if (det) {
        attempts++;

        let bestEmail = '';
        let bestDist  = Infinity;

        for (const e of enrolled) {
          const dist = this.euclidean(det.descriptor, e.descriptor);
          if (dist < bestDist) {
            bestDist  = dist;
            bestEmail = e.email;
          }
        }

        onStatus?.(`Scanning… (distance: ${bestDist.toFixed(3)})`);

        if (bestDist < MATCH_THRESH) return bestEmail;
      } else {
        onStatus?.('No face detected — look at the camera');
      }
      await this.wait(300);
    }

    throw new Error('NO_MATCH');
  }

  // ── Face detection helper ───────────────────────────────────────────────

  async detect(video: HTMLVideoElement): Promise<any> {
    return faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();
  }

  // ── Storage helpers ─────────────────────────────────────────────────────

  hasEnrollment(): boolean {
    return Object.keys(this.loadStore()).length > 0;
  }

  hasEnrollmentForEmail(email: string): boolean {
    return !!this.loadStore()[email];
  }

  clearEnrollment(email?: string): void {
    if (!email) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const store = this.loadStore();
    delete store[email];
    this.saveStore(store);
  }

  private loadStore(): FaceStore {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private saveStore(store: FaceStore): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  // ── Math ────────────────────────────────────────────────────────────────

  private euclidean(a: Float32Array, b: Float32Array): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  // ── Camera helpers ──────────────────────────────────────────────────────

  async startCamera(video: HTMLVideoElement): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640 }
    });
    video.srcObject = stream;
    await new Promise<void>(r => video.addEventListener('loadeddata', () => r(), { once: true }));
  }

  stopCamera(video: HTMLVideoElement): void {
    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach(t => t.stop());
    video.srcObject = null;
  }
}
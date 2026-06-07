import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FreelancerService {

  private apiUrl = 'http://localhost:8222/api';

  constructor(private http: HttpClient) {}

getFreelancerById(freelancerId: number): Observable<any> {
  return this.http.get<any>(`http://localhost:8222/users/${freelancerId}`);
}
  // ─── SKILLS ───────────────────────────────────────────────────────────────

  getFreelancerSkills(freelancerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/skills/freelancer/${freelancerId}`);
  }

  getApplicationsByProjectId(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/applications/project/${projectId}`);
  }

  createSkillForFreelancer(freelancerId: number, skill: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/skills/freelancer/${freelancerId}`, skill);
  }

  // ─── CV / RESUME ──────────────────────────────────────────────────────────

  uploadResume(freelancerId: number, file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(
      `${this.apiUrl}/skills/resume/upload/${freelancerId}`,
      form,
      { responseType: 'text' }
    );
  }

  generateResumePdf(freelancerId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/skills/resume/generate/${freelancerId}`,
      { responseType: 'blob' }
    );
  }

  // ─── APPLICATIONS ─────────────────────────────────────────────────────────

  checkAlreadyApplied(freelancerId: number, projectId: number): Observable<boolean> {
    return this.http.get<boolean>(
      `${this.apiUrl}/applications/check?freelancerId=${freelancerId}&projectId=${projectId}`
    );
  }

  submitApplication(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/applications`, data);
  }

  generateCoverLetterAsString(freelancerId: number, projectId: number): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/applications/generate-cover-letter`,
      { freelancerId, projectId },
      { responseType: 'text' }
    );
  }

  uploadCoverLetter(freelancerId: number, file: File): Observable<string> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(
      `${this.apiUrl}/applications/cover-letter/upload/${freelancerId}`,
      form,
      { responseType: 'text' }
    );
  }

  getFreelancerApplications(freelancerId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/applications/freelancer/${freelancerId}`);
  }

  acceptApplication(applicationId: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/applications/${applicationId}/accept`, {});
  }
}
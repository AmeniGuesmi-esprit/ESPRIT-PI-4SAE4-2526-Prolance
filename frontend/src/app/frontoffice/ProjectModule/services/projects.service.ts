import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Project } from '../models/project.model';
import { AuthService } from '../../../services/auth.services';
import { Observable, throwError, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {

  private apiUrl   = 'http://localhost:8222/api/projects';
  private usersUrl = 'http://localhost:8222/users';  // user-service via gateway

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getAllProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  getMyProjects(clientId: number): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/my-projects/${clientId}`);
  }

  getProjectById(id: number): Observable<Project> {
    return this.http.get<Project>(`${this.apiUrl}/${id}`);
  }

  createProject(projectData: any): Observable<Project> {
    const clientId = this.authService.getCurrentUserId();

    if (!clientId) {
      alert('Error: You must be logged in to create a project');
      return throwError(() => new Error('User ID is not available'));
    }

    // ✅ Fetch profil depuis user-service, PUIS créer le projet
    return this.http.get<any>(`${this.usersUrl}/${clientId}`).pipe(
      switchMap(profile => {
        const dto = {
          title:          projectData.title,
          description:    projectData.description,
          budget:         projectData.budget,
          startDate:      projectData.startDate,
          endDate:        projectData.endDate,
          status:         projectData.status,
          category:       projectData.category,
          clientId:       clientId,
          clientName:     profile.name     || '',
          clientLastName: profile.lastName || '',
          clientEmail:    profile.email    || this.authService.getCurrentUser()?.email || '',
          skillIds: projectData.skillIds || [],
          tasks:    projectData.tasks    || []
        };
        return this.http.post<Project>(this.apiUrl, dto);
      }),
      catchError(error => {
        console.error('Error creating project:', error);
        return throwError(() => error);
      })
    );
  }

  updateProject(projectData: any): Observable<Project> {
    const clientId = this.authService.getCurrentUserId();

    if (!clientId) {
      alert('Error: You must be logged in');
      return throwError(() => new Error('User ID is not available'));
    }

    return this.http.get<any>(`${this.usersUrl}/${clientId}`).pipe(
      switchMap(profile => {
        const dto = {
          title:          projectData.title,
          description:    projectData.description,
          budget:         projectData.budget,
          startDate:      projectData.startDate,
          endDate:        projectData.endDate,
          status:         projectData.status,
          category:       projectData.category,
          clientId:       clientId,
          clientName:     profile.name     || '',
          clientLastName: profile.lastName || '',
          clientEmail:    profile.email    || this.authService.getCurrentUser()?.email || '',
          skillIds: projectData.skillIds || [],
          tasks:    projectData.tasks    || []
        };
        return this.http.put<Project>(`${this.apiUrl}/${projectData.id}`, dto);
      }),
      catchError(error => {
        console.error('Error updating project:', error);
        return throwError(() => error);
      })
    );
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  approveProject(projectId: number): Observable<Project> {
    return new Observable(observer => {
      this.getProjectById(projectId).subscribe({
        next: (project) => {
          const updated = { ...project, status: 'COMPLETED', clientId: project.client?.id };
          this.http.put<Project>(`${this.apiUrl}/${projectId}`, updated).subscribe({
            next:  (result) => { observer.next(result); observer.complete(); },
            error: (err)    => observer.error(err)
          });
        },
        error: (err) => observer.error(err)
      });
    });
  }

  getInProgressProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/status/IN_PROGRESS`);
  }

  getPendingProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/status/IN_PROGRESS`);
  }
}
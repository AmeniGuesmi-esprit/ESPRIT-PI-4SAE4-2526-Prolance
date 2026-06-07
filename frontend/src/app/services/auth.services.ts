import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable, BehaviorSubject } from 'rxjs';

import { tap } from 'rxjs/operators';

import { AuthRequest, AuthResponse, RegisterRequest } from '../authentification/auth/auth.models';







export interface SessionUser {

  id?: number;

  userId?: number;

  email: string;

  role: 'ADMIN' | 'USER' | 'CLIENT' | 'FREELANCER';

  token: string;

  name: string;          // v1 & v3

  lastName: string;      // v1 & v3

  imageUrl?: string;     // v3

  bio?: string;          // v3

}



@Injectable({

  providedIn: 'root'

})

export class AuthService {



  private apiUrl = 'http://localhost:8222/api/auth';



  private currentUserSubject = new BehaviorSubject<SessionUser | null>(

    this.getUserFromStorage()

  );



  currentUser$ = this.currentUserSubject.asObservable();



  constructor(private http: HttpClient) {}



  // ---------- API ----------



  /**

   * Register — sauvegarde temporairement name/lastName associés à l'email

   * pour pouvoir les injecter dans la session au moment du login (v1)

   */

  register(request: RegisterRequest): Observable<any> {

    localStorage.setItem('pending_name',     request.name);

    localStorage.setItem('pending_lastName', request.lastName);

    localStorage.setItem('pending_email',    request.email);



    return this.http.post(`${this.apiUrl}/register`, request, { responseType: 'text' });

  }



  /**

   * Login — pipe tap (v3) pour setSession automatiquement

   */

  login(request: AuthRequest): Observable<AuthResponse> {

    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(

      tap((response) => {

        console.log('Login response:', response);

        this.setSession(response, request.email);

      })

    );

  }



  // ---------- SESSION ----------



  /**

   * Fusion v1 + v3 :

   * - Récupère name/lastName depuis pending (après register) ou session existante (v1)

   * - Mappe id, imageUrl, bio depuis la réponse (v3)

   */

  setSession(res: AuthResponse | SessionUser, email: string): void {

    const pendingEmail    = localStorage.getItem('pending_email');

    const pendingName     = localStorage.getItem('pending_name');

    const pendingLastName = localStorage.getItem('pending_lastName');



    const existingSession = this.getUserFromStorage();

    let name     = (res as any).name     || '';

    let lastName = (res as any).lastName || '';



    // Priorité 1 : données depuis la réponse API (v3)

    // Priorité 2 : pending après register (v1)

    // Priorité 3 : session existante pour même email (v1 reconnexion)

    if (!name && pendingEmail === email && pendingName) {

      name     = pendingName;

      lastName = pendingLastName || '';

      localStorage.removeItem('pending_name');

      localStorage.removeItem('pending_lastName');

      localStorage.removeItem('pending_email');

    } else if (!name && existingSession?.email === email) {

      name     = existingSession.name     || '';

      lastName = existingSession.lastName || '';

    }



    const user: SessionUser = {

      id:        (res as any).id       ?? undefined,

      userId:    (res as any).userId   ?? undefined,

      email,

      role:      (res as any).role,

      token:     (res as any).token,

      name,

      lastName,

      imageUrl:  (res as any).imageUrl ?? undefined,

      bio:       (res as any).bio      ?? undefined,

    };



    console.log('Setting session user:', user);

    localStorage.setItem('sessionUser', JSON.stringify(user));

    this.currentUserSubject.next(user);

  }



  /**

   * Met à jour name/lastName en session (v1 — après modification de profil)

   */

  updateSessionName(name: string, lastName: string): void {

    const current = this.currentUserSubject.value;

    if (!current) return;

    const updated = { ...current, name, lastName };

    localStorage.setItem('sessionUser', JSON.stringify(updated));

    this.currentUserSubject.next(updated);

  }



  /**

   * Met à jour l'avatar en session (v3 — après upload d'image)

   */

  updateSessionAvatar(imageUrl: string): void {

    const current = this.currentUserSubject.value;

    if (!current) return;

    const updated: SessionUser = { ...current, imageUrl };

    localStorage.setItem('sessionUser', JSON.stringify(updated));

    this.currentUserSubject.next(updated);

  }



  // ---------- GETTERS ----------



  getCurrentUserId(): number | null {

    const user = this.currentUserSubject.value;

    return user?.userId ?? user?.id ?? null;

  }



  getRole(): string | null {

    return this.currentUserSubject.value?.role ?? null;

  }



  getCurrentUser(): SessionUser | null {

    return this.currentUserSubject.value;

  }



  isLoggedIn(): boolean {

    return !!this.currentUserSubject.value;

  }



  // ---------- AUTH ----------



  logout(): void {

    localStorage.removeItem('sessionUser');

    this.currentUserSubject.next(null);

  }



  // ---------- PRIVATE ----------



  private getUserFromStorage(): SessionUser | null {

    const stored = localStorage.getItem('sessionUser');

    if (!stored) return null;



    const parsed: SessionUser = JSON.parse(stored);



    // Valider qu'il y a bien un identifiant utilisateur (v1 guard)

    if (!parsed.userId && !parsed.id) {

      localStorage.removeItem('sessionUser');

      localStorage.removeItem('token');

      localStorage.removeItem('userName');

      localStorage.removeItem('role');

      return null;

    }



    return parsed;

  }

}
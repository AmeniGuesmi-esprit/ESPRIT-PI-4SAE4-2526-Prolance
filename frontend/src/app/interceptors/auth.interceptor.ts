import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.services';

/**
 * Routes qui ne doivent JAMAIS recevoir le header Authorization.
 * Envoyer un token sur /register ou /login provoque un double traitement
 * CORS (gateway + user-service) → header dupliqué → erreur browser.
 */
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/face-login',
];

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // ✅ Ne pas ajouter de token sur les preflight OPTIONS
    if (req.method === 'OPTIONS') {
      return next.handle(req);
    }

    // ✅ Ne pas ajouter de token sur les routes publiques (login, register, etc.)
    const isPublicRoute = PUBLIC_ROUTES.some(route => req.url.includes(route));
    if (isPublicRoute) {
      console.log('🔓 AuthInterceptor - Public route, no token added:', req.url);
      return next.handle(req);
    }

    const token = this.authService.getCurrentUser()?.token;

    console.log('🔑 AuthInterceptor - Token present:', !!token);

    if (token) {
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      console.log('📡 Request with auth header:', authReq.url);
      return next.handle(authReq);
    }

    return next.handle(req);
  }
}
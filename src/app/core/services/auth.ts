import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GoogleLoginRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ChangePasswordRequest
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly http = inject(HttpClient);

  private readonly accessTokenKey = 'access_token';
  private readonly userKey = 'auth_user';

  readonly isAuthenticated = signal<boolean>(
    this.hasAccessToken()
  );

  // 1. LOGIN - Username / Password
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/login`,
        request
      )
      .pipe(
        tap(response => {
          this.saveSession(response);
        })
      );
  }

  // 2. GOOGLE LOGIN
  googleLogin(idToken: string): Observable<LoginResponse> {
    const request: GoogleLoginRequest = {
      idToken
    };

    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/google-login`,
        request
      )
      .pipe(
        tap(response => {
          this.saveSession(response);
        })
      );
  }

  // 3. REGISTER - SCRUM-119
  register(
    request: RegisterRequest
  ): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${environment.apiUrl}/auth/register`,
      request
    );
  }

  // 4. CHANGE PASSWORD - SCRUM-135
  changePassword(
    request: ChangePasswordRequest
  ): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/auth/change-password`,
      request
    );
  }

  // 5. SAVE SESSION
  private saveSession(response: LoginResponse): void {
    this.setAccessToken(response.accessToken);

    localStorage.setItem(
      this.userKey,
      JSON.stringify({
        userId: response.userId,
        username: response.username,
        role: response.role
      })
    );
  }

  // 6. TOKEN MANAGEMENT
  setAccessToken(token: string): void {
    localStorage.setItem(this.accessTokenKey, token);
    this.isAuthenticated.set(true);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenKey);
  }

  hasAccessToken(): boolean {
    return !!this.getAccessToken();
  }

  // 7. LOGOUT
  clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticated.set(false);
  }

  logout(): void {
    this.clearSession();
  }
}
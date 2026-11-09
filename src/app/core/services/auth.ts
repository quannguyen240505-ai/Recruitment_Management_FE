import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse
} from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly http = inject(HttpClient);

  private readonly accessTokenKey = 'access_token';
  private readonly userKey = 'auth_user';

  readonly isAuthenticated = signal<boolean>(this.hasAccessToken());

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/login`,
        request
      )
      .pipe(
        tap(response => {
          this.setAccessToken(response.accessToken);

          localStorage.setItem(
            this.userKey,
            JSON.stringify({
              userId: response.userId,
              username: response.username,
              role: response.role
            })
          );
        })
      );
  }

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

  clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticated.set(false);
  }

  logout(): void {
    this.clearSession();
  }
}
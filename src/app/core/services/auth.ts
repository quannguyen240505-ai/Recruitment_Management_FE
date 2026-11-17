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

  // 1. Login bằng Username/Password
  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/login`,
        request
      )
      .pipe(
        tap(response => this.saveSession(response))
      );
  }

  // 2. Google Login
  googleLogin(idToken: string): Observable<LoginResponse> {
    const request: GoogleLoginRequest = { idToken };

    return this.http
      .post<LoginResponse>(
        `${environment.apiUrl}/auth/google-login`,
        request
      )
      .pipe(
        tap(response => this.saveSession(response))
      );
  }

  // 3. Register
  register(
    request: RegisterRequest
  ): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${environment.apiUrl}/auth/register`,
      request
    );
  }

  // 4. Change Password
  changePassword(
    request: ChangePasswordRequest
  ): Observable<void> {
    return this.http.put<void>(
      `${environment.apiUrl}/auth/change-password`,
      request
    );
  }

  // 5. Lưu phiên đăng nhập
  private saveSession(response: LoginResponse): void {
    localStorage.setItem(
      this.userKey,
      JSON.stringify({
        userId: response.userId,
        username: response.username,
        role: response.role
      })
    );

    this.setAccessToken(response.accessToken);
  }

  // 6. Quản lý Access Token
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

  // 7. Đọc Role của người dùng
  // SCRUM-154: Dùng cho giao diện và Role Guard
  getCurrentRole(): string | null {
    try {
      const storedUser = localStorage.getItem(this.userKey);

      if (!storedUser) {
        return null;
      }

      const user: unknown = JSON.parse(storedUser);

      if (
        typeof user === 'object' &&
        user !== null &&
        'role' in user &&
        typeof user.role === 'string'
      ) {
        return user.role;
      }

      return null;
    } catch {
      return null;
    }
  }

  // 8. Xóa phiên đăng nhập
  clearSession(): void {
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.userKey);
    this.isAuthenticated.set(false);
  }

  // 9. Logout
  logout(): void {
    this.clearSession();
  }
}

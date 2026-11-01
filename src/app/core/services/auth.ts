import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly accessTokenKey = 'access_token';

  readonly isAuthenticated = signal<boolean>(this.hasAccessToken());

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
    this.isAuthenticated.set(false);
  }
}
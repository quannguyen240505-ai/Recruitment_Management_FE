
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { Auth } from './auth';

describe('Auth', () => {
    let auth: Auth;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        localStorage.clear();

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        auth = TestBed.inject(Auth);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('should store access token', () => {
        auth.setAccessToken('test-token');

        expect(auth.getAccessToken()).toBe('test-token');
        expect(auth.isAuthenticated()).toBe(true);
    });

    it('should remove access token when logout', () => {
        auth.setAccessToken('test-token');
        auth.logout();

        expect(auth.getAccessToken()).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
    });

    it('should report unauthenticated when token does not exist', () => {
        expect(auth.hasAccessToken()).toBe(false);
    });

    it('should send Google ID Token and store JWT and user information', () => {
        const mockResponse = {
            accessToken: 'jwt-from-backend',
            tokenType: 'Bearer',
            expiresAtUtc: '2026-11-09T10:00:00Z',
            userId: '123',
            username: 'google-user',
            role: 'CANDIDATE'
        };

        let result: typeof mockResponse | undefined;

        auth.googleLogin('google-id-token').subscribe(response => {
            result = response;
        });

        const request = httpMock.expectOne(
            `${environment.apiUrl}/auth/google-login`
        );

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({
            idToken: 'google-id-token'
        });

        request.flush(mockResponse);

        expect(result).toEqual(mockResponse);
        expect(auth.getAccessToken()).toBe('jwt-from-backend');
        expect(auth.isAuthenticated()).toBe(true);

        expect(JSON.parse(
            localStorage.getItem('auth_user')!
        )).toEqual({
            userId: '123',
            username: 'google-user',
            role: 'CANDIDATE'
        });
    });

    it('should not store JWT when Google Login fails', () => {
        let errorStatus = 0;

        auth.googleLogin('invalid-token').subscribe({
            error: error => {
                errorStatus = error.status;
            }
        });

        const request = httpMock.expectOne(
            `${environment.apiUrl}/auth/google-login`
        );

        request.flush(
            { message: 'Google account conflict' },
            {
                status: 409,
                statusText: 'Conflict'
            }
        );

        expect(errorStatus).toBe(409);
        expect(auth.getAccessToken()).toBeNull();
        expect(localStorage.getItem('auth_user')).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
    });
});

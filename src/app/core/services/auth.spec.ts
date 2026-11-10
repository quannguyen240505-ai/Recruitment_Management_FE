
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

    // TEST 1: Lưu JWT
    it('should store access token', () => {
        auth.setAccessToken('test-token');

        expect(auth.getAccessToken()).toBe('test-token');
        expect(auth.isAuthenticated()).toBe(true);
    });

    // TEST 2: Logout
    it('should remove access token when logout', () => {
        auth.setAccessToken('test-token');

        auth.logout();

        expect(auth.getAccessToken()).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
    });

    // TEST 3: Chưa đăng nhập
    it('should report unauthenticated when token does not exist', () => {
        expect(auth.hasAccessToken()).toBe(false);
        expect(auth.isAuthenticated()).toBe(false);
    });

    // TEST 4: Login thành công
    it('should login successfully and store JWT and user information', () => {
        const loginRequest = {
            username: 'thien_test_02',
            password: 'Thien@123'
        };

        const mockResponse = {
            accessToken: 'jwt-from-backend',
            tokenType: 'Bearer',
            expiresAtUtc: '2026-11-09T10:00:00Z',
            userId: 'user-123',
            username: 'thien_test_02',
            role: 'CANDIDATE'
        };

        let result: typeof mockResponse | undefined;

        auth.login(loginRequest).subscribe(response => {
            result = response;
        });

        const request = httpMock.expectOne(
            `${environment.apiUrl}/auth/login`
        );

        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(loginRequest);

        request.flush(mockResponse);

        expect(result).toEqual(mockResponse);
        expect(auth.getAccessToken()).toBe('jwt-from-backend');
        expect(auth.isAuthenticated()).toBe(true);

        expect(
            JSON.parse(localStorage.getItem('auth_user')!)
        ).toEqual({
            userId: 'user-123',
            username: 'thien_test_02',
            role: 'CANDIDATE'
        });
    });

    // TEST 5: Login thất bại - HTTP 401
    it('should not store JWT when login fails with 401', () => {
        let errorStatus = 0;

        auth.login({
            username: 'wrong-user',
            password: 'wrong-password'
        }).subscribe({
            error: error => {
                errorStatus = error.status;
            }
        });

        const request = httpMock.expectOne(
            `${environment.apiUrl}/auth/login`
        );

        expect(request.request.method).toBe('POST');

        request.flush(
            { message: 'Invalid credentials' },
            {
                status: 401,
                statusText: 'Unauthorized'
            }
        );

        expect(errorStatus).toBe(401);
        expect(auth.getAccessToken()).toBeNull();
        expect(localStorage.getItem('auth_user')).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
    });

    // TEST 6: Google Login thành công
    it('should send Google ID Token and store JWT and user information', () => {
        const mockResponse = {
            accessToken: 'google-jwt-from-backend',
            tokenType: 'Bearer',
            expiresAtUtc: '2026-11-09T10:00:00Z',
            userId: 'google-user-123',
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
        expect(auth.getAccessToken()).toBe(
            'google-jwt-from-backend'
        );
        expect(auth.isAuthenticated()).toBe(true);

        expect(
            JSON.parse(localStorage.getItem('auth_user')!)
        ).toEqual({
            userId: 'google-user-123',
            username: 'google-user',
            role: 'CANDIDATE'
        });
    });

    // TEST 7: Google Login thất bại
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

    // TEST 8: Change Password thành công - HTTP 204
    it('should send PUT change-password request and handle 204', () => {
        const payload = {
            currentPassword: 'OldPass1!',
            newPassword: 'NewPass2!',
            confirmPassword: 'NewPass2!'
        };

        let succeeded = false;

        auth.changePassword(payload).subscribe({
            next: () => {
                succeeded = true;
            }
        });

        const request = httpMock.expectOne(
            `${environment.apiUrl}/auth/change-password`
        );

        expect(request.request.method).toBe('PUT');
        expect(request.request.body).toEqual(payload);

        request.flush(null, {
            status: 204,
            statusText: 'No Content'
        });

        expect(succeeded).toBe(true);
    });

    // TEST 9: Change Password thất bại - HTTP 400
    it('should propagate HTTP 400 from change-password', () => {
        let errorStatus = 0;

        auth.changePassword({
            currentPassword: 'WrongPass1!',
            newPassword: 'NewPass2!',
            confirmPassword: 'NewPass2!'
        }).subscribe({
            error: error => {
                errorStatus = error.status;
            }
        });

        const request = httpMock.expectOne(
            `${environment.apiUrl}/auth/change-password`
        );

        expect(request.request.method).toBe('PUT');

        request.flush(
            { detail: 'Mật khẩu hiện tại không chính xác.' },
            {
                status: 400,
                statusText: 'Bad Request'
            }
        );

        expect(errorStatus).toBe(400);
    });

});

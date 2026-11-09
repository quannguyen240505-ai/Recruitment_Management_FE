
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

    // TEST 1: Lưu JWT vào localStorage
    it('should store access token', () => {
        auth.setAccessToken('test-token');

        expect(auth.getAccessToken()).toBe('test-token');
        expect(auth.isAuthenticated()).toBe(true);
    });

    // TEST 2: Xóa thông tin phiên khi đăng xuất
    it('should remove access token when logout', () => {
        auth.setAccessToken('test-token');

        auth.logout();

        expect(auth.getAccessToken()).toBeNull();
        expect(auth.isAuthenticated()).toBe(false);
    });

    // TEST 3: Không có token thì chưa đăng nhập
    it('should report unauthenticated when token does not exist', () => {
        expect(auth.hasAccessToken()).toBe(false);
        expect(auth.isAuthenticated()).toBe(false);
    });

    // TEST 4: Đăng nhập thành công qua API
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

        expect(auth.getAccessToken()).toBe(
            'jwt-from-backend'
        );

        expect(auth.isAuthenticated()).toBe(true);

        expect(
            JSON.parse(localStorage.getItem('auth_user')!)
        ).toEqual({
            userId: 'user-123',
            username: 'thien_test_02',
            role: 'CANDIDATE'
        });
    });

    // TEST 5: Sai tài khoản/mật khẩu không lưu JWT
    it('should not store JWT when login fails with 401', () => {
        const loginRequest = {
            username: 'wrong-user',
            password: 'wrong-password'
        };

        let errorStatus = 0;

        auth.login(loginRequest).subscribe({
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
});

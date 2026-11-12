import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';

import { Login } from './login';
import { Auth } from '../../../core/services/auth';
import {
    GoogleIdentity,
    GoogleCredentialResponse
} from '../../../core/services/google-identity';

describe('Login', () => {
    let component: Login;
    let fixture: ComponentFixture<Login>;
    let router: Router;

    let authMock: {
        login: ReturnType<typeof vi.fn>;
        googleLogin: ReturnType<typeof vi.fn>;
    };

    let googleMock: {
        renderButton: ReturnType<typeof vi.fn>;
    };

    const response = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        expiresAtUtc: '2026-11-09T10:00:00Z',
        userId: '1',
        username: 'thien_test_02',
        role: 'CANDIDATE'
    };

    beforeEach(async () => {
        authMock = {
            login: vi.fn(),
            googleLogin: vi.fn()
        };

        googleMock = {
            renderButton: vi.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [Login],
            providers: [
                provideRouter([]),
                { provide: Auth, useValue: authMock },
                {
                    provide: GoogleIdentity,
                    useValue: googleMock
                }
            ]
        }).compileComponents();

        // Use real Router to support RouterLink.
        router = TestBed.inject(Router);

        // Mock navigation only.
        vi.spyOn(router, 'navigate').mockResolvedValue(true);

        fixture = TestBed.createComponent(Login);
        component = fixture.componentInstance;
    });

    async function triggerGoogleLogin(
        credential: string
    ): Promise<void> {
        component.googleButtonHost =
            new ElementRef(document.createElement('div'));

        await component.ngAfterViewInit();

        const callback = googleMock.renderButton.mock.calls[0][2] as (
            response: GoogleCredentialResponse
        ) => void;

        callback({ credential });
    }

    // TEST 1: Component creation
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    // TEST 2: Invalid form
    it('should reject an invalid form', () => {
        component.submit();

        expect(authMock.login).not.toHaveBeenCalled();
    });

    // TEST 3: Login success
    it('should login and navigate to dashboard', () => {
        authMock.login.mockReturnValue(of(response));

        component.loginForm.setValue({
            username: 'thien_test_02',
            password: 'Thien@123'
        });

        component.submit();

        expect(authMock.login).toHaveBeenCalledWith({
            username: 'thien_test_02',
            password: 'Thien@123'
        });

        expect(router.navigate)
            .toHaveBeenCalledWith(['/dashboard']);
    });

    // TEST 4: Invalid credentials
    it('should handle invalid username/password', () => {
        authMock.login.mockReturnValue(
            throwError(
                () => new HttpErrorResponse({ status: 401 })
            )
        );

        component.loginForm.setValue({
            username: 'wrong-user',
            password: 'wrong-password'
        });

        component.submit();

        expect(component.errorMessage).toBe(
            'Tên đăng nhập hoặc mật khẩu không chính xác.'
        );
    });

    // TEST 5: Google login success
    it('should login with Google successfully', async () => {
        authMock.googleLogin.mockReturnValue(of(response));

        await triggerGoogleLogin('google-id-token');

        expect(authMock.googleLogin)
            .toHaveBeenCalledWith('google-id-token');

        expect(router.navigate)
            .toHaveBeenCalledWith(['/dashboard']);

        expect(component.isGoogleLoading).toBe(false);
    });

    // TEST 6-8: Google API errors
    it.each([
        [400, 'Thông tin đăng nhập Google không hợp lệ.'],
        [401, 'Không thể xác thực tài khoản Google.'],
        [409, 'Email Google này đã được sử dụng bởi tài khoản khác.']
    ])(
        'should handle Google API error %i',
        async (status, expectedMessage) => {
            authMock.googleLogin.mockReturnValue(
                throwError(
                    () => new HttpErrorResponse({ status })
                )
            );

            await triggerGoogleLogin('google-id-token');

            expect(component.errorMessage)
                .toBe(expectedMessage);

            expect(component.isGoogleLoading)
                .toBe(false);

            expect(router.navigate)
                .not.toHaveBeenCalled();
        }
    );

    // TEST 9: Empty Google credential
    it('should reject an empty Google credential', async () => {
        await triggerGoogleLogin('');

        expect(authMock.googleLogin)
            .not.toHaveBeenCalled();

        expect(component.errorMessage).toBe(
            'Không nhận được thông tin xác thực từ Google.'
        );
    });

    // TEST 10: Google SDK failure
    it('should handle Google SDK loading failure', async () => {
        googleMock.renderButton.mockRejectedValue(
            new Error('Google SDK unavailable')
        );

        component.googleButtonHost =
            new ElementRef(document.createElement('div'));

        await component.ngAfterViewInit();

        expect(component.errorMessage).toBe(
            'Không thể tải chức năng đăng nhập Google.'
        );
    });

    // TEST 11: Prevent duplicate requests
    it('should prevent duplicate Google Login requests', async () => {
        const pendingRequest = new Subject<typeof response>();

        authMock.googleLogin.mockReturnValue(
            pendingRequest.asObservable()
        );

        await triggerGoogleLogin('google-id-token');

        const callback = googleMock.renderButton.mock.calls[0][2] as (
            response: GoogleCredentialResponse
        ) => void;

        callback({ credential: 'google-id-token' });

        expect(authMock.googleLogin)
            .toHaveBeenCalledTimes(1);

        expect(component.isGoogleLoading).toBe(true);

        expect(router.navigate)
            .not.toHaveBeenCalled();

        pendingRequest.next(response);
        pendingRequest.complete();

        expect(component.isGoogleLoading).toBe(false);

        expect(router.navigate)
            .toHaveBeenCalledWith(['/dashboard']);
    });

    it('should render login error after async HTTP 401', async () => {
    const pending = new Subject<never>();

    authMock.login.mockReturnValue(
        pending.asObservable()
    );

    fixture.detectChanges();

    component.loginForm.setValue({
        username: 'unknown-user',
        password: 'WrongPassword123'
    });

    component.submit();

    pending.error(
        new HttpErrorResponse({ status: 401 })
    );

    await fixture.whenStable();

    const errorElement =
        fixture.nativeElement.querySelector('.login-error');

    expect(errorElement).not.toBeNull();
    expect(errorElement.textContent).toContain(
        'Tên đăng nhập hoặc mật khẩu không chính xác.'
    );
    });

});

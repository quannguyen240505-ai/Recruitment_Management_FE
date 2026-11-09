import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { Login } from './login';
import { Auth } from '../../../core/services/auth';

describe('Login', () => {
    let component: Login;
    let fixture: ComponentFixture<Login>;

    let authMock: {
        login: ReturnType<typeof vi.fn>;
    };

    let routerMock: {
        navigate: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        authMock = {
            login: vi.fn()
        };

        routerMock = {
            navigate: vi.fn()
        };

        await TestBed.configureTestingModule({
            imports: [Login],
            providers: [
                {
                    provide: Auth,
                    useValue: authMock
                },
                {
                    provide: Router,
                    useValue: routerMock
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(Login);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should not login when form is invalid', () => {
        component.submit();

        expect(authMock.login).not.toHaveBeenCalled();
    });

    it('should login and navigate to dashboard', () => {
        authMock.login.mockReturnValue(
            of({
                accessToken: 'test-token',
                tokenType: 'Bearer',
                expiresAtUtc: '2026-11-09T10:00:00Z',
                userId: '1',
                username: 'thien_test_02',
                role: 'CANDIDATE'
            })
        );

        component.loginForm.setValue({
            username: 'thien_test_02',
            password: 'Thien@123'
        });

        component.submit();

        expect(authMock.login).toHaveBeenCalledWith({
            username: 'thien_test_02',
            password: 'Thien@123'
        });

        expect(routerMock.navigate)
            .toHaveBeenCalledWith(['/dashboard']);
    });

    it('should show error when credentials are invalid', () => {
        authMock.login.mockReturnValue(
            throwError(
                () =>
                    new HttpErrorResponse({
                        status: 401
                    })
            )
        );

        component.loginForm.setValue({
            username: 'wrong-user',
            password: 'wrong-password'
        });

        component.submit();

        expect(component.errorMessage)
            .toBe('Tên đăng nhập hoặc mật khẩu không chính xác.');
    });
});
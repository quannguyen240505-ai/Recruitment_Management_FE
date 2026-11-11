import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Auth } from '../../../core/services/auth';
import { ChangePassword } from './change-password';

describe('ChangePassword - SCRUM-135', () => {
  let component: ChangePassword;
  let fixture: ComponentFixture<ChangePassword>;

  let authMock: {
    hasAccessToken: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authMock = {
      hasAccessToken: vi.fn(() => true),
      changePassword: vi.fn(() => of(void 0)),
      clearSession: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ChangePassword],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: authMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ChangePassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValidForm(): void {
    component.changePasswordForm.setValue({
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass2!',
      confirmPassword: 'NewPass2!'
    });
  }

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should require all password fields', () => {
    component.submit();

    expect(component.changePasswordForm.invalid).toBe(true);
    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it('should reject weak new password', () => {
    component.changePasswordForm.setValue({
      currentPassword: 'OldPass1!',
      newPassword: 'weak',
      confirmPassword: 'weak'
    });

    component.submit();

    expect(component.changePasswordForm.invalid).toBe(true);
    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it('should reject mismatched confirmation', () => {
    component.changePasswordForm.setValue({
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass2!',
      confirmPassword: 'Different3!'
    });

    component.submit();

    expect(
      component.changePasswordForm.hasError('passwordMismatch')
    ).toBe(true);

    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it('should reject same old and new password', () => {
    component.changePasswordForm.setValue({
      currentPassword: 'OldPass1!',
      newPassword: 'OldPass1!',
      confirmPassword: 'OldPass1!'
    });

    component.submit();

    expect(
      component.changePasswordForm.hasError('samePassword')
    ).toBe(true);

    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it('should send correct request to Auth service', () => {
    fillValidForm();

    component.submit();

    expect(authMock.changePassword).toHaveBeenCalledWith({
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass2!',
      confirmPassword: 'NewPass2!'
    });
  });

  it('should handle successful change password', () => {
    fillValidForm();

    component.submit();

    expect(component.isSuccess).toBe(true);
    expect(component.isLoading).toBe(false);
    expect(authMock.clearSession).toHaveBeenCalledOnce();

    expect(
      component.changePasswordForm.controls.newPassword.value
    ).toBe('');
  });

  it('should show error for HTTP 400', () => {
    authMock.changePassword.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 400
      }))
    );

    fillValidForm();
    component.submit();

    expect(component.isSuccess).toBe(false);
    expect(component.errorMessage).toContain(
      'Mật khẩu hiện tại'
    );
  });

  it('should clear session for HTTP 401', () => {
    authMock.changePassword.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 401
      }))
    );

    fillValidForm();
    component.submit();

    expect(authMock.clearSession).toHaveBeenCalledOnce();
    expect(component.errorMessage).toContain(
      'Phiên đăng nhập'
    );
  });

  it('should show error for HTTP 409', () => {
    authMock.changePassword.mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 409
      }))
    );

    fillValidForm();
    component.submit();

    expect(component.isSuccess).toBe(false);
    expect(component.errorMessage).toContain(
      'mật khẩu nội bộ'
    );
  });

  it('should block requests without access token', () => {
    authMock.hasAccessToken.mockReturnValue(false);

    fillValidForm();
    component.submit();

    expect(authMock.changePassword).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain(
      'cần đăng nhập'
    );
  });

  it('should prevent duplicate submissions', () => {
    const pendingRequest = new Subject<void>();

    authMock.changePassword.mockReturnValue(
      pendingRequest.asObservable()
    );

    fillValidForm();

    component.submit();
    component.submit();

    expect(authMock.changePassword).toHaveBeenCalledTimes(1);

    pendingRequest.next();
    pendingRequest.complete();

    expect(component.isSuccess).toBe(true);
  });
});

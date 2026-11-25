import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ResetPassword } from './reset-password';
import { Auth } from '../../../core/services/auth';

describe('ResetPassword', () => {
  let component: ResetPassword;

  const authMock = {
    resetPassword: vi.fn()
  };

  const validRequest = {
    token: 'A'.repeat(43),
    newPassword: 'Recruitly@Test2026',
    confirmPassword: 'Recruitly@Test2026'
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    await TestBed.configureTestingModule({
      imports: [ResetPassword],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: authMock }
      ]
    }).compileComponents();

    component =
      TestBed.createComponent(ResetPassword).componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should reject empty form', () => {
    component.submit();

    expect(authMock.resetPassword).not.toHaveBeenCalled();
  });

  it('should reject invalid token format', () => {
    component.form.setValue({
      ...validRequest,
      token: '123456'
    });

    component.submit();

    expect(authMock.resetPassword).not.toHaveBeenCalled();
  });

  it.each([
    '123',
    'password@123',
    'PASSWORD@123',
    'Password@abc',
    'Password123'
  ])('should reject weak password %s', (password) => {
    component.form.setValue({
      ...validRequest,
      newPassword: password,
      confirmPassword: password
    });

    component.submit();

    expect(authMock.resetPassword).not.toHaveBeenCalled();
  });

  it('should reject mismatched passwords', () => {
    component.form.setValue({
      ...validRequest,
      confirmPassword: 'Different@123'
    });

    component.submit();

    expect(component.form.hasError('passwordMismatch'))
      .toBe(true);

    expect(authMock.resetPassword).not.toHaveBeenCalled();
  });

  it('should reset password successfully', () => {
    authMock.resetPassword.mockReturnValue(of(undefined));

    component.form.setValue(validRequest);
    component.submit();

    expect(authMock.resetPassword)
      .toHaveBeenCalledWith(validRequest);

    expect(component.isSuccess()).toBe(true);
    expect(component.isLoading()).toBe(false);
    expect(component.form.controls.token.value).toBe('');
    expect(component.form.controls.newPassword.value).toBe('');
  });

  it.each([400, 429, 500, 0])(
    'should handle API error %s',
    (status) => {
      authMock.resetPassword.mockReturnValue(
        throwError(() => ({ status }))
      );

      component.form.setValue(validRequest);
      component.submit();

      expect(component.errorMessage()).toBeTruthy();
      expect(component.isSuccess()).toBe(false);
      expect(component.isLoading()).toBe(false);
    }
  );

  it('should prevent duplicate requests while loading', () => {
    const response = new Subject<void>();

    authMock.resetPassword.mockReturnValue(response);

    component.form.setValue(validRequest);
    component.submit();
    component.submit();

    expect(component.isLoading()).toBe(true);
    expect(authMock.resetPassword).toHaveBeenCalledTimes(1);

    response.next(undefined);
    response.complete();

    expect(component.isLoading()).toBe(false);
  });
});

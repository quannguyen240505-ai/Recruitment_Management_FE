import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ForgotPassword } from './forgot-password';
import { Auth } from '../../../core/services/auth';

describe('ForgotPassword', () => {
  let component: ForgotPassword;

  const authMock = {
    forgotPassword: vi.fn()
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    await TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: authMock }
      ]
    }).compileComponents();

    component =
      TestBed.createComponent(ForgotPassword).componentInstance;
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should reject empty email', () => {
    component.submit();

    expect(authMock.forgotPassword).not.toHaveBeenCalled();
  });

  it('should reject invalid email', () => {
    component.form.setValue({ email: 'invalid-email' });
    component.submit();

    expect(authMock.forgotPassword).not.toHaveBeenCalled();
  });

  it('should submit valid email successfully', () => {
    authMock.forgotPassword.mockReturnValue(
      of({ message: 'Accepted' })
    );

    component.form.setValue({
      email: 'candidate@example.com'
    });

    component.submit();

    expect(authMock.forgotPassword).toHaveBeenCalledWith({
      email: 'candidate@example.com'
    });

    expect(component.isSuccess()).toBe(true);
    expect(component.submittedEmail())
      .toBe('candidate@example.com');
    expect(component.isLoading()).toBe(false);
  });

  it.each([400, 429, 503, 500, 0])(
    'should handle API error %s',
    (status) => {
      authMock.forgotPassword.mockReturnValue(
        throwError(() => ({ status }))
      );

      component.form.setValue({
        email: 'candidate@example.com'
      });

      component.submit();

      expect(component.errorMessage()).toBeTruthy();
      expect(component.isSuccess()).toBe(false);
      expect(component.isLoading()).toBe(false);
    }
  );

  it('should prevent duplicate requests while loading', () => {
    const response = new Subject<{ message: string }>();

    authMock.forgotPassword.mockReturnValue(response);

    component.form.setValue({
      email: 'candidate@example.com'
    });

    component.submit();
    component.submit();

    expect(component.isLoading()).toBe(true);
    expect(authMock.forgotPassword).toHaveBeenCalledTimes(1);

    response.next({ message: 'Accepted' });
    response.complete();

    expect(component.isLoading()).toBe(false);
  });
});

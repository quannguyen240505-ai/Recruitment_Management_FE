import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Auth } from '../../../core/services/auth';

function passwordMatch(
  control: AbstractControl
): ValidationErrors | null {
  return control.get('newPassword')?.value ===
    control.get('confirmPassword')?.value
    ? null
    : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrls: [
    '../forgot-password/forgot-password.css',
    './reset-password.css'
  ]
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);

  readonly isLoading = signal(false);
  readonly isSuccess = signal(false);
  readonly errorMessage = signal('');

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    token: ['', [
      Validators.required,
      Validators.pattern(/^[A-Za-z0-9_-]{43}$/)
    ]],

    newPassword: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.maxLength(128),
      Validators.pattern(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).*$/
      )
    ]],

    confirmPassword: ['', Validators.required]
  }, {
    validators: passwordMatch
  });

  get password(): string {
    return this.form.controls.newPassword.value;
  }

  get passwordChecks() {
    return [
      {
        label: 'Từ 8 đến 128 ký tự',
        valid: this.password.length >= 8 &&
          this.password.length <= 128
      },
      {
        label: 'Có chữ hoa',
        valid: /[A-Z]/.test(this.password)
      },
      {
        label: 'Có chữ thường',
        valid: /[a-z]/.test(this.password)
      },
      {
        label: 'Có ít nhất 1 số',
        valid: /\d/.test(this.password)
      },
      {
        label: 'Có ký tự đặc biệt',
        valid: /[^A-Za-z0-9\s]/.test(this.password)
      }
    ];
  }

  submit(): void {
    if (this.isLoading() || this.isSuccess()) return;

    const token = this.form.controls.token.value.trim();

    this.form.controls.token.setValue(token);
    this.form.markAllAsTouched();
    this.errorMessage.set('');

    if (this.form.invalid) return;

    this.isLoading.set(true);

    this.auth.resetPassword(this.form.getRawValue())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.showPassword.set(false);
          this.showConfirmPassword.set(false);
          this.isSuccess.set(true);
        },
        error: (err) => {
          switch (err.status) {
            case 400:
              this.errorMessage.set(
                'Mã không hợp lệ, đã hết hạn hoặc mật khẩu không phù hợp.'
              );
              break;

            case 429:
              this.errorMessage.set(
                'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
              );
              break;

            default:
              this.errorMessage.set(
                'Không thể đặt lại mật khẩu. Vui lòng thử lại.'
              );
          }
        }
      });
  }
}

import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);

  readonly isLoading = signal(false);
  readonly isSuccess = signal(false);
  readonly errorMessage = signal('');
  readonly submittedEmail = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [
      Validators.required,
      Validators.email,
      Validators.maxLength(256)
    ]]
  });

  submit(): void {
    if (this.isLoading() || this.isSuccess()) return;

    const email = this.form.controls.email.value.trim();

    this.form.controls.email.setValue(email);
    this.form.markAllAsTouched();
    this.errorMessage.set('');

    if (this.form.invalid) return;

    this.isLoading.set(true);

    this.auth.forgotPassword({ email })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () => {
          this.submittedEmail.set(email);
          this.isSuccess.set(true);
        },
        error: (err) => {
          switch (err.status) {
            case 400:
              this.errorMessage.set('Email không hợp lệ.');
              break;
            case 429:
              this.errorMessage.set(
                'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
              );
              break;
            case 503:
              this.errorMessage.set(
                'Chức năng khôi phục tạm thời chưa khả dụng.'
              );
              break;
            default:
              this.errorMessage.set(
                'Không thể gửi yêu cầu. Vui lòng thử lại.'
              );
          }
        }
      });
  }
}

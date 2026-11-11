
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { RouterLink } from '@angular/router';

import { Auth } from '../../../core/services/auth';
import { ChangePasswordRequest } from '../../../core/models/auth.models';

// Kiểm tra mật khẩu mới và mật khẩu xác nhận
const passwordValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const currentPassword =
    control.get('currentPassword')?.value;

  const newPassword =
    control.get('newPassword')?.value;

  const confirmPassword =
    control.get('confirmPassword')?.value;

  if (
    currentPassword &&
    newPassword &&
    currentPassword === newPassword
  ) {
    return { samePassword: true };
  }

  if (
    newPassword &&
    confirmPassword &&
    newPassword !== confirmPassword
  ) {
    return { passwordMismatch: true };
  }

  return null;
};

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css'
})
export class ChangePassword {
  private readonly auth = inject(Auth);
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = false;
  isSuccess = false;
  submitted = false;

  errorMessage = '';

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  // Form đổi mật khẩu
  changePasswordForm = new FormGroup(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required
        ]
      }),

      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
          )
        ]
      }),

      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required
        ]
      })
    },
    {
      validators: passwordValidator
    }
  );

  // Hiển thị lỗi validation
  getError(
    field: 'currentPassword' | 'newPassword' | 'confirmPassword'
  ): string | null {
    const control = this.changePasswordForm.controls[field];

    if (!control.touched && !this.submitted) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Vui lòng nhập thông tin này.';
    }

    if (
      field === 'newPassword' &&
      control.hasError('pattern')
    ) {
      return 'Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.';
    }

    if (
      field === 'newPassword' &&
      this.changePasswordForm.hasError('samePassword')
    ) {
      return 'Mật khẩu mới phải khác mật khẩu hiện tại.';
    }

    if (
      field === 'confirmPassword' &&
      this.changePasswordForm.hasError('passwordMismatch')
    ) {
      return 'Mật khẩu xác nhận không khớp.';
    }

    return null;
  }

  // Gửi yêu cầu đổi mật khẩu
  submit(): void {
    if (this.isLoading || this.isSuccess) {
      return;
    }

    this.submitted = true;
    this.errorMessage = '';

    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    if (!this.auth.hasAccessToken()) {
      this.errorMessage =
        'Bạn cần đăng nhập trước khi đổi mật khẩu.';

      this.cdr.markForCheck();
      return;
    }

    const formValue =
      this.changePasswordForm.getRawValue();

    const request: ChangePasswordRequest = {
      currentPassword: formValue.currentPassword,
      newPassword: formValue.newPassword,
      confirmPassword: formValue.confirmPassword
    };

    this.isLoading = true;
    this.cdr.markForCheck();

    this.auth.changePassword(request).subscribe({
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
        this.errorMessage = '';

        // Xóa dữ liệu mật khẩu khỏi form
        this.changePasswordForm.reset();

        // Yêu cầu đăng nhập lại
        this.auth.clearSession();

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        switch (error.status) {
          case 400:
            this.errorMessage =
              'Mật khẩu hiện tại không chính xác hoặc mật khẩu mới không hợp lệ.';
            break;

          case 401:
            this.auth.clearSession();
            this.errorMessage =
              'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
            break;

          case 409:
            this.errorMessage =
              'Tài khoản chưa có mật khẩu nội bộ nên không thể sử dụng chức năng này.';
            break;

          case 0:
            this.errorMessage =
              'Không thể kết nối đến Backend.';
            break;

          default:
            this.errorMessage =
              'Đổi mật khẩu thất bại. Vui lòng thử lại.';
        }

        this.cdr.markForCheck();
      }
    });
  }
}

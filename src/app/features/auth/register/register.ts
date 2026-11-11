
import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';

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
import { RegisterRequest } from '../../../core/models/auth.models';

// Các trường trong form đăng ký
type RegisterField =
  | 'fullName'
  | 'username'
  | 'email'
  | 'phoneNumber'
  | 'password'
  | 'confirmPassword';

// Kiểm tra mật khẩu xác nhận có trùng không
const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword =
    control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword
    ? null
    : { passwordMismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private readonly auth = inject(Auth);

  // Cập nhật giao diện khi API trả kết quả
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = false;
  isSuccess = false;
  submitted = false;

  errorMessage = '';

  showPassword = false;
  showConfirmPassword = false;

  // Reactive Form đăng ký
  registerForm = new FormGroup(
    {
      fullName: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.pattern(/^.*\S.*$/)
        ]
      }),

      username: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.pattern(/^.*\S.*$/)
        ]
      }),

      email: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.email
        ]
      }),

      phoneNumber: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.pattern(/^\+?[0-9]{9,15}$/)
        ]
      }),

      password: new FormControl('', {
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
      validators: passwordsMatchValidator
    }
  );

  // Hiển thị lỗi validation của từng trường
  getError(field: RegisterField): string | null {
    const control = this.registerForm.controls[field];

    if (!control.touched && !this.submitted) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Vui lòng nhập thông tin này.';
    }

    if (
      field === 'confirmPassword' &&
      this.registerForm.hasError('passwordMismatch')
    ) {
      return 'Mật khẩu xác nhận không khớp.';
    }

    if (
      (field === 'fullName' || field === 'username') &&
      control.hasError('pattern')
    ) {
      return 'Thông tin không được chỉ chứa khoảng trắng.';
    }

    if (
      field === 'email' &&
      control.hasError('email')
    ) {
      return 'Email không đúng định dạng.';
    }

    if (
      field === 'phoneNumber' &&
      control.hasError('pattern')
    ) {
      return 'Số điện thoại phải gồm 9–15 chữ số, có thể bắt đầu bằng +.';
    }

    if (
      field === 'password' &&
      control.hasError('pattern')
    ) {
      return 'Mật khẩu cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
    }

    return null;
  }

  // Gửi form đăng ký
  submit(): void {

    // Không gửi trùng request
    if (this.isLoading || this.isSuccess) {
      return;
    }

    this.submitted = true;
    this.errorMessage = '';

    const raw = this.registerForm.getRawValue();

    // Chuẩn hóa dữ liệu trước khi gửi
    const request: RegisterRequest = {
      fullName: raw.fullName.trim(),
      username: raw.username.trim(),
      email: raw.email.trim(),
      phoneNumber: raw.phoneNumber.trim(),
      password: raw.password,
      confirmPassword: raw.confirmPassword
    };

    this.registerForm.patchValue({
      fullName: request.fullName,
      username: request.username,
      email: request.email,
      phoneNumber: request.phoneNumber
    });

    // Không gọi API khi form không hợp lệ
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    // Bắt đầu loading
    this.isLoading = true;
    this.cdr.markForCheck();

    // Gọi Backend Register API
    this.auth.register(request).subscribe({

      // HTTP 201 - Đăng ký thành công
      next: () => {
        this.isLoading = false;
        this.isSuccess = true;
        this.errorMessage = '';

        // Xóa mật khẩu khỏi form
        this.registerForm.controls.password.reset('');
        this.registerForm.controls.confirmPassword.reset('');

        // Cập nhật giao diện
        this.cdr.markForCheck();
      },

      // Xử lý API trả lỗi
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.isSuccess = false;

        if (error.status === 409) {
          this.errorMessage =
            'Tên đăng nhập hoặc email đã tồn tại.';

        } else if (error.status === 400) {
          this.errorMessage =
            'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.';

        } else if (error.status === 0) {
          this.errorMessage =
            'Không thể kết nối đến máy chủ. Vui lòng thử lại.';

        } else {
          this.errorMessage =
            'Đăng ký thất bại. Vui lòng thử lại sau.';
        }

        // Quan trọng: cập nhật UI khi API trả lỗi
        this.cdr.markForCheck();
      }
    });
  }
}

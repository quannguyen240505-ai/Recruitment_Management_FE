import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  isLoading = false;
  errorMessage = '';
  showPassword = false;

  loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  submit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },

      error: (error: HttpErrorResponse) => {
        this.isLoading = false;

        if (error.status === 401) {
          this.errorMessage =
            'Tên đăng nhập hoặc mật khẩu không chính xác.';
          return;
        }

        if (error.status === 400) {
          this.errorMessage =
            'Vui lòng kiểm tra lại thông tin đăng nhập.';
          return;
        }

        this.errorMessage =
          'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
      }
    });
  }
}
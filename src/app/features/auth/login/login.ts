import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { Auth } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';
import {
  GoogleCredentialResponse,
  GoogleIdentity
} from '../../../core/services/google-identity';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements AfterViewInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly googleIdentity = inject(GoogleIdentity);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('googleButtonHost')
  googleButtonHost!: ElementRef<HTMLDivElement>;

  isGoogleLoading = false;
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

  async ngAfterViewInit(): Promise<void> {
    try {
      await this.googleIdentity.renderButton(
        this.googleButtonHost.nativeElement,
        environment.googleClientId,
        (response: GoogleCredentialResponse) => {
          this.handleGoogleCredential(response);
        }
      );
    } catch {
      this.errorMessage =
        'Không thể tải chức năng đăng nhập Google.';
      this.cdr.markForCheck();
    }
  }

  private handleGoogleCredential(
    response: GoogleCredentialResponse
  ): void {
    // Prevent duplicate callbacks from sending concurrent Google Login requests.
    if (this.isGoogleLoading) {
      return;
    }

    if (!response.credential) {
      this.errorMessage =
        'Không nhận được thông tin xác thực từ Google.';
      this.cdr.markForCheck();
      return;
    }

    this.isGoogleLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.auth.googleLogin(response.credential).subscribe({
      next: () => {
        this.isGoogleLoading = false;
        this.cdr.markForCheck();
        void this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.isGoogleLoading = false;

        if (error.status === 409) {
          this.errorMessage =
            'Email Google này đã được sử dụng bởi tài khoản khác.';
        } else if (error.status === 401) {
          this.errorMessage =
            'Không thể xác thực tài khoản Google.';
        } else if (error.status === 400) {
          this.errorMessage =
            'Thông tin đăng nhập Google không hợp lệ.';
        } else {
          this.errorMessage =
            'Đăng nhập Google thất bại. Vui lòng thử lại.';
        }

        this.cdr.markForCheck();
      }
    });
  }


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
      this.cdr.markForCheck();
      void this.router.navigate(['/dashboard']);
    },

    error: (error: HttpErrorResponse) => {
      this.isLoading = false;

      if (error.status === 401) {
        this.errorMessage =
          'Tên đăng nhập hoặc mật khẩu không chính xác.';
      } else if (error.status === 400) {
        this.errorMessage =
          'Vui lòng kiểm tra lại thông tin đăng nhập.';
      } else {
        this.errorMessage =
          'Không thể kết nối đến máy chủ. Vui lòng thử lại.';
      }

      this.cdr.markForCheck();
    }
  });
}
}

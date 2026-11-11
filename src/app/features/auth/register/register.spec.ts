
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { Register } from './register';
import { Auth } from '../../../core/services/auth';
import {
  RegisterRequest,
  RegisterResponse
} from '../../../core/models/auth.models';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  let authMock: {
    register: ReturnType<typeof vi.fn>;
  };

  const validData: RegisterRequest = {
    fullName: 'Nguyen Van Test',
    username: 'candidate_test_119',
    email: 'candidate119@example.com',
    phoneNumber: '0912345678',
    password: 'Test@12345',
    confirmPassword: 'Test@12345'
  };

  const mockResponse: RegisterResponse = {
    userId: 'user-119',
    username: 'candidate_test_119',
    email: 'candidate119@example.com',
    fullName: 'Nguyen Van Test',
    role: 'CANDIDATE'
  };

  beforeEach(async () => {
    authMock = {
      register: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: authMock
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillValidForm(): void {
    component.registerForm.setValue({ ...validData });
  }

  // TEST 1: Component khởi tạo thành công
  it('should create Register component', () => {
    expect(component).toBeTruthy();
  });

  // TEST 2: Không gửi form rỗng
  it('should reject an empty form', () => {
    component.submit();

    expect(component.registerForm.invalid).toBe(true);
    expect(component.submitted).toBe(true);
    expect(authMock.register).not.toHaveBeenCalled();
  });

  // TEST 3: Email không hợp lệ
  it('should reject invalid email', () => {
    fillValidForm();

    component.registerForm.controls.email.setValue(
      'invalid-email'
    );

    component.submit();

    expect(component.registerForm.invalid).toBe(true);
    expect(authMock.register).not.toHaveBeenCalled();
  });

  // TEST 4: Số điện thoại không hợp lệ
  it('should reject invalid phone number', () => {
    fillValidForm();

    component.registerForm.controls.phoneNumber.setValue(
      '123'
    );

    component.submit();

    expect(component.registerForm.invalid).toBe(true);
    expect(authMock.register).not.toHaveBeenCalled();
  });

  // TEST 5: Mật khẩu không đạt yêu cầu
  it('should reject weak password', () => {
    fillValidForm();

    component.registerForm.patchValue({
      password: '12345678',
      confirmPassword: '12345678'
    });

    component.submit();

    expect(component.registerForm.invalid).toBe(true);
    expect(authMock.register).not.toHaveBeenCalled();
  });

  // TEST 6: Xác nhận mật khẩu không khớp
  it('should reject mismatched passwords', () => {
    fillValidForm();

    component.registerForm.controls.confirmPassword.setValue(
      'Different@123'
    );

    component.submit();

    expect(
      component.registerForm.hasError('passwordMismatch')
    ).toBe(true);

    expect(authMock.register).not.toHaveBeenCalled();
  });

  // TEST 7: Họ tên và username chỉ chứa khoảng trắng
  it('should reject whitespace-only identity fields', () => {
    fillValidForm();

    component.registerForm.patchValue({
      fullName: '    ',
      username: '   '
    });

    component.submit();

    expect(component.registerForm.invalid).toBe(true);
    expect(authMock.register).not.toHaveBeenCalled();
  });

  // TEST 8: Đăng ký thành công
  it('should register successfully', () => {
    authMock.register.mockReturnValue(of(mockResponse));

    fillValidForm();
    component.submit();

    expect(authMock.register).toHaveBeenCalledTimes(1);
    expect(authMock.register).toHaveBeenCalledWith(validData);

    expect(component.isSuccess).toBe(true);
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('');

    // Không giữ mật khẩu sau khi đăng ký thành công
    expect(
      component.registerForm.controls.password.value
    ).toBe('');

    expect(
      component.registerForm.controls.confirmPassword.value
    ).toBe('');
  });

  // TEST 9-12: Xử lý lỗi từ Backend
  it.each([
    [
      409,
      'Tên đăng nhập hoặc email đã tồn tại.'
    ],
    [
      400,
      'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.'
    ],
    [
      0,
      'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
    ],
    [
      500,
      'Đăng ký thất bại. Vui lòng thử lại sau.'
    ]
  ])(
    'should handle registration HTTP error %i',
    (status, expectedMessage) => {
      authMock.register.mockReturnValue(
        throwError(() => new HttpErrorResponse({
          status
        }))
      );

      fillValidForm();
      component.submit();

      expect(component.errorMessage).toBe(expectedMessage);
      expect(component.isLoading).toBe(false);
      expect(component.isSuccess).toBe(false);
    }
  );

  // TEST 13: Không gửi trùng request đăng ký
  it('should prevent duplicate register requests', () => {
    const pendingRequest = new Subject<RegisterResponse>();

    authMock.register.mockReturnValue(
      pendingRequest.asObservable()
    );

    fillValidForm();

    component.submit();
    component.submit();

    expect(authMock.register).toHaveBeenCalledTimes(1);
    expect(component.isLoading).toBe(true);

    pendingRequest.next(mockResponse);
    pendingRequest.complete();

    expect(component.isLoading).toBe(false);
    expect(component.isSuccess).toBe(true);
  });
});

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    tokenType: string;
    expiresAtUtc: string;
    userId: string;
    username: string;
    role: string;
}

export interface GoogleLoginRequest {
    idToken: string;
}

// SCRUM-119: Candidate Registration
export interface RegisterRequest {
    fullName: string;
    username: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
}

export interface RegisterResponse {
    userId: string;
    username: string;
    email: string;
    fullName: string;
    role: string;
}

// SCRUM-135: Change Password
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

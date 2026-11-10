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
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}
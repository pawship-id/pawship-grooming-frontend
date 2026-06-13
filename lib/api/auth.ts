import { apiRequest } from "./client";

export interface AuthTokensResponse {
  message: string;
  access_token: string;
  refresh_token: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  phone_number: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  access_token: string;
  refresh_token: string;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthTokensResponse> {
  const payload = await apiRequest<AuthTokensResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!payload?.access_token || !payload?.refresh_token) {
    throw new Error("Token tidak ditemukan pada response login");
  }

  return payload;
}

export async function refreshTokenRequest(
  refreshToken: string,
): Promise<AuthTokensResponse> {
  const payload = await apiRequest<AuthTokensResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!payload?.access_token || !payload?.refresh_token) {
    throw new Error("Token tidak ditemukan pada response refresh");
  }

  return payload;
}

export async function registerRequest(
  payload: RegisterPayload,
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface CheckPhoneResponse {
  exists: boolean;
  hasEmail: boolean;
  hasPassword: boolean;
  username?: string;
  email?: string;
}

export async function checkPhoneRequest(
  phone_number: string,
): Promise<CheckPhoneResponse> {
  return apiRequest<CheckPhoneResponse>("/auth/check-phone", {
    method: "POST",
    body: JSON.stringify({ phone_number }),
  });
}

export interface SendPasswordSetupPayload {
  phone_number: string;
  email: string;
}

export interface SendPasswordSetupResponse {
  message: string;
}

export async function sendPasswordSetupRequest(
  payload: SendPasswordSetupPayload,
): Promise<SendPasswordSetupResponse> {
  return apiRequest<SendPasswordSetupResponse>("/auth/send-password-setup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface VerifySetupTokenResponse {
  valid: boolean;
  user: {
    username: string;
    phone_number: string;
    email?: string;
  };
}

export async function verifySetupTokenRequest(
  token: string,
): Promise<VerifySetupTokenResponse> {
  return apiRequest<VerifySetupTokenResponse>("/auth/verify-setup-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export interface SetPasswordPayload {
  token: string;
  password: string;
}

export interface SetPasswordResponse {
  message: string;
}

export async function setPasswordRequest(
  payload: SetPasswordPayload,
): Promise<SetPasswordResponse> {
  return apiRequest<SetPasswordResponse>("/auth/set-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export async function forgotPasswordRequest(
  payload: ForgotPasswordPayload,
): Promise<ForgotPasswordResponse> {
  return apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  user: {
    username: string;
    email?: string;
  };
}

export async function verifyResetTokenRequest(
  token: string,
): Promise<VerifyResetTokenResponse> {
  return apiRequest<VerifyResetTokenResponse>("/auth/verify-reset-token", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export async function resetPasswordRequest(
  payload: ResetPasswordPayload,
): Promise<ResetPasswordResponse> {
  return apiRequest<ResetPasswordResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

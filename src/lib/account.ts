import { apiFetch } from "./api";
import type { ForgotPasswordRequest, ResetPasswordRequest, VerifyEmailRequest } from "./types";

export function sendVerificationEmail(fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>("/api/v1/auth/send-verification-email", undefined, {}, fetchFn);
}

export function verifyEmail(token: string, fetchFn: typeof fetch = fetch): Promise<void> {
    const payload: VerifyEmailRequest = { token };
    return apiFetch.post<void>("/api/v1/auth/verify-email", payload, {}, fetchFn);
}

export function forgotPassword(email: string, fetchFn: typeof fetch = fetch): Promise<void> {
    const payload: ForgotPasswordRequest = { email };
    return apiFetch.post<void>("/api/v1/auth/forgot-password", payload, { auth: false }, fetchFn);
}

/** Confere o token de troca de senha antes de desenhar o formulário. */
export function checkResetToken(token: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.get<void>(
        "/api/v1/auth/reset-password",
        { query: { token }, auth: false },
        fetchFn,
    );
}

export function resetPassword(
    payload: ResetPasswordRequest,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    return apiFetch.post<void>("/api/v1/auth/reset-password", payload, { auth: false }, fetchFn);
}

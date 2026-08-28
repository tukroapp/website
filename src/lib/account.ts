import { apiFetch } from "./api";
import type {
    AccountDeletionScheduled,
    ApiResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
} from "./types";

/**
 * Corpo das duas ações de saída. Conta Google não tem senha: manda `{}` e a
 * sessão já é a prova. Conta com senha errada ou ausente responde `400`
 * `password.invalid`.
 */
function passwordBody(password: string): Record<string, string> {
    const trimmed = password.trim();
    return trimmed === "" ? {} : { password: trimmed };
}

/** Desativa a conta: o perfil some do site e as sessões caem. Reversível ao entrar de novo. */
export function deactivateAccount(password: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>("/api/v1/me", { body: passwordBody(password) }, fetchFn);
}

/**
 * Agenda a exclusão para daqui a 30 dias. Não há endpoint de cancelar: entrar de
 * novo antes do prazo desfaz o agendamento.
 */
export function scheduleAccountDeletion(
    password: string,
    fetchFn: typeof fetch = fetch,
): Promise<AccountDeletionScheduled> {
    return apiFetch
        .post<ApiResponse<AccountDeletionScheduled>>(
            "/api/v1/me/deletion",
            passwordBody(password),
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

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

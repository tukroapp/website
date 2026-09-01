import { apiFetch } from "#lib/api";
import { SESSION_COOKIE, deleteCookie } from "#lib/cookie";
import { clearToken, setToken } from "#lib/token";
import type {
    ApiResponse,
    ChangePasswordRequest,
    LoginCredentials,
    LoginResponse,
    MeResponse,
    RegisterRequest,
    RegisterResponse,
    UpdateProfileRequest,
} from "#lib/types";

class AuthState {
    user = $state<MeResponse | null>(null);
    fetched = $state(false);
    /** Atualizações novas no feed. Vem só do heartbeat `/me/unread`, não do `/me`. */
    feedUnseen = $state(0);

    get isAuthenticated(): boolean {
        return this.user !== null;
    }

    /**
     * E-mail confirmado libera as ações de escrita (recado, depoimento, mensagem,
     * comunidade, foto, amizade, fã, avaliação). Conta Google já nasce verificada.
     */
    get canWrite(): boolean {
        return this.user?.is_email_verified ?? false;
    }

    async login(credentials: LoginCredentials, fetchFn: typeof fetch = fetch): Promise<MeResponse> {
        const res = await apiFetch.post<ApiResponse<LoginResponse>>(
            "/api/v1/auth/login",
            credentials,
            {},
            fetchFn,
        );
        setToken(res.results.token);
        await this.fetchUser(fetchFn);
        if (!this.user) throw new Error("Não foi possível carregar o usuário após o login");
        return this.user;
    }

    async register(payload: RegisterRequest, fetchFn: typeof fetch = fetch): Promise<MeResponse> {
        await apiFetch.post<ApiResponse<RegisterResponse>>(
            "/api/v1/auth/register",
            payload,
            {},
            fetchFn,
        );
        return this.login({ email: payload.email, password: payload.password }, fetchFn);
    }

    /**
     * Grava o aceite da versão em vigor. Chame só no clique do botão: cada
     * chamada vira uma linha nova no histórico, que é a prova do consentimento.
     */
    async acceptTerms(fetchFn: typeof fetch = fetch): Promise<void> {
        await apiFetch.post<void>("/api/v1/me/terms", undefined, {}, fetchFn);
        await this.fetchUser(fetchFn);
    }

    async fetchUser(fetchFn: typeof fetch = fetch): Promise<void> {
        try {
            const res = await apiFetch.get<ApiResponse<MeResponse>>("/api/v1/me", {}, fetchFn);
            this.user = res.results;
        } catch {
            this.user = null;
            clearToken();
        } finally {
            this.fetched = true;
        }
    }

    async updateProfile(
        payload: UpdateProfileRequest,
        fetchFn: typeof fetch = fetch,
    ): Promise<MeResponse> {
        const res = await apiFetch.put<ApiResponse<MeResponse>>("/api/v1/me", payload, {}, fetchFn);
        this.user = res.results;
        return res.results;
    }

    async uploadAvatar(file: File, fetchFn: typeof fetch = fetch): Promise<MeResponse> {
        const body = new FormData();
        body.append("file", file);
        const res = await apiFetch.post<ApiResponse<MeResponse>>(
            "/api/v1/me/avatar",
            body,
            {},
            fetchFn,
        );
        this.user = res.results;
        return res.results;
    }

    async removeAvatar(fetchFn: typeof fetch = fetch): Promise<MeResponse> {
        const res = await apiFetch.delete<ApiResponse<MeResponse>>(
            "/api/v1/me/avatar",
            {},
            fetchFn,
        );
        this.user = res.results;
        return res.results;
    }

    async changePassword(
        payload: ChangePasswordRequest,
        fetchFn: typeof fetch = fetch,
    ): Promise<void> {
        await apiFetch.post<void>("/api/v1/auth/change-password", payload, {}, fetchFn);
    }

    /** Encerra toda sessão, inclusive esta, então o token local também é descartado. */
    async logoutAll(fetchFn: typeof fetch = fetch): Promise<void> {
        try {
            await apiFetch.post<void>("/api/v1/auth/logout-all", undefined, {}, fetchFn);
        } finally {
            this.clear();
        }
    }

    async logout(fetchFn: typeof fetch = fetch): Promise<void> {
        try {
            await apiFetch.post<void>("/api/v1/auth/logout", undefined, {}, fetchFn);
        } finally {
            this.clear();
        }
    }

    /** Mantém o contador do sininho em dia sem uma ida ao `/me`. */
    setUnreadNotifications(count: number): void {
        if (this.user) this.user.unread_notifications_count = Math.max(0, count);
    }

    /** Mesma ideia para o badge de mensagens, alimentado pelo heartbeat e pela conversa aberta. */
    setUnreadMessages(count: number): void {
        if (this.user) this.user.unread_messages_count = Math.max(0, count);
    }

    setFeedUnseen(count: number): void {
        this.feedUnseen = Math.max(0, count);
    }

    setUser(user: MeResponse): void {
        this.user = user;
    }

    clear(): void {
        this.user = null;
        this.fetched = false;
        this.feedUnseen = 0;
        clearToken();
        deleteCookie(SESSION_COOKIE);
    }
}

export const auth = new AuthState();

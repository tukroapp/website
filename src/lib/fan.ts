import { apiFetch } from "./api";
import type { ApiCursorPaginatedResponse, ApiResponse, FanStatus, ProfileSummary } from "./types";

const FAN_PAGE_SIZE = 20;

/** Idempotente: chamar de novo não dá erro, sempre devolve o estado atual. */
export function becomeFan(slug: string, fetchFn: typeof fetch = fetch): Promise<FanStatus> {
    return apiFetch
        .post<ApiResponse<FanStatus>>(
            `/api/v1/profile/${encodeURIComponent(slug)}/fan`,
            undefined,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function stopBeingFan(slug: string, fetchFn: typeof fetch = fetch): Promise<FanStatus> {
    return apiFetch
        .delete<ApiResponse<FanStatus>>(
            `/api/v1/profile/${encodeURIComponent(slug)}/fan`,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

/** Lista pública, mais recentes primeiro. */
export function fetchFans(
    slug: string,
    cursor: string | null = null,
    limit: number = FAN_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ProfileSummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ProfileSummary>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/fan`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

/** De quem esse perfil é fã (ídolos): o outro lado de `fetchFans`. Mesmas regras. */
export function fetchIdols(
    slug: string,
    cursor: string | null = null,
    limit: number = FAN_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ProfileSummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ProfileSummary>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/idol`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

import { apiFetch } from "./api";
import type { ApiCursorPaginatedResponse, ApiResponse, Scrap } from "./types";

const SCRAP_PAGE_SIZE = 20;
export const SCRAP_MAX_LENGTH = 2000;

/** Mural de um perfil, só o primeiro nível, do mais novo para o mais antigo. */
export function fetchProfileScraps(
    slug: string,
    cursor: string | null = null,
    limit: number = SCRAP_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<Scrap>> {
    return apiFetch.get<ApiCursorPaginatedResponse<Scrap>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/scrap`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function createScrap(
    slug: string,
    body: string,
    fetchFn: typeof fetch = fetch,
): Promise<Scrap> {
    return apiFetch
        .post<ApiResponse<Scrap>>(
            `/api/v1/profile/${encodeURIComponent(slug)}/scrap`,
            { body },
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function fetchScrapReplies(
    id: string,
    cursor: string | null = null,
    limit: number = SCRAP_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<Scrap>> {
    return apiFetch.get<ApiCursorPaginatedResponse<Scrap>>(
        `/api/v1/scrap/${id}/reply`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function createScrapReply(
    id: string,
    body: string,
    fetchFn: typeof fetch = fetch,
): Promise<Scrap> {
    return apiFetch
        .post<ApiResponse<Scrap>>(`/api/v1/scrap/${id}/reply`, { body }, {}, fetchFn)
        .then((res) => res.results);
}

/** Só o autor edita, qualquer outra pessoa recebe 404. */
export function updateScrap(
    id: string,
    body: string,
    fetchFn: typeof fetch = fetch,
): Promise<Scrap> {
    return apiFetch
        .put<ApiResponse<Scrap>>(`/api/v1/scrap/${id}`, { body }, {}, fetchFn)
        .then((res) => res.results);
}

/** Liberado para o autor e para o dono do mural. Apaga as respostas junto. */
export function deleteScrap(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/scrap/${id}`, {}, fetchFn);
}

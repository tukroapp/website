import { apiFetch } from "./api";
import type { ApiCursorPaginatedResponse, ApiResponse, PollRequest, PollResponse } from "./types";

const POLL_PAGE_SIZE = 20;
export const POLL_QUESTION_MAX_LENGTH = 300;
export const POLL_OPTION_MAX_LENGTH = 120;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 10;

/** Página de enquetes de uma comunidade, da mais nova para a mais antiga. */
export function fetchCommunityPolls(
    slug: string,
    cursor: string | null = null,
    limit: number = POLL_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<PollResponse>> {
    return apiFetch.get<ApiCursorPaginatedResponse<PollResponse>>(
        `/api/v1/community/${encodeURIComponent(slug)}/poll`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function createPoll(
    slug: string,
    payload: PollRequest,
    fetchFn: typeof fetch = fetch,
): Promise<PollResponse> {
    return apiFetch
        .post<ApiResponse<PollResponse>>(
            `/api/v1/community/${encodeURIComponent(slug)}/poll`,
            payload,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function fetchPoll(id: string, fetchFn: typeof fetch = fetch): Promise<PollResponse> {
    return apiFetch
        .get<ApiResponse<PollResponse>>(`/api/v1/poll/${id}`, {}, fetchFn)
        .then((res) => res.results);
}

export function updatePoll(
    id: string,
    payload: PollRequest,
    fetchFn: typeof fetch = fetch,
): Promise<PollResponse> {
    return apiFetch
        .put<ApiResponse<PollResponse>>(`/api/v1/poll/${id}`, payload, {}, fetchFn)
        .then((res) => res.results);
}

export function deletePoll(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/poll/${id}`, {}, fetchFn);
}

/** Encerra a enquete de vez: não há reabrir. */
export function closePoll(id: string, fetchFn: typeof fetch = fetch): Promise<PollResponse> {
    return apiFetch
        .post<ApiResponse<PollResponse>>(`/api/v1/poll/${id}/close`, undefined, {}, fetchFn)
        .then((res) => res.results);
}

/** O voto é único e definitivo: não há como trocar nem retirar depois. */
export function votePoll(
    id: string,
    optionIds: string[],
    fetchFn: typeof fetch = fetch,
): Promise<PollResponse> {
    return apiFetch
        .post<ApiResponse<PollResponse>>(
            `/api/v1/poll/${id}/vote`,
            { option_ids: optionIds },
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

/** Estado da enquete para as listas e o cabeçalho do detalhe. */
export function pollStatusLabel(poll: PollResponse): string {
    if (poll.is_closed) {
        const byTime = Date.now() >= new Date(poll.closes_at).getTime();
        return byTime ? "encerrada" : "encerrada pela moderação";
    }

    const minutes = Math.max(
        1,
        Math.floor((new Date(poll.closes_at).getTime() - Date.now()) / 60_000),
    );
    if (minutes < 60) return `encerra em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;

    const hours = Math.floor(minutes / 60);
    return `encerra em ${hours} ${hours === 1 ? "hora" : "horas"}`;
}

/** Porcentagem de uma opção sobre os votantes distintos. Em multi-escolha a soma passa de 100%. */
export function optionPercent(votes: number, totalVotes: number): number {
    if (totalVotes <= 0) return 0;
    return Math.round((votes / totalVotes) * 100);
}

export function votesLabel(count: number): string {
    return `${count} ${count === 1 ? "voto" : "votos"}`;
}

export function choiceCountHint(minChoices: number, maxChoices: number): string {
    if (minChoices === maxChoices) {
        return `marque ${minChoices} ${minChoices === 1 ? "opção" : "opções"}`;
    }
    return `marque de ${minChoices} a ${maxChoices} opções`;
}

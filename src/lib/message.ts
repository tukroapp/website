import { apiFetch } from "./api";
import { ApiError } from "./error";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    ConversationSummary,
    MessageResponse,
    UnreadCounts,
} from "./types";

const CONVERSATION_PAGE_SIZE = 20;
const MESSAGE_PAGE_SIZE = 30;
export const MESSAGE_MAX_LENGTH = 10_000;

/** Heartbeat: dois COUNT indexados, resposta minúscula, seguro de rodar sempre que a aba está visível. */
export function fetchUnreadCounts(fetchFn: typeof fetch = fetch): Promise<UnreadCounts> {
    return apiFetch
        .get<ApiResponse<UnreadCounts>>("/api/v1/me/unread", {}, fetchFn)
        .then((res) => res.results);
}

export function fetchConversations(
    cursor: string | null = null,
    limit: number = CONVERSATION_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ConversationSummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ConversationSummary>>(
        "/api/v1/me/conversation",
        { query: { limit, cursor } },
        fetchFn,
    );
}

/** Null quando ainda não existe conversa com essa pessoa (o backend responde 404). */
export function fetchConversationWith(
    slug: string,
    fetchFn: typeof fetch = fetch,
): Promise<ConversationSummary | null> {
    return apiFetch
        .get<ApiResponse<ConversationSummary>>(
            `/api/v1/me/conversation/with/${encodeURIComponent(slug)}`,
            {},
            fetchFn,
        )
        .then((res) => res.results)
        .catch((error) => {
            if (error instanceof ApiError && error.status === 404) return null;
            throw error;
        });
}

export function fetchConversation(
    id: string,
    fetchFn: typeof fetch = fetch,
): Promise<ConversationSummary> {
    return apiFetch
        .get<ApiResponse<ConversationSummary>>(`/api/v1/me/conversation/${id}`, {}, fetchFn)
        .then((res) => res.results);
}

/** Histórico, mais nova primeiro. Não marca lido, então é seguro pollar a página 1. */
export function fetchMessages(
    conversationId: string,
    cursor: string | null = null,
    limit: number = MESSAGE_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<MessageResponse>> {
    return apiFetch.get<ApiCursorPaginatedResponse<MessageResponse>>(
        `/api/v1/me/conversation/${conversationId}/message`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

/** Cria a conversa se ainda não existir. A resposta já vem pronta para dar append. */
export function sendMessage(
    slug: string,
    body: string,
    fetchFn: typeof fetch = fetch,
): Promise<MessageResponse> {
    return apiFetch
        .post<ApiResponse<MessageResponse>>(
            `/api/v1/profile/${encodeURIComponent(slug)}/message`,
            { body },
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

/** Avança `last_read_at` para agora. Só chame com a conversa de fato à vista. */
export function markConversationRead(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/me/conversation/${id}/read`, undefined, {}, fetchFn);
}

/** Some da sua lista. Volta sozinha se a outra pessoa mandar mensagem nova. */
export function hideConversation(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/me/conversation/${id}`, {}, fetchFn);
}

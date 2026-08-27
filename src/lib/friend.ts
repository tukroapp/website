import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    FriendRequestDirection,
    FriendRequestItem,
    FriendRequestResult,
    ProfileSummary,
} from "./types";

const FRIEND_PAGE_SIZE = 20;

/** `q` filtra os amigos daquele perfil por nome ou slug. */
export function fetchProfileFriends(
    slug: string,
    q: string | null = null,
    cursor: string | null = null,
    limit: number = FRIEND_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ProfileSummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ProfileSummary>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/friend`,
        { query: { q: q || null, limit, cursor } },
        fetchFn,
    );
}

export function fetchFriendRequests(
    direction: FriendRequestDirection = "received",
    cursor: string | null = null,
    limit: number = FRIEND_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<FriendRequestItem>> {
    return apiFetch.get<ApiCursorPaginatedResponse<FriendRequestItem>>(
        "/api/v1/friend/request",
        { query: { direction, limit, cursor } },
        fetchFn,
    );
}

export function sendFriendRequest(
    slug: string,
    fetchFn: typeof fetch = fetch,
): Promise<FriendRequestResult> {
    return apiFetch
        .post<ApiResponse<FriendRequestResult>>(
            `/api/v1/friend/request/${encodeURIComponent(slug)}`,
            undefined,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

/** Cancela o pedido pendente que o usuário logado mandou para aquele slug. */
export function cancelFriendRequest(slug: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/friend/request/${encodeURIComponent(slug)}`, {}, fetchFn);
}

export function acceptFriendRequest(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/friend/request/${id}/accept`, undefined, {}, fetchFn);
}

export function rejectFriendRequest(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/friend/request/${id}/reject`, undefined, {}, fetchFn);
}

export function removeFriend(slug: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/friend/${encodeURIComponent(slug)}`, {}, fetchFn);
}

/**
 * O perfil não carrega o id do pedido, então ele é procurado pelo slug de quem enviou.
 * Devolve null quando o pedido não está mais pendente.
 */
export async function findReceivedRequestId(
    slug: string,
    fetchFn: typeof fetch = fetch,
): Promise<string | null> {
    let cursor: string | null = null;

    do {
        const page: ApiCursorPaginatedResponse<FriendRequestItem> = await fetchFriendRequests(
            "received",
            cursor,
            FRIEND_PAGE_SIZE,
            fetchFn,
        );
        const match = page.results.find((item) => item.slug === slug);
        if (match) return match.id;
        cursor = page.next_cursor;
    } while (cursor !== null);

    return null;
}

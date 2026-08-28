import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    FriendRequestDirection,
    FriendRequestItem,
    FriendRequestResult,
    ProfileSummary,
    TopFriendsResult,
} from "./types";

const FRIEND_PAGE_SIZE = 20;

/** A grade 3x3 do perfil antigo. O backend recusa mais que isso. */
export const TOP_FRIENDS_MAX = 9;

/**
 * `q` filtra os amigos daquele perfil por nome ou slug. `mutual` restringe a
 * quem também é amigo de quem está olhando (ignorado para anônimo e no próprio
 * perfil).
 */
export function fetchProfileFriends(
    slug: string,
    q: string | null = null,
    cursor: string | null = null,
    limit: number = FRIEND_PAGE_SIZE,
    mutual: boolean = false,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ProfileSummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ProfileSummary>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/friend`,
        { query: { q: q || null, limit, cursor, mutual: mutual || null } },
        fetchFn,
    );
}

/**
 * Substitui a seleção inteira de amigos em destaque. A ordem do array é a ordem
 * de exibição. `[]` limpa tudo. `400` em `slugs` quando algum não é amigo
 * (`not_a_friend`, com `params.slug`), quando há repetição (`duplicated`), ou
 * quando passa de 9.
 */
export function setTopFriends(
    slugs: string[],
    fetchFn: typeof fetch = fetch,
): Promise<TopFriendsResult> {
    return apiFetch
        .put<ApiResponse<TopFriendsResult>>("/api/v1/friend/top", { slugs }, {}, fetchFn)
        .then((res) => res.results);
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

import { apiFetch } from "./api";
import type { ApiCursorPaginatedResponse, FeedItem, FeedGroup, FeedKind } from "./types";

const FEED_PAGE_SIZE = 20;

/** Puro, não mexe no `feed_seen_at`: seguro de pollar a página 1. */
export function fetchFeed(
    cursor: string | null = null,
    limit: number = FEED_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<FeedItem>> {
    return apiFetch.get<ApiCursorPaginatedResponse<FeedItem>>(
        "/api/v1/me/feed",
        { query: { limit, cursor } },
        fetchFn,
    );
}

/** Marca o feed como visto até agora e zera o contador. */
export function markFeedSeen(fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>("/api/v1/me/feed/seen", undefined, {}, fetchFn);
}

/** O backend emite uma linha por arquivo (e às vezes recados repetidos); estas colapsam. */
const GROUPABLE: ReadonlySet<FeedKind> = new Set([
    "media_added",
    "community_joined",
    "status_changed",
]);
const GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Junta linhas consecutivas do mesmo ator e mesmo tipo numa janela curta. */
export function groupFeed(items: FeedItem[]): FeedGroup[] {
    const groups: FeedGroup[] = [];

    for (const item of items) {
        const open = groups.at(-1);
        const withinWindow =
            open !== undefined &&
            new Date(open.oldest_at).getTime() - new Date(item.created_at).getTime() <=
                GROUP_WINDOW_MS;

        if (
            open !== undefined &&
            withinWindow &&
            GROUPABLE.has(item.kind) &&
            open.lead.kind === item.kind &&
            open.lead.actor.id === item.actor.id
        ) {
            open.count += 1;
            open.oldest_at = item.created_at;
            if (item.media) open.media.push(item.media);
            continue;
        }

        groups.push({
            id: item.id,
            lead: item,
            count: 1,
            oldest_at: item.created_at,
            media: item.media ? [item.media] : [],
        });
    }

    return groups;
}

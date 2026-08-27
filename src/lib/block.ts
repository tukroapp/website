import { apiFetch } from "./api";
import type { ApiCursorPaginatedResponse, ProfileSummary } from "./types";

const BLOCK_PAGE_SIZE = 20;

export function fetchBlocks(
    cursor: string | null = null,
    limit: number = BLOCK_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ProfileSummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ProfileSummary>>(
        "/api/v1/block",
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function blockProfile(slug: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/block/${encodeURIComponent(slug)}`, undefined, {}, fetchFn);
}

export function unblockProfile(slug: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/block/${encodeURIComponent(slug)}`, {}, fetchFn);
}

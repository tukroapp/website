import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    ProfileResponse,
    ProfileSummary,
} from "./types";

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_PAGE_SIZE = 20;

export function fetchProfile(
    slug: string,
    fetchFn: typeof fetch = fetch,
): Promise<ProfileResponse> {
    return apiFetch
        .get<ApiResponse<ProfileResponse>>(
            `/api/v1/profile/${encodeURIComponent(slug)}`,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function searchProfiles(
    q: string,
    cursor: string | null = null,
    limit: number = SEARCH_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<ProfileSummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<ProfileSummary>>(
        "/api/v1/profile",
        { query: { q, limit, cursor } },
        fetchFn,
    );
}

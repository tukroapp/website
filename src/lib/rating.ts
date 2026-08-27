import { apiFetch } from "./api";
import type { ApiResponse, MyRating, RatingAxisKey, RatingSummary } from "./types";

export const RATING_MAX = 3;

export const RATING_AXES: { key: RatingAxisKey; label: string }[] = [
    { key: "trusty", label: "confiável" },
    { key: "cool", label: "legal" },
    { key: "sexy", label: "sexy" },
];

/** Só amigos avaliam, e avaliar de novo substitui a avaliação anterior. */
export function rateProfile(
    slug: string,
    rating: MyRating,
    fetchFn: typeof fetch = fetch,
): Promise<RatingSummary> {
    return apiFetch
        .put<ApiResponse<RatingSummary>>(
            `/api/v1/profile/${encodeURIComponent(slug)}/rating`,
            rating,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function deleteRating(slug: string, fetchFn: typeof fetch = fetch): Promise<RatingSummary> {
    return apiFetch
        .delete<ApiResponse<RatingSummary>>(
            `/api/v1/profile/${encodeURIComponent(slug)}/rating`,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

import { apiFetch } from "./api";
import type { ApiResponse, MyRating, RatingAxisKey, RatingSummary } from "./types";

export const RATING_MAX = 3;

export const RATING_AXES: { key: RatingAxisKey; label: string }[] = [
    { key: "trusty", label: "confiável" },
    { key: "cool", label: "legal" },
    { key: "sexy", label: "sexy" },
];

/**
 * Quanto do ícone da posição `index` fica preenchido, de 0 a 1. A média vai de
 * 0 a RATING_MAX, então cada ícone recebe a sobra da média depois dos anteriores:
 * média 2.5 preenche os dois primeiros e metade do terceiro.
 */
export function axisFill(average: number | null, index: number): number {
    return Math.min(Math.max((average ?? 0) - index, 0), 1);
}

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

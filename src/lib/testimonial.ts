import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    Testimonial,
    TestimonialDirection,
    TestimonialStatus,
} from "./types";

const TESTIMONIAL_PAGE_SIZE = 20;
export const TESTIMONIAL_MAX_LENGTH = 5000;

/** Lista pública de um perfil, só os aceitos, do mais novo para o mais antigo. */
export function fetchProfileTestimonials(
    slug: string,
    cursor: string | null = null,
    limit: number = TESTIMONIAL_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<Testimonial>> {
    return apiFetch.get<ApiCursorPaginatedResponse<Testimonial>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/testimonial`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

/** Cria sempre um depoimento novo aguardando aprovação, o mesmo autor pode escrever vários. */
export function createTestimonial(
    slug: string,
    body: string,
    fetchFn: typeof fetch = fetch,
): Promise<Testimonial> {
    return apiFetch
        .post<ApiResponse<Testimonial>>(
            `/api/v1/profile/${encodeURIComponent(slug)}/testimonial`,
            { body },
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

/** Caixa de moderação quando recebido, histórico próprio quando enviado. */
export function fetchTestimonials(
    direction: TestimonialDirection = "received",
    status: TestimonialStatus | null = null,
    cursor: string | null = null,
    limit: number = TESTIMONIAL_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<Testimonial>> {
    return apiFetch.get<ApiCursorPaginatedResponse<Testimonial>>(
        "/api/v1/testimonial",
        { query: { direction, status, limit, cursor } },
        fetchFn,
    );
}

export function acceptTestimonial(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/testimonial/${id}/accept`, undefined, {}, fetchFn);
}

export function rejectTestimonial(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/testimonial/${id}/reject`, undefined, {}, fetchFn);
}

/** Só o autor edita, e editar manda o depoimento de volta para aprovação. */
export function updateTestimonial(
    id: string,
    body: string,
    fetchFn: typeof fetch = fetch,
): Promise<Testimonial> {
    return apiFetch
        .put<ApiResponse<Testimonial>>(`/api/v1/testimonial/${id}`, { body }, {}, fetchFn)
        .then((res) => res.results);
}

/** Liberado para o autor e para o dono do perfil. */
export function deleteTestimonial(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/testimonial/${id}`, {}, fetchFn);
}

import { apiFetch } from "./api";
import type {
    AlbumDetail,
    AlbumRequest,
    AlbumSummary,
    AlbumVisibility,
    ApiCursorPaginatedResponse,
    ApiResponse,
} from "./types";

const ALBUM_PAGE_SIZE = 20;

export const ALBUM_TITLE_MAX_LENGTH = 100;
export const ALBUM_DESCRIPTION_MAX_LENGTH = 2000;

/** Limite de fotos por álbum. Estourar devolve 409. */
export const ALBUM_PHOTOS_LIMIT = 20;

export const ALBUM_VISIBILITY_OPTIONS: {
    value: AlbumVisibility;
    label: string;
    hint: string;
}[] = [
    { value: "everyone", label: "Todos", hint: "Qualquer visitante que enxergue o perfil." },
    { value: "friends", label: "Somente amigos", hint: "Some para quem não é seu amigo." },
    { value: "nobody", label: "Somente eu", hint: "Ninguém além de você." },
];

export function albumVisibilityLabel(visibility: AlbumVisibility): string {
    return ALBUM_VISIBILITY_OPTIONS.find((item) => item.value === visibility)?.label ?? visibility;
}

export function fetchProfileAlbums(
    slug: string,
    cursor: string | null = null,
    limit: number = ALBUM_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<AlbumSummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<AlbumSummary>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/album`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function fetchAlbum(id: string, fetchFn: typeof fetch = fetch): Promise<AlbumDetail> {
    return apiFetch
        .get<ApiResponse<AlbumDetail>>(`/api/v1/album/${id}`, {}, fetchFn)
        .then((res) => res.results);
}

export function createAlbum(
    payload: AlbumRequest,
    fetchFn: typeof fetch = fetch,
): Promise<AlbumSummary> {
    return apiFetch
        .post<ApiResponse<AlbumSummary>>("/api/v1/me/album", payload, {}, fetchFn)
        .then((res) => res.results);
}

/** Responde só o resumo: as fotos não vêm de volta. */
export function updateAlbum(
    id: string,
    payload: AlbumRequest,
    fetchFn: typeof fetch = fetch,
): Promise<AlbumSummary> {
    return apiFetch
        .put<ApiResponse<AlbumSummary>>(`/api/v1/me/album/${id}`, payload, {}, fetchFn)
        .then((res) => res.results);
}

/** Apaga o álbum e as fotos dentro, arquivos inclusive. */
export function deleteAlbum(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/me/album/${id}`, {}, fetchFn);
}

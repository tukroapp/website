import { apiFetch, apiUpload } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    Media,
    MediaComment,
    MediaKind,
    MediaUpdate,
} from "./types";

const MEDIA_PAGE_SIZE = 20;
const MEDIA_MAX_BYTES = 25 * 1024 * 1024;

/** Limites do plano gratuito do bucket. Estourar devolve 409 (`media_limit_reached`). */
export const MEDIA_LIMITS: Record<MediaKind, number> = { photo: 30, video: 2 };

export const MEDIA_CAPTION_MAX_LENGTH = 500;
export const MEDIA_COMMENT_MAX_LENGTH = 1000;

/** A contagem cabe numa página só: os limites são baixos. */
export const MEDIA_COUNT_LIMIT = 100;

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export const MEDIA_KINDS: { value: MediaKind; singular: string; plural: string }[] = [
    { value: "photo", singular: "foto", plural: "fotos" },
    { value: "video", singular: "vídeo", plural: "vídeos" },
];

export function mediaKindLabel(kind: MediaKind, plural = false): string {
    const entry = MEDIA_KINDS.find((item) => item.value === kind);
    if (!entry) return kind;
    return plural ? entry.plural : entry.singular;
}

export function mediaKindOf(file: File): MediaKind | null {
    if (PHOTO_TYPES.includes(file.type)) return "photo";
    if (VIDEO_TYPES.includes(file.type)) return "video";
    return null;
}

/** Resposta rápida antes de um upload de 25 MB. O backend lê os bytes e dá a palavra final. */
export function mediaProblem(file: File): string | null {
    if (file.size === 0) return "O arquivo está vazio.";
    if (file.size > MEDIA_MAX_BYTES) return "O arquivo precisa ter no máximo 25 MB.";
    if (mediaKindOf(file) === null) {
        return "Formato não aceito. Fotos em JPEG, PNG, WebP ou GIF; vídeos em MP4, MOV ou WebM.";
    }
    return null;
}

export function fetchProfileMedia(
    slug: string,
    kind: MediaKind | null = null,
    cursor: string | null = null,
    limit: number = MEDIA_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<Media>> {
    return apiFetch.get<ApiCursorPaginatedResponse<Media>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/media`,
        { query: { kind, limit, cursor } },
        fetchFn,
    );
}

export function uploadMedia(
    file: File,
    opts: { albumId?: string | null; caption?: string | null } = {},
    onProgress?: (ratio: number) => void,
): Promise<Media> {
    const body = new FormData();
    body.append("file", file);
    if (opts.albumId) body.append("album_id", opts.albumId);
    if (opts.caption && opts.caption.trim() !== "") body.append("caption", opts.caption.trim());

    return apiUpload<ApiResponse<Media>>("/api/v1/me/media", body, onProgress).then(
        (res) => res.results,
    );
}

/** Edita legenda, move de álbum (`album_id`) e ordena (`position`). Responde 204. */
export function updateMedia(
    id: string,
    payload: MediaUpdate,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    return apiFetch.put<void>(`/api/v1/me/media/${id}`, payload, {}, fetchFn);
}

export function deleteMedia(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/me/media/${id}`, {}, fetchFn);
}

/** Comentários da foto, do mais antigo para o mais novo. `404` se o visitante não alcança a foto. */
export function fetchMediaComments(
    mediaId: string,
    cursor: string | null = null,
    limit: number = MEDIA_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<MediaComment>> {
    return apiFetch.get<ApiCursorPaginatedResponse<MediaComment>>(
        `/api/v1/media/${mediaId}/comment`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function createMediaComment(
    mediaId: string,
    body: string,
    fetchFn: typeof fetch = fetch,
): Promise<MediaComment> {
    return apiFetch
        .post<ApiResponse<MediaComment>>(
            `/api/v1/media/${mediaId}/comment`,
            { body: body.trim() },
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

/** Autor do comentário ou dono da foto. */
export function deleteMediaComment(
    mediaId: string,
    commentId: string,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/media/${mediaId}/comment/${commentId}`, {}, fetchFn);
}

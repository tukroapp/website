import { apiFetch, apiUpload } from "./api";
import type { ApiCursorPaginatedResponse, ApiResponse, Media, MediaKind } from "./types";

const MEDIA_PAGE_SIZE = 20;
const MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export const MEDIA_LIMITS: Record<MediaKind, number> = { photo: 10, video: 5 };

/** O álbum nunca passa de quinze itens, então uma página já é a contagem inteira. */
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

export function uploadMedia(file: File, onProgress?: (ratio: number) => void): Promise<Media> {
    const body = new FormData();
    body.append("file", file);

    return apiUpload<ApiResponse<Media>>("/api/v1/me/media", body, onProgress).then(
        (res) => res.results,
    );
}

export function deleteMedia(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/me/media/${id}`, {}, fetchFn);
}

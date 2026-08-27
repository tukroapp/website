export type MediaKind = "photo" | "video";

export interface Media {
    id: string;
    kind: MediaKind;
    /** URL absoluta montada pelo backend: o host muda entre dev e produção. */
    url: string;
    content_type: string;
    size_bytes: number;
    created_at: string;
}

export type MediaCounts = Record<MediaKind, number>;

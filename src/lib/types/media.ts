import type { ProfileSummary } from "./user";

export type MediaKind = "photo" | "video";

/** Visibilidade por álbum. O `profile_visibility` do perfil ainda manda por cima. */
export type AlbumVisibility = "everyone" | "friends" | "nobody";

export interface Media {
    id: string;
    kind: MediaKind;
    /** URL absoluta montada pelo backend: o host muda entre dev e produção. */
    url: string;
    content_type: string;
    size_bytes: number;
    created_at: string;
    caption: string | null;
    /** Null para foto solta, fora de qualquer álbum. */
    album_id: string | null;
    /** Ordem dentro do álbum, crescente e depois por data. Pode ser negativa. */
    position: number;
    comments_count: number;
}

export type MediaCounts = Record<MediaKind, number>;

export interface AlbumSummary {
    id: string;
    title: string;
    description: string | null;
    visibility: AlbumVisibility;
    cover_url: string | null;
    photos_count: number;
    created_at: string;
}

export interface AlbumDetail extends AlbumSummary {
    owner_slug: string;
    photos: Media[];
}

/** Corpo do POST e do PUT. `cover_media_id` só vale no PUT e precisa ser foto daquele álbum. */
export interface AlbumRequest {
    title: string;
    description: string | null;
    visibility: AlbumVisibility;
    cover_media_id?: string | null;
}

/** Corpo do PUT de foto: cada campo é opcional. */
export interface MediaUpdate {
    caption?: string | null;
    album_id?: string | null;
    position?: number;
}

/** Comentário de foto, linear (sem resposta). */
export interface MediaComment {
    id: string;
    body: string;
    created_at: string;
    /** Null quando a conta do autor saiu do ar. */
    author: ProfileSummary | null;
}

import { error } from "@sveltejs/kit";
import { fetchProfileAlbums } from "#lib/album";
import { ApiError } from "#lib/error";
import { fetchProfileMedia } from "#lib/media";
import { fetchProfile } from "#lib/profile";
import type { AlbumSummary, Media, MediaCounts, MediaKind } from "#lib/types";
import type { PageLoadEvent } from "./$types";

function readKind(value: string | null): MediaKind | null {
    return value === "photo" || value === "video" ? value : null;
}

export async function load({ params, url, fetch }: PageLoadEvent) {
    const kind = readKind(url.searchParams.get("kind"));

    let profile;
    try {
        profile = await fetchProfile(params.slug, fetch);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }

    const isOwner = profile.relationship === "self";

    try {
        const [page, albumPage] = await Promise.all([
            fetchProfileMedia(params.slug, kind, null, undefined, fetch),
            fetchProfileAlbums(params.slug, null, undefined, fetch),
        ]);
        return {
            profile,
            kind,
            media: page.results,
            nextCursor: page.next_cursor,
            albums: albumPage.results,
            albumsCursor: albumPage.next_cursor,
            isPrivate: false,
            // O dono vê "7/30 fotos", e os dois contadores já vêm no perfil.
            counts: isOwner
                ? { photo: profile.photos_count ?? 0, video: profile.videos_count ?? 0 }
                : null,
        };
    } catch (err) {
        // O único 403 aqui é o dono mantendo o perfil privado.
        if (err instanceof ApiError && err.status === 403) {
            return {
                profile,
                kind,
                media: [] as Media[],
                nextCursor: null as string | null,
                albums: [] as AlbumSummary[],
                albumsCursor: null as string | null,
                isPrivate: true,
                counts: null as MediaCounts | null,
            };
        }
        throw err;
    }
}

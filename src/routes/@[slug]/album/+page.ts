import { error } from "@sveltejs/kit";
import { ApiError } from "#lib/error";
import { MEDIA_COUNT_LIMIT, fetchProfileMedia } from "#lib/media";
import { fetchProfile } from "#lib/profile";
import type { Media, MediaCounts, MediaKind } from "#lib/types";
import type { PageLoadEvent } from "./$types";

function readKind(value: string | null): MediaKind | null {
    return value === "photo" || value === "video" ? value : null;
}

/** O dono vê "7/10 fotos", e o álbum é pequeno o bastante para contar numa página só. */
async function fetchCounts(slug: string, fetchFn: typeof fetch): Promise<MediaCounts> {
    const [photos, videos] = await Promise.all([
        fetchProfileMedia(slug, "photo", null, MEDIA_COUNT_LIMIT, fetchFn),
        fetchProfileMedia(slug, "video", null, MEDIA_COUNT_LIMIT, fetchFn),
    ]);
    return { photo: photos.results.length, video: videos.results.length };
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
        const page = await fetchProfileMedia(params.slug, kind, null, undefined, fetch);
        return {
            profile,
            kind,
            media: page.results,
            nextCursor: page.next_cursor,
            isPrivate: false,
            counts: isOwner ? await fetchCounts(params.slug, fetch) : null,
        };
    } catch (err) {
        // O único 403 aqui é o dono mantendo o perfil privado.
        if (err instanceof ApiError && err.status === 403) {
            return {
                profile,
                kind,
                media: [] as Media[],
                nextCursor: null as string | null,
                isPrivate: true,
                counts: null as MediaCounts | null,
            };
        }
        throw err;
    }
}

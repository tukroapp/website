import { error } from "@sveltejs/kit";
import { ApiError } from "#lib/error";
import { fetchProfile } from "#lib/profile";
import { fetchProfileScraps } from "#lib/scrap";
import type { Scrap } from "#lib/types";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    let profile;
    try {
        profile = await fetchProfile(params.slug, fetch);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }

    const empty = { profile, scraps: [] as Scrap[], nextCursor: null as string | null };
    if (!profile.scraps_visible) return empty;

    try {
        const page = await fetchProfileScraps(params.slug, null, undefined, fetch);
        return { profile, scraps: page.results, nextCursor: page.next_cursor };
    } catch (err) {
        // O único 403 nesta rota é o dono mantendo o mural privado.
        if (err instanceof ApiError && err.status === 403) return empty;
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }
}

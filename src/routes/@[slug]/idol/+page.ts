import { error } from "@sveltejs/kit";
import { ApiError } from "#lib/error";
import { fetchIdols } from "#lib/fan";
import { fetchProfile } from "#lib/profile";
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

    const page = await fetchIdols(params.slug, null, undefined, fetch);
    return { profile, idols: page.results, nextCursor: page.next_cursor };
}

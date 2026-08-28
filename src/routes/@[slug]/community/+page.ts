import { error } from "@sveltejs/kit";
import { fetchProfileCommunities } from "#lib/community";
import { ApiError } from "#lib/error";
import { fetchProfile } from "#lib/profile";
import type { PageLoadEvent } from "./$types";

export async function load({ params, url, fetch }: PageLoadEvent) {
    const mutual = url.searchParams.get("mutual") === "true";

    let profile;
    try {
        profile = await fetchProfile(params.slug, fetch);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }

    try {
        const page = await fetchProfileCommunities(params.slug, null, undefined, mutual, fetch);
        return { profile, mutual, communities: page.results, nextCursor: page.next_cursor };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }
}

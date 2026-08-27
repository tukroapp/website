import { error, redirect } from "@sveltejs/kit";
import { fetchCommunity } from "#lib/community";
import { ApiError } from "#lib/error";
import { loginUrl } from "#lib/redirect";
import { auth } from "#lib/state/user.svelte";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch, url }: PageLoadEvent) {
    if (!auth.user) redirect(302, loginUrl(url.pathname));

    let community;
    try {
        community = await fetchCommunity(params.slug, fetch);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Comunidade não encontrada");
        }
        throw err;
    }

    if (!community.can_edit) redirect(302, `/community/${community.slug}`);

    return { community };
}

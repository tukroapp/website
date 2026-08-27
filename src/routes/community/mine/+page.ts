import { redirect } from "@sveltejs/kit";
import { fetchProfileCommunities } from "#lib/community";
import { loginUrl } from "#lib/redirect";
import { auth } from "#lib/state/user.svelte";
import type { PageLoadEvent } from "./$types";

export async function load({ fetch, url }: PageLoadEvent) {
    const user = auth.user;
    if (!user) redirect(302, loginUrl(url.pathname));

    const page = await fetchProfileCommunities(user.slug, null, undefined, fetch);
    return { communities: page.results, nextCursor: page.next_cursor };
}

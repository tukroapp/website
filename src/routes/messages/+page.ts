import { redirect } from "@sveltejs/kit";
import { fetchConversations } from "#lib/message";
import { loginUrl } from "#lib/redirect";
import { auth } from "#lib/state/user.svelte";
import type { PageLoadEvent } from "./$types";

export async function load({ fetch, url }: PageLoadEvent) {
    if (!auth.user) redirect(302, loginUrl(url.pathname));

    const page = await fetchConversations(null, undefined, fetch);
    return { conversations: page.results, nextCursor: page.next_cursor };
}

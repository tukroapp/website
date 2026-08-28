import { redirect } from "@sveltejs/kit";
import { fetchProfileFriends } from "#lib/friend";
import { fetchProfile } from "#lib/profile";
import { loginUrl } from "#lib/redirect";
import { auth } from "#lib/state/user.svelte";
import type { PageLoadEvent } from "./$types";

const FRIENDS_LIMIT = 100;

export async function load({ fetch, url }: PageLoadEvent) {
    const me = auth.user;
    if (!me) redirect(302, loginUrl(url.pathname));

    const [profile, page] = await Promise.all([
        fetchProfile(me.slug, fetch),
        fetchProfileFriends(me.slug, null, null, FRIENDS_LIMIT, false, fetch),
    ]);

    return {
        mySlug: me.slug,
        topFriends: profile.top_friends,
        friends: page.results,
        hasMoreFriends: page.next_cursor !== null,
    };
}

import { redirect } from "@sveltejs/kit";
import { fetchProfileCommunities } from "#lib/community";
import { fetchFeed } from "#lib/feed";
import { fetchFriendRequests } from "#lib/friend";
import { fetchBirthdays, fetchProfile } from "#lib/profile";
import { loginUrl } from "#lib/redirect";
import { fetchProfileScraps } from "#lib/scrap";
import { auth } from "#lib/state/user.svelte";
import { fetchTestimonials } from "#lib/testimonial";
import { fetchProfileVisitors } from "#lib/visitor";
import type { PageLoadEvent } from "./$types";

/** A home só mostra a cabeça de cada lista, tudo tem uma página própria. */
const REQUEST_PREVIEW = 5;
const TESTIMONIAL_PREVIEW = 5;
const FEED_PAGE = 20;
const SCRAP_PREVIEW = 5;
const COMMUNITY_PREVIEW = 9;

export async function load({ fetch, url }: PageLoadEvent) {
    const user = auth.user;
    if (!user) redirect(302, loginUrl(url.pathname));

    const [profile, requests, testimonials, feed, scraps, communities, birthdays, visitors] =
        await Promise.all([
            fetchProfile(user.slug, fetch),
            fetchFriendRequests("received", null, REQUEST_PREVIEW, fetch),
            fetchTestimonials("received", "pending", null, TESTIMONIAL_PREVIEW, fetch),
            fetchFeed(null, FEED_PAGE, fetch),
            fetchProfileScraps(user.slug, null, SCRAP_PREVIEW, fetch),
            fetchProfileCommunities(user.slug, null, COMMUNITY_PREVIEW, fetch),
            fetchBirthdays(fetch),
            fetchProfileVisitors(fetch),
        ]);

    return {
        profile,
        requests: requests.results,
        moreRequests: requests.next_cursor !== null,
        testimonials: testimonials.results,
        moreTestimonials: testimonials.next_cursor !== null,
        feed: feed.results,
        feedCursor: feed.next_cursor,
        scraps: scraps.results,
        communities: communities.results,
        birthdays,
        visitors,
    };
}

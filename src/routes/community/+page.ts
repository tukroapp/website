import { searchCommunities } from "#lib/community";
import type { PageLoadEvent } from "./$types";

export async function load({ fetch }: PageLoadEvent) {
    const page = await searchCommunities(null, null, undefined, fetch);
    return { communities: page.results, nextCursor: page.next_cursor };
}

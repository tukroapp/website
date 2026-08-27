import { fetchFriendRequests } from "#lib/friend";
import type { FriendRequestDirection } from "#lib/types";
import type { PageLoadEvent } from "./$types";

function readDirection(value: string | null): FriendRequestDirection {
    return value === "sent" ? "sent" : "received";
}

export async function load({ fetch, url }: PageLoadEvent) {
    const direction = readDirection(url.searchParams.get("direction"));
    const page = await fetchFriendRequests(direction, null, undefined, fetch);
    return { direction, requests: page.results, nextCursor: page.next_cursor };
}

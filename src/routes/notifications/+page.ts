import { fetchNotifications } from "#lib/notification";
import type { PageLoadEvent } from "./$types";

export async function load({ fetch, url }: PageLoadEvent) {
    const onlyUnread = url.searchParams.get("unread") === "true";
    const page = await fetchNotifications(onlyUnread, null, undefined, fetch);
    return { onlyUnread, notifications: page.results, nextCursor: page.next_cursor };
}

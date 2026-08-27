import { fetchBlocks } from "#lib/block";
import type { PageLoadEvent } from "./$types";

export async function load({ fetch }: PageLoadEvent) {
    const page = await fetchBlocks(null, undefined, fetch);
    return { blocks: page.results, nextCursor: page.next_cursor };
}

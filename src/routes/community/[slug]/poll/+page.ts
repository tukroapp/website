import { error } from "@sveltejs/kit";
import { fetchCommunity } from "#lib/community";
import { ApiError } from "#lib/error";
import { fetchCommunityPolls } from "#lib/poll";
import type { PollResponse } from "#lib/types";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    let community;
    try {
        community = await fetchCommunity(params.slug, fetch);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Comunidade não encontrada");
        }
        throw err;
    }

    try {
        const page = await fetchCommunityPolls(params.slug, null, undefined, fetch);
        return { community, polls: page.results, nextCursor: page.next_cursor, visible: true };
    } catch (err) {
        // Comunidade privada responde 404 nas enquetes inteiras para quem não é membro.
        if (err instanceof ApiError && err.status === 404) {
            return {
                community,
                polls: [] as PollResponse[],
                nextCursor: null as string | null,
                visible: false,
            };
        }
        throw err;
    }
}

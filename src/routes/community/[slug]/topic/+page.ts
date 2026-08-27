import { error } from "@sveltejs/kit";
import { fetchCommunity } from "#lib/community";
import { ApiError } from "#lib/error";
import { fetchCommunityTopics } from "#lib/topic";
import type { Topic } from "#lib/types";
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
        const page = await fetchCommunityTopics(params.slug, null, undefined, fetch);
        return { community, topics: page.results, nextCursor: page.next_cursor, visible: true };
    } catch (err) {
        // Comunidade privada responde 404 no fórum inteiro para quem não é membro.
        if (err instanceof ApiError && err.status === 404) {
            return {
                community,
                topics: [] as Topic[],
                nextCursor: null as string | null,
                visible: false,
            };
        }
        throw err;
    }
}

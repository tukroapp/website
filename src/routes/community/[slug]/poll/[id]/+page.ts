import { error } from "@sveltejs/kit";
import { fetchCommunity } from "#lib/community";
import { ApiError } from "#lib/error";
import { fetchPoll } from "#lib/poll";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    let poll;
    try {
        poll = await fetchPoll(params.id, fetch);
    } catch (err) {
        // 404 também para enquete de comunidade privada quando quem visita não é membro.
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Enquete não encontrada");
        }
        throw err;
    }

    // O slug vem da enquete, não da URL, então um slug errado nunca racha a tela.
    const community = await fetchCommunity(poll.community_slug, fetch);

    return { poll, community };
}

import { error } from "@sveltejs/kit";
import { fetchCommunity } from "#lib/community";
import { ApiError } from "#lib/error";
import { fetchTopic, fetchTopicComments } from "#lib/topic";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    let topic;
    try {
        topic = await fetchTopic(params.id, fetch);
    } catch (err) {
        // Comunidade privada responde 404 no tópico também, e aqui continua 404.
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Tópico não encontrado");
        }
        throw err;
    }

    // O slug vem do tópico, não da URL, então um slug errado nunca racha a tela.
    const [community, comments] = await Promise.all([
        fetchCommunity(topic.community_slug, fetch),
        fetchTopicComments(topic.id, null, undefined, fetch),
    ]);

    return { topic, community, comments: comments.results, nextCursor: comments.next_cursor };
}

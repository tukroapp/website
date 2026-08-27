import { error } from "@sveltejs/kit";
import { fetchCommunity, fetchCommunityMembers } from "#lib/community";
import { ApiError } from "#lib/error";
import { fetchCommunityPolls } from "#lib/poll";
import { fetchCommunityTopics } from "#lib/topic";
import type { CommunityMember, PollResponse, Topic } from "#lib/types";
import type { PageLoadEvent } from "./$types";

const MODERATOR_LIMIT = 10;
const FORUM_PREVIEW_LIMIT = 5;
const POLL_PREVIEW_LIMIT = 5;

/** A resposta de detalhe não traz dono nem moderadores, e a faixa mostra os dois. */
async function fetchStaff(slug: string, fetchFn: typeof fetch) {
    const empty = { owner: null as CommunityMember | null, moderators: [] as CommunityMember[] };

    try {
        const [owner, moderators] = await Promise.all([
            fetchCommunityMembers(slug, null, "owner", null, 1, fetchFn),
            fetchCommunityMembers(slug, null, "admin", null, MODERATOR_LIMIT, fetchFn),
        ]);
        return { owner: owner.results.at(0) ?? null, moderators: moderators.results };
    } catch (err) {
        if (err instanceof ApiError && err.status === 403) return empty;
        throw err;
    }
}

/** O fórum de uma comunidade privada responde 404 para quem não é membro. */
async function fetchForumPreview(slug: string, fetchFn: typeof fetch) {
    try {
        const page = await fetchCommunityTopics(slug, null, FORUM_PREVIEW_LIMIT, fetchFn);
        return { topics: page.results, forumVisible: true };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            return { topics: [] as Topic[], forumVisible: false };
        }
        throw err;
    }
}

/** As enquetes de uma comunidade privada respondem 404 para quem não é membro. */
async function fetchPollPreview(slug: string, fetchFn: typeof fetch) {
    try {
        const page = await fetchCommunityPolls(slug, null, POLL_PREVIEW_LIMIT, fetchFn);
        return { polls: page.results, pollsVisible: true };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            return { polls: [] as PollResponse[], pollsVisible: false };
        }
        throw err;
    }
}

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

    const [forum, polls] = await Promise.all([
        fetchForumPreview(params.slug, fetch),
        fetchPollPreview(params.slug, fetch),
    ]);

    if (!community.members_visible) {
        return { community, owner: null, moderators: [] as CommunityMember[], ...forum, ...polls };
    }

    return { community, ...(await fetchStaff(params.slug, fetch)), ...forum, ...polls };
}

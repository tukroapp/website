import { error, redirect } from "@sveltejs/kit";
import { ApiError } from "#lib/error";
import { fetchConversationWith, fetchMessages } from "#lib/message";
import { fetchProfile } from "#lib/profile";
import { loginUrl } from "#lib/redirect";
import { auth } from "#lib/state/user.svelte";
import type { MessageResponse, ProfileSummary } from "#lib/types";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch, url }: PageLoadEvent) {
    const me = auth.user;
    if (!me) redirect(302, loginUrl(url.pathname));
    if (params.slug === me.slug) redirect(302, "/messages");

    const conversation = await fetchConversationWith(params.slug, fetch);

    if (conversation) {
        const page = await fetchMessages(conversation.id, null, undefined, fetch);
        return {
            slug: params.slug,
            counterpart: conversation.counterpart,
            conversationId: conversation.id as string | null,
            unreadOnOpen: conversation.unread_count,
            messages: page.results,
            nextCursor: page.next_cursor,
        };
    }

    // Sem conversa ainda: o perfil dá o cabeçalho e é onde bloqueio ou inexistência viram 404.
    let profile;
    try {
        profile = await fetchProfile(params.slug, fetch);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }

    const counterpart: ProfileSummary = {
        id: profile.slug,
        slug: profile.slug,
        name: profile.name,
        avatar_url: profile.avatar_url,
        status: profile.status,
    };

    return {
        slug: params.slug,
        counterpart,
        conversationId: null as string | null,
        unreadOnOpen: 0,
        messages: [] as MessageResponse[],
        nextCursor: null as string | null,
    };
}

import { error } from "@sveltejs/kit";
import { ApiError } from "#lib/error";
import { fetchProfileFriends } from "#lib/friend";
import { fetchProfile } from "#lib/profile";
import type { ProfileSummary } from "#lib/types";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    let profile;
    try {
        profile = await fetchProfile(params.slug, fetch);
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }

    try {
        const page = await fetchProfileFriends(params.slug, null, null, undefined, fetch);
        return { profile, friends: page.results, nextCursor: page.next_cursor, isPrivate: false };
    } catch (err) {
        // O único 403 nesta rota é o dono mantendo a lista de amigos privada.
        if (err instanceof ApiError && err.status === 403) {
            return {
                profile,
                friends: [] as ProfileSummary[],
                nextCursor: null as string | null,
                isPrivate: true,
            };
        }
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }
}

import { error } from "@sveltejs/kit";
import { fetchCommunity, fetchCommunityMembers } from "#lib/community";
import { ApiError } from "#lib/error";
import type { CommunityMember, CommunityRole } from "#lib/types";
import type { PageLoadEvent } from "./$types";

const ROLES: CommunityRole[] = ["owner", "admin", "member"];

/** Sem papel na URL significa todos os membros. */
function readRole(value: string | null): CommunityRole | null {
    return ROLES.find((role) => role === value) ?? null;
}

export async function load({ params, url, fetch }: PageLoadEvent) {
    const role = readRole(url.searchParams.get("role"));

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
        const page = await fetchCommunityMembers(params.slug, null, role, null, undefined, fetch);
        return {
            community,
            role,
            members: page.results,
            nextCursor: page.next_cursor,
            isPrivate: false,
        };
    } catch (err) {
        // O único 403 aqui é uma comunidade privada vista por quem não é membro.
        if (err instanceof ApiError && err.status === 403) {
            return {
                community,
                role,
                members: [] as CommunityMember[],
                nextCursor: null as string | null,
                isPrivate: true,
            };
        }
        throw err;
    }
}

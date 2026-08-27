import { error } from "@sveltejs/kit";
import { fetchCommunity } from "#lib/community";
import { ApiError } from "#lib/error";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    try {
        return { community: await fetchCommunity(params.slug, fetch) };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Comunidade não encontrada");
        }
        throw err;
    }
}

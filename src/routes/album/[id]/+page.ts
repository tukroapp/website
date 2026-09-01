import { error } from "@sveltejs/kit";
import { fetchAlbum } from "#lib/album";
import { ApiError } from "#lib/error";
import { auth } from "#lib/state/user.svelte";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    try {
        const album = await fetchAlbum(params.id, fetch);
        return { album, isOwner: auth.user?.slug === album.owner_slug };
    } catch (err) {
        // `403`/`404` viram o mesmo: quem não pode ver não precisa saber que existe.
        if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
            error(404, "Álbum não encontrado");
        }
        throw err;
    }
}

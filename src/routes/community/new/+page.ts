import { redirect } from "@sveltejs/kit";
import { loginUrl } from "#lib/redirect";
import { auth } from "#lib/state/user.svelte";
import type { PageLoadEvent } from "./$types";

export function load({ url }: PageLoadEvent) {
    if (!auth.user) redirect(302, loginUrl(url.pathname));
}

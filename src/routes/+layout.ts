import { browser } from "$app/env";
import { redirect } from "@sveltejs/kit";
import { loginUrl, safeRedirectPath, NEXT_PARAM } from "#lib/redirect";
import { initTheme } from "#lib/state/theme.svelte";
import { auth } from "#lib/state/user.svelte";
import type { LayoutLoadEvent } from "./$types";

export const ssr = false;
export const prerender = false;
export const trailingSlash = "never";

const PUBLIC_ROUTES = ["/login", "/register"];

/**
 * Aberto para todo mundo, logado ou não. O fluxo de troca de senha cai aqui porque o link
 * do e-mail precisa funcionar mesmo para quem ainda tem sessão aberta.
 */
const OPEN_ROUTES = ["/about", "/terms", "/auth/forgot-password", "/auth/reset-password"];

/** Perfil é legível sem login, o backend esconde o que quem visita não pode ver. */
const PROFILE_PREFIX = "/@";

/**
 * Comunidade também é legível sem login. As páginas que precisam de sessão (criar, editar,
 * moderar) mandam quem visita para o login no próprio load delas.
 */
const COMMUNITY_ROUTE = "/community";

/** Cuida do próprio redirect, então a guarda não pode se meter. */
const OAUTH_CALLBACK = "/login/google/callback";

function matches(path: string, route: string): boolean {
    return path === route || path.startsWith(`${route}/`);
}

export async function load({ fetch, url }: LayoutLoadEvent) {
    if (!browser) return;

    initTheme();

    const path = url.pathname;

    if (!auth.fetched) {
        await auth.fetchUser(fetch);
    }

    if (matches(path, OAUTH_CALLBACK)) return;
    if (OPEN_ROUTES.some((route) => matches(path, route))) return;
    if (path.startsWith(PROFILE_PREFIX)) return;
    if (matches(path, COMMUNITY_ROUTE)) return;

    const isPublic = PUBLIC_ROUTES.some((route) => matches(path, route));

    if (!auth.user && !isPublic) {
        redirect(302, loginUrl(`${path}${url.search}`));
    }

    if (auth.user && isPublic) {
        redirect(302, safeRedirectPath(url.searchParams.get(NEXT_PARAM)));
    }
}

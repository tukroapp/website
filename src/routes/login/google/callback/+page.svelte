<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import { SESSION_COOKIE, deleteCookie, readCookie } from "#lib/cookie";
    import { googleLoginFailure } from "#lib/google";
    import { NEXT_PARAM, safeRedirectPath } from "#lib/redirect";
    import { setToken } from "#lib/token";
    import { auth } from "#lib/state/user.svelte";
    import { setSuspension } from "#lib/state/suspension.svelte";

    const next = $derived(safeRedirectPath(page.url.searchParams.get(NEXT_PARAM)));
    const error = $derived(page.url.searchParams.get("error"));
    const until = $derived(page.url.searchParams.get("until"));
    const reason = $derived(page.url.searchParams.get("reason"));

    function fail() {
        const failure = googleLoginFailure(error, until, reason);
        if (failure.suspension) setSuspension(failure.suspension);

        toast.error(failure.message);
        goto("/login", { replaceState: true });
    }

    onMount(async () => {
        const token = readCookie(SESSION_COOKIE);
        deleteCookie(SESSION_COOKIE);

        // Aberto como janela separada: devolve o resultado para a página que começou o fluxo.
        if (window.opener) {
            window.opener.postMessage(
                { source: "tukro-google-login", next, token, error, until, reason },
                window.location.origin,
            );
            window.close();
            return;
        }

        if (error || !token) {
            fail();
            return;
        }

        setToken(token);
        await auth.fetchUser();

        if (!auth.user) {
            fail();
            return;
        }

        toast.success(`Bem-vindo, ${auth.user.name}`);
        await goto(next, { replaceState: true });
    });
</script>

<svelte:head><title>Entrando | Tukro</title></svelte:head>

<main class="flex min-h-dvh flex-col items-center justify-center gap-3 px-4">
    <span
        class="size-8 animate-spin rounded-full border-2 border-line border-t-primary"
        aria-hidden="true"
    ></span>
    <p class="text-sm text-muted">Entrando com o Google...</p>
</main>

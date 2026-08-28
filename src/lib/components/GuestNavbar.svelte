<script lang="ts">
    import { page } from "$app/state";
    import { NEXT_PARAM, loginUrl } from "#lib/redirect";

    // Nas próprias telas de entrada a barra só repetiria o que a página já diz.
    const hidden = $derived(
        page.url.pathname.startsWith("/login") || page.url.pathname.startsWith("/register"),
    );

    // Volta para a página atual depois de entrar.
    const target = $derived(`${page.url.pathname}${page.url.search}`);
    const registerHref = $derived(`/register?${NEXT_PARAM}=${encodeURIComponent(target)}`);
</script>

{#if !hidden}
    <header class="border-b border-line bg-surface">
        <div class="mx-auto flex h-12 w-full max-w-7xl items-center gap-3 px-3 text-sm">
            <a href="/" class="text-2xl font-bold tracking-tight text-accent lowercase">tukro</a>
            <span class="hidden text-muted sm:block">Entre para participar do Tukro.</span>
            <div class="ms-auto flex items-center gap-2">
                <a
                    href={loginUrl(target)}
                    class="rounded-theme border border-line bg-surface-hover px-3 py-1 text-content hover:bg-line"
                >
                    Entrar
                </a>
                <a
                    href={registerHref}
                    class="rounded-theme bg-primary px-3 py-1 font-medium text-on-primary hover:bg-primary-hover"
                >
                    Criar conta
                </a>
            </div>
        </div>
    </header>
{/if}

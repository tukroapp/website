<script lang="ts">
    import { page } from "$app/state";
    import { loginUrl } from "#lib/redirect";

    /** Mensagens que o SvelteKit gera sozinho e que não valem para o usuário ler. */
    const GENERIC_MESSAGES = new Set([
        "Not Found",
        "Internal Error",
        "Internal Server Error",
        "Service Unavailable",
        "",
    ]);

    const FALLBACK = {
        title: "Algo deu errado",
        hint: "Tivemos um problema por aqui. Tente de novo em instantes.",
    };

    const KNOWN: Record<number, { title: string; hint: string }> = {
        400: { title: "Requisição inválida", hint: "O endereço ou os dados da página não batem." },
        401: { title: "Entre para continuar", hint: "Esta página é só para quem está logado." },
        403: { title: "Sem acesso", hint: "Você não tem permissão para ver esta página." },
        404: {
            title: "Página não encontrada",
            hint: "O endereço não existe ou o conteúdo saiu do ar.",
        },
        429: {
            title: "Devagar com a pancada",
            hint: "Muitas ações em pouco tempo. Espere um instante e tente de novo.",
        },
        503: { title: "Fora do ar por um instante", hint: "O Tukro está em manutenção. Já volta." },
    };

    const status = $derived(page.status);
    const base = $derived(KNOWN[status] ?? FALLBACK);

    /** Mensagem específica que veio de um `error(404, "...")` num `load`. Só para 4xx. */
    const detail = $derived.by(() => {
        const message = page.error?.message?.trim();
        if (!message || GENERIC_MESSAGES.has(message)) return null;
        return status < 500 ? message : null;
    });

    const title = $derived(detail ?? base.title);
    const hint = $derived(
        detail ? "Talvez o link esteja quebrado ou o conteúdo tenha sido removido." : base.hint,
    );
</script>

<svelte:head><title>{title} | Tukro</title></svelte:head>

<main class="flex min-h-[calc(100dvh-3.25rem)] items-center justify-center p-4">
    <div
        class="flex w-full max-w-sm flex-col items-center gap-6 rounded-theme border border-line bg-surface px-6 py-10 text-center shadow-sm"
    >
        <a href="/" class="flex items-center gap-1.5">
            <img src="/favicon.svg" alt="" width="28" height="28" class="size-7" />
            <span class="text-2xl font-bold tracking-tight text-accent lowercase">tukro</span>
        </a>

        <div class="flex flex-col items-center gap-2">
            <span class="text-xs font-semibold tracking-widest text-muted uppercase">
                Erro {status}
            </span>
            <h1 class="text-xl font-bold text-content">{title}</h1>
            <p class="text-sm text-muted">{hint}</p>
        </div>

        <div class="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <a
                href="/"
                class="inline-flex h-9 items-center justify-center rounded-theme bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover"
            >
                voltar para a home
            </a>
            {#if status === 401}
                <a
                    href={loginUrl(page.url.pathname)}
                    class="inline-flex h-9 items-center justify-center rounded-theme border border-line bg-surface px-4 text-sm font-medium text-content hover:bg-surface-hover"
                >
                    entrar
                </a>
            {/if}
        </div>
    </div>
</main>

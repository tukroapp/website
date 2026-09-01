<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import Button from "#lib/components/Button.svelte";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";

    /**
     * Rotas que o modal não pode cobrir: quem não quer aceitar a versão nova
     * precisa conseguir ler o texto e cuidar da própria conta (desativar,
     * excluir). Prender a pessoa numa tela sem saída é justamente o que a LGPD
     * não admite.
     */
    const ESCAPE_ROUTES = ["/terms", "/settings"];

    let busy = $state(false);

    const pendingVersion = $derived(auth.user?.pending_terms_version ?? null);
    const onEscapeRoute = $derived(
        ESCAPE_ROUTES.some(
            (route) => page.url.pathname === route || page.url.pathname.startsWith(`${route}/`),
        ),
    );
    const open = $derived(pendingVersion !== null && !onEscapeRoute);

    async function accept() {
        busy = true;
        try {
            await auth.acceptTerms();
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function logout() {
        busy = true;
        await auth.logout();
        await goto("/login", { replaceState: true });
    }
</script>

{#if open}
    <!-- Sem fechar no ESC nem no clique fora: é o único ponto do fluxo que prende de propósito. -->
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-gate-title"
            class="flex w-full max-w-md flex-col gap-3 rounded-theme border border-line bg-surface p-4 sm:p-6"
        >
            <h2 id="terms-gate-title" class="text-lg font-bold text-content">Os termos mudaram</h2>

            <p class="text-sm text-content">
                Atualizamos os termos de uso e a política de privacidade. Para continuar usando o
                Tukro, leia e aceite a versão nova.
            </p>

            <p class="text-sm text-muted">
                Prefere não aceitar? Você pode sair da conta ou, em Configurações, desativar e
                excluir sua conta a qualquer momento.
            </p>

            <div class="flex flex-wrap gap-3 text-sm">
                <a
                    href="/terms#termos"
                    class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ler os termos
                </a>
                <a
                    href="/terms#privacidade"
                    class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ler a política de privacidade
                </a>
                <a
                    href="/settings"
                    class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                    configurações da conta
                </a>
            </div>

            <div class="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="outline" disabled={busy} onclick={logout}>sair</Button>
                <Button size="sm" disabled={busy} onclick={accept}>
                    {busy ? "salvando..." : "aceitar e continuar"}
                </Button>
            </div>
        </div>
    </div>
{/if}

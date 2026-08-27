<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import { toApiError } from "#lib/error";
    import { verifyEmail } from "#lib/account";
    import Button from "#lib/components/Button.svelte";
    import { loginUrl } from "#lib/redirect";
    import { auth } from "#lib/state/user.svelte";

    const token = $derived(page.url.searchParams.get("token") ?? "");

    let verifying = $state(true);
    let failure = $state<string | null>(null);
    let switching = $state(false);

    $effect(() => {
        confirm(token);
    });

    async function confirm(value: string) {
        if (value === "") {
            verifying = false;
            failure = "O link está incompleto. Peça um novo e-mail de verificação.";
            return;
        }

        verifying = true;
        failure = null;
        try {
            await verifyEmail(value);
            await auth.fetchUser();
            toast.success("E-mail verificado");
            await goto("/settings", { replaceState: true });
        } catch (error) {
            failure =
                toApiError(error).firstMessageAt("token") ??
                "O link expirou, já foi usado ou pertence a outra conta.";
        } finally {
            verifying = false;
        }
    }

    /** O link só vale para a conta que o recebeu, então trocar de conta é uma saída. */
    async function switchAccount() {
        switching = true;
        await auth.logout();
        await goto(loginUrl(`${page.url.pathname}${page.url.search}`), { replaceState: true });
    }
</script>

<svelte:head><title>Verificar e-mail | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-md flex-col gap-4 p-3 py-10">
    <h1 class="text-lg font-bold text-content">Verificar e-mail</h1>

    {#if verifying}
        <p class="text-sm text-muted">Confirmando seu e-mail...</p>
    {:else if failure}
        <p class="rounded-theme border border-line bg-surface p-4 text-sm text-content">
            {failure}
        </p>
        <p class="text-sm text-muted">
            Você está logado como {auth.user?.email}. Se o link foi enviado para outra conta, entre
            com ela e abra o link de novo.
        </p>
        <div class="flex flex-wrap items-center justify-between gap-2">
            <a href="/settings" class="text-sm text-primary underline underline-offset-2">
                reenviar e-mail de verificação
            </a>
            <Button variant="outline" disabled={switching} onclick={switchAccount}>
                entrar com outra conta
            </Button>
        </div>
    {/if}
</main>

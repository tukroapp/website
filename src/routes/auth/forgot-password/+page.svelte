<script lang="ts">
    import { toast } from "svelte-sonner";
    import { ApiError } from "#lib/error";
    import { toastApiError } from "#lib/toast";
    import { forgotPassword } from "#lib/account";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";

    let email = $state("");
    let loading = $state(false);
    let sent = $state(false);
    let errors = $state<Record<string, string[]>>({});

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        loading = true;
        errors = {};
        try {
            await forgotPassword(email.trim());
            sent = true;
        } catch (error) {
            if (error instanceof ApiError && error.status === 429) {
                toast.error("Aguarde alguns instantes antes de pedir outro link");
            } else {
                errors = toastApiError(error).fieldMessages();
            }
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>Esqueci minha senha | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-md flex-col gap-4 p-3 py-10">
    <h1 class="text-lg font-bold text-content">Esqueci minha senha</h1>

    {#if sent}
        <p class="rounded-theme border border-line bg-surface p-4 text-sm text-content">
            Se existir uma conta com esse e-mail, enviamos o link para redefinir a senha. O link
            vale por 15 minutos.
        </p>
        <a href="/login" class="text-sm text-primary underline underline-offset-2">
            voltar para o login
        </a>
    {:else}
        <form
            onsubmit={submit}
            class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <p class="text-sm text-muted">
                Informe o e-mail da sua conta e enviamos um link para você criar uma senha nova.
            </p>

            <div class="flex flex-col gap-1.5">
                <label for="email" class="text-sm font-medium text-content">E-mail</label>
                <Input
                    id="email"
                    type="email"
                    autocomplete="email"
                    inputmode="email"
                    required
                    bind:value={email}
                />
                <FieldError messages={errors.email} />
            </div>

            <div class="flex items-center justify-between gap-2">
                <a href="/login" class="text-sm text-primary underline underline-offset-2">
                    voltar para o login
                </a>
                <Button type="submit" disabled={loading}>enviar link</Button>
            </div>
        </form>
    {/if}
</main>

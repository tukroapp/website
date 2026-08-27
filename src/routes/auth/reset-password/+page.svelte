<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import { toApiError } from "#lib/error";
    import { toastApiError } from "#lib/toast";
    import { checkResetToken, resetPassword } from "#lib/account";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";
    import { auth } from "#lib/state/user.svelte";

    const MIN_PASSWORD_LENGTH = 8;

    const token = $derived(page.url.searchParams.get("token") ?? "");

    let checking = $state(true);
    let tokenError = $state<string | null>(null);
    let newPassword = $state("");
    let confirmation = $state("");
    let errors = $state<Record<string, string[]>>({});
    let saving = $state(false);

    $effect(() => {
        checkToken(token);
    });

    async function checkToken(value: string) {
        if (value === "") {
            checking = false;
            tokenError = "O link está incompleto. Peça um novo e-mail de redefinição.";
            return;
        }

        checking = true;
        tokenError = null;
        try {
            await checkResetToken(value);
        } catch (error) {
            const apiError = toApiError(error);
            tokenError =
                apiError.firstMessageAt("token") ??
                "O link expirou ou já foi usado. Peça um novo e-mail de redefinição.";
        } finally {
            checking = false;
        }
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        errors = {};

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            errors = {
                new_password: [`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`],
            };
            return;
        }
        if (newPassword !== confirmation) {
            errors = { new_password_confirmation: ["As senhas não coincidem"] };
            return;
        }

        saving = true;
        try {
            await resetPassword({
                token,
                new_password: newPassword,
                new_password_confirmation: confirmation,
            });
            // Toda sessão caiu, inclusive a deste navegador, então o token guardado não serve mais.
            auth.clear();
            toast.success("Senha redefinida, entre novamente");
            await goto("/login", { replaceState: true });
        } catch (error) {
            errors = toastApiError(error).fieldMessages();
        } finally {
            saving = false;
        }
    }
</script>

<svelte:head><title>Redefinir senha | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-md flex-col gap-4 p-3 py-10">
    <h1 class="text-lg font-bold text-content">Redefinir senha</h1>

    {#if checking}
        <p class="text-sm text-muted">Conferindo o link...</p>
    {:else if tokenError}
        <p class="rounded-theme border border-line bg-surface p-4 text-sm text-content">
            {tokenError}
        </p>
        <a href="/auth/forgot-password" class="text-sm text-primary underline underline-offset-2">
            pedir um novo link
        </a>
    {:else}
        <form
            onsubmit={submit}
            class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <div class="flex flex-col gap-1.5">
                <label for="new_password" class="text-sm font-medium text-content">Nova senha</label
                >
                <Input
                    id="new_password"
                    type="password"
                    autocomplete="new-password"
                    minlength={MIN_PASSWORD_LENGTH}
                    required
                    bind:value={newPassword}
                />
                <FieldError messages={errors.new_password} />
            </div>

            <div class="flex flex-col gap-1.5">
                <label for="confirmation" class="text-sm font-medium text-content">
                    Repita a nova senha
                </label>
                <Input
                    id="confirmation"
                    type="password"
                    autocomplete="new-password"
                    required
                    bind:value={confirmation}
                />
                <FieldError messages={errors.new_password_confirmation} />
            </div>

            <FieldError messages={errors.token} />

            <div class="flex justify-end">
                <Button type="submit" disabled={saving}>redefinir senha</Button>
            </div>
        </form>
    {/if}
</main>

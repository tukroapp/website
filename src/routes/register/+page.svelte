<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import { toastApiError } from "#lib/toast";
    import { NEXT_PARAM, safeRedirectPath } from "#lib/redirect";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";
    import { auth } from "#lib/state/user.svelte";

    const next = $derived(safeRedirectPath(page.url.searchParams.get(NEXT_PARAM)));

    let name = $state("");
    let email = $state("");
    let password = $state("");
    let passwordConfirmation = $state("");
    // Começa desmarcado de propósito: consentimento pré-marcado não vale.
    let acceptedTerms = $state(false);
    let loading = $state(false);
    let errors = $state<Record<string, string[]>>({});

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (loading) return;

        if (password !== passwordConfirmation) {
            errors = { password_confirmation: ["As senhas não são iguais."] };
            return;
        }

        loading = true;
        errors = {};

        try {
            const user = await auth.register({
                name,
                email,
                password,
                accepted_terms: acceptedTerms,
            });
            toast.success(`Conta criada. Boas-vindas, ${user.name}`);
            await goto(next, { replaceState: true });
        } catch (error) {
            errors = toastApiError(error).fieldMessages();
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>Criar conta | Tukro</title></svelte:head>

<main class="flex min-h-dvh flex-col justify-center px-4 py-8 sm:items-center sm:py-12">
    <div class="mx-auto flex w-full max-w-sm flex-col gap-6">
        <header class="flex flex-col gap-1 text-center">
            <h1 class="text-3xl font-bold text-primary">Tukro</h1>
            <p class="text-sm text-muted">Cria sua conta e vem montar seu perfil.</p>
        </header>

        <form
            onsubmit={submit}
            class="flex flex-col gap-4 rounded-theme border border-line bg-surface p-4 sm:p-6"
        >
            <div class="flex flex-col gap-1.5">
                <label for="name" class="text-sm font-medium text-content">Nome</label>
                <Input
                    id="name"
                    name="name"
                    type="text"
                    autocomplete="name"
                    placeholder="Como você quer ser chamado"
                    required
                    bind:value={name}
                />
                <FieldError messages={errors.name} />
            </div>

            <div class="flex flex-col gap-1.5">
                <label for="email" class="text-sm font-medium text-content">E-mail</label>
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    inputmode="email"
                    placeholder="voce@exemplo.com"
                    required
                    bind:value={email}
                />
                <FieldError messages={errors.email} />
            </div>

            <div class="flex flex-col gap-1.5">
                <label for="password" class="text-sm font-medium text-content">Senha</label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="new-password"
                    placeholder="Crie uma senha"
                    required
                    bind:value={password}
                />
                <FieldError messages={errors.password} />
            </div>

            <div class="flex flex-col gap-1.5">
                <label for="password-confirmation" class="text-sm font-medium text-content">
                    Confirme a senha
                </label>
                <Input
                    id="password-confirmation"
                    name="password_confirmation"
                    type="password"
                    autocomplete="new-password"
                    placeholder="Digite a senha de novo"
                    required
                    bind:value={passwordConfirmation}
                />
                <FieldError messages={errors.password_confirmation} />
            </div>

            <div class="flex flex-col gap-1.5">
                <label class="flex items-start gap-2 text-xs text-muted">
                    <input
                        type="checkbox"
                        bind:checked={acceptedTerms}
                        class="mt-0.5 size-4 shrink-0 rounded-theme border-line text-primary focus:ring-primary"
                    />
                    <span>
                        Declaro ter 18 anos ou mais e aceito os
                        <a
                            href="/terms#termos"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                        >
                            termos de uso
                        </a>
                        e a
                        <a
                            href="/terms#privacidade"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                        >
                            política de privacidade
                        </a>.
                    </span>
                </label>
                <FieldError messages={errors.accepted_terms} />
            </div>

            <Button type="submit" size="lg" class="w-full" disabled={loading || !acceptedTerms}>
                {loading ? "Criando conta..." : "Criar conta"}
            </Button>

            <p class="text-xs text-muted">
                Isto aqui é um projeto pessoal, feito por diversão.
                <a
                    href="/about"
                    class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                    Leia o aviso completo
                </a>.
            </p>
        </form>

        <p class="text-center text-sm text-muted">
            Já tem conta?
            <a
                href="/login"
                class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
                Entrar
            </a>
        </p>
    </div>
</main>

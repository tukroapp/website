<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { PUBLIC_API_BASE_URL } from "$app/env/public";
    import { toast } from "svelte-sonner";
    import { toastApiError } from "#lib/toast";
    import { googleLoginFailure } from "#lib/google";
    import { NEXT_PARAM, safeRedirectPath } from "#lib/redirect";
    import { setToken } from "#lib/token";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import Input from "#lib/components/Input.svelte";
    import { auth } from "#lib/state/user.svelte";
    import {
        clearSuspension,
        getSuspension,
        initSuspension,
        setSuspension,
        suspensionFromApiError,
        suspensionMessage,
    } from "#lib/state/suspension.svelte";

    const next = $derived(safeRedirectPath(page.url.searchParams.get(NEXT_PARAM)));

    /** "finishing" começa quando o popup responde: o token chegou, o `/me` ainda não. */
    type GooglePhase = "idle" | "waiting" | "finishing";

    let email = $state("");
    let password = $state("");
    let loading = $state(false);
    let googlePhase = $state<GooglePhase>("idle");
    let errors = $state<Record<string, string[]>>({});

    let popupWatcher: ReturnType<typeof setInterval> | null = null;

    const suspension = $derived(getSuspension());
    const googleLoading = $derived(googlePhase !== "idle");
    const busy = $derived(loading || googleLoading);
    /** Conta barrada não entra por nenhuma das duas portas, então as duas ficam fechadas até o prazo. */
    const blocked = $derived(suspension !== null);
    const formDisabled = $derived(busy || blocked);

    const googleLabels: Record<GooglePhase, string> = {
        idle: "Entrar com Google",
        waiting: "Aguardando o Google...",
        finishing: "Entrando...",
    };

    onMount(initSuspension);

    // O popup pode continuar aberto quando a tela sai, e o intervalo ficaria rodando sozinho.
    onDestroy(stopWatchingPopup);

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (busy || blocked) return;
        loading = true;
        errors = {};

        try {
            const user = await auth.login({ email, password });
            toast.success(`Bem-vindo de volta, ${user.name}`);
            await goto(next, { replaceState: true });
        } catch (error) {
            const apiError = toastApiError(error);
            errors = apiError.fieldMessages();

            const suspended = suspensionFromApiError(apiError);
            if (suspended) setSuspension(suspended);
        } finally {
            loading = false;
        }
    }

    function googleUrl(): string {
        return `${PUBLIC_API_BASE_URL}/api/v1/auth/google?${NEXT_PARAM}=${encodeURIComponent(next)}`;
    }

    function stopWatchingPopup() {
        if (popupWatcher !== null) clearInterval(popupWatcher);
        popupWatcher = null;
    }

    function loginWithGoogle() {
        if (busy || blocked) return;

        const popup = window.open(googleUrl(), "tukro-google-login", GOOGLE_WINDOW_FEATURES);

        // Popup bloqueado ou navegador que ignora a dica: cai para a janela atual.
        if (!popup) {
            googlePhase = "waiting";
            window.location.href = googleUrl();
            return;
        }

        googlePhase = "waiting";
        popup.focus();

        // A janela pode ser fechada sem terminar o fluxo, e isso não manda mensagem nenhuma.
        popupWatcher = setInterval(() => {
            if (popup.closed) {
                stopWatchingPopup();
                googlePhase = "idle";
            }
        }, 500);
    }

    const GOOGLE_WINDOW_FEATURES = "popup=yes,width=520,height=650,noopener=no,noreferrer=no";

    async function onAuthMessage(event: MessageEvent) {
        if (event.origin !== window.location.origin) return;
        if (event.data?.source !== "tukro-google-login") return;

        // O popup se fecha logo depois de mandar a mensagem, e o watcher leria
        // isso como desistência, largando a tela sem aviso no meio do login.
        stopWatchingPopup();
        googlePhase = "finishing";

        if (event.data.error || !event.data.token) {
            const failure = googleLoginFailure(
                event.data.error,
                event.data.until,
                event.data.reason,
            );
            if (failure.suspension) setSuspension(failure.suspension);

            toast.error(failure.message);
            googlePhase = "idle";
            return;
        }

        setToken(event.data.token);
        await auth.fetchUser();

        if (!auth.user) {
            toast.error(googleLoginFailure(null, null, null).message);
            googlePhase = "idle";
            return;
        }

        toast.success(`Bem-vindo, ${auth.user.name}`);
        await goto(safeRedirectPath(event.data.next), { replaceState: true });
    }
</script>

<svelte:window onmessage={onAuthMessage} />

<svelte:head><title>Entrar | Tukro</title></svelte:head>

<main class="flex min-h-dvh flex-col justify-center px-4 py-8 lg:py-12">
    <div class="mx-auto grid w-full max-w-4xl items-start gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <section class="order-2 flex flex-col gap-4 lg:order-1">
            <header class="flex flex-col gap-1">
                <h1 class="text-3xl font-bold text-primary">Tukro</h1>
                <p class="text-sm text-muted">Quem é você? Entre para rever a galera.</p>
            </header>

            <div class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4 sm:p-6">
                <h2 class="text-lg font-bold text-content">A internet que a gente perdeu</h2>

                <p class="text-sm text-content">
                    Lembra de quando entrar na internet era escolher o que ver? Você abria o perfil
                    de alguém porque queria, lia os recados na ordem em que chegaram, entrava numa
                    comunidade porque achou graça no nome. Ninguém decidia por você o que merecia
                    sua atenção.
                </p>

                <p class="text-sm text-content">
                    Aqui não tem feed adivinhando seu humor, não tem texto gerado por IA fingindo
                    ser gente, não tem métrica de engajamento decidindo quem some. Não tem anúncio,
                    não tem rastreador, e seus dados não são moeda de troca: você não é o produto,
                    porque não existe produto.
                </p>

                <p class="text-sm text-content">
                    É um perfil, uma foto, um status bobo, seus amigos e as comunidades que você
                    escolher. A internet como ela era quando ainda parecia nossa, e como talvez
                    devesse ter continuado.
                </p>

                <p class="text-sm text-muted">
                    Só que sinceridade também faz parte disso: o Tukro <strong
                        >não tem vínculo nenhum com o Orkut</strong
                    >, é um projeto pessoal feito por diversão, e você merece saber exatamente no
                    que está entrando antes de criar uma conta.
                    <a
                        href="/about"
                        class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                    >
                        Leia o aviso completo
                    </a>, leva um minuto.
                </p>
            </div>
        </section>

        <div class="order-1 flex flex-col gap-6 lg:order-2">
            {#if suspension}
                <div
                    role="alert"
                    class="flex flex-col gap-2 rounded-theme border border-danger bg-danger p-4 text-on-danger"
                >
                    <p class="font-bold">{suspensionMessage(suspension)}</p>

                    {#if suspension.reason}
                        <p class="text-sm break-words whitespace-pre-wrap">
                            Motivo: {suspension.reason}
                        </p>
                    {/if}

                    <p class="text-sm">
                        Enquanto durar, não dá para entrar nem com senha nem com o Google.
                    </p>

                    <button
                        type="button"
                        onclick={clearSuspension}
                        class="self-start text-xs underline underline-offset-2"
                    >
                        Não é a sua conta, ou a suspensão já foi revogada? Liberar o formulário
                    </button>
                </div>
            {/if}

            <form
                onsubmit={submit}
                class="flex flex-col gap-4 rounded-theme border border-line bg-surface p-4 sm:p-6"
            >
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
                        disabled={formDisabled}
                        bind:value={email}
                    />
                    <FieldError messages={errors.email} />
                </div>

                <div class="flex flex-col gap-1.5">
                    <div class="flex items-baseline justify-between gap-2">
                        <label for="password" class="text-sm font-medium text-content">Senha</label>
                        <a
                            href="/auth/forgot-password"
                            class="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                        >
                            Esqueceu a senha?
                        </a>
                    </div>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        autocomplete="current-password"
                        placeholder="Sua senha"
                        required
                        disabled={formDisabled}
                        bind:value={password}
                    />
                    <FieldError messages={errors.password} />
                </div>

                <Button type="submit" size="lg" class="w-full" disabled={formDisabled}>
                    {#if loading}
                        <span
                            class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                        ></span>
                    {/if}
                    {loading ? "Entrando..." : "Entrar"}
                </Button>

                <div class="flex items-center gap-3 text-xs text-muted">
                    <span class="h-px flex-1 bg-line"></span>
                    ou
                    <span class="h-px flex-1 bg-line"></span>
                </div>

                <Button
                    variant="outline"
                    size="lg"
                    class="w-full"
                    disabled={formDisabled}
                    onclick={loginWithGoogle}
                >
                    {#if googleLoading}
                        <span
                            class="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                        ></span>
                    {/if}
                    {googleLabels[googlePhase]}
                </Button>
            </form>

            <p class="text-center text-sm text-muted">
                Ainda não tem conta?
                <a
                    href="/register"
                    class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
                >
                    Criar conta
                </a>
            </p>
        </div>
    </div>
</main>

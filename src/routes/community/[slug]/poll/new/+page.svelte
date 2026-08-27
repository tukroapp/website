<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import Button from "#lib/components/Button.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import {
        POLL_MAX_OPTIONS,
        POLL_MIN_OPTIONS,
        POLL_OPTION_MAX_LENGTH,
        POLL_QUESTION_MAX_LENGTH,
        createPoll,
    } from "#lib/poll";
    import { loginUrl } from "#lib/redirect";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let question = $state("");
    let options = $state<string[]>(["", ""]);
    let minChoices = $state(1);
    let maxChoices = $state(1);
    let errors = $state<Record<string, string[]>>({});
    let saving = $state(false);

    const community = $derived(data.community);
    const canModerate = $derived(community.can_moderate);

    /** Opções preenchidas e aparadas: é o que o backend valida e o que limita o `max`. */
    const filledOptions = $derived(
        options.map((option) => option.trim()).filter((option) => option !== ""),
    );
    const valid = $derived(
        question.trim() !== "" &&
            filledOptions.length >= POLL_MIN_OPTIONS &&
            minChoices >= 1 &&
            maxChoices >= minChoices &&
            maxChoices <= filledOptions.length,
    );

    function addOption() {
        if (options.length < POLL_MAX_OPTIONS) options = [...options, ""];
    }

    function removeOption(index: number) {
        if (options.length <= POLL_MIN_OPTIONS) return;
        options = options.filter((_, i) => i !== index);

        // Menos opções pode deixar o teto de marcações impossível, então acompanha.
        const available = Math.max(1, options.filter((option) => option.trim() !== "").length);
        maxChoices = Math.min(maxChoices, available);
        minChoices = Math.min(minChoices, maxChoices);
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (!valid) return;

        saving = true;
        errors = {};
        try {
            const poll = await createPoll(community.slug, {
                question: question.trim(),
                min_choices: minChoices,
                max_choices: maxChoices,
                options: filledOptions,
            });
            toast.success("Enquete criada");
            await goto(`/community/${community.slug}/poll/${poll.id}`, { replaceState: true });
        } catch (error) {
            errors = toastApiError(error).fieldMessages();
            saving = false;
        }
    }
</script>

<svelte:head><title>Nova enquete em {community.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Nova enquete em {community.name}</h1>
        <a
            href="/community/{community.slug}/poll"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para as enquetes
        </a>
    </div>

    {#if !canModerate}
        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4">
            <p class="text-sm text-muted">Só a moderação da comunidade cria enquete.</p>
            {#if !auth.isAuthenticated}
                <a
                    href={loginUrl(page.url.pathname)}
                    class="text-sm text-primary underline underline-offset-2"
                >
                    entrar na sua conta
                </a>
            {/if}
        </div>
    {:else}
        <form
            onsubmit={submit}
            class="flex flex-col gap-4 rounded-theme border border-line bg-surface p-4"
        >
            <div class="flex flex-col gap-1">
                <label for="question" class="text-sm font-bold text-content">Pergunta</label>
                <input
                    id="question"
                    bind:value={question}
                    maxlength={POLL_QUESTION_MAX_LENGTH}
                    placeholder="O que você quer perguntar"
                    class="h-9 w-full rounded-theme border border-line bg-canvas px-3 text-sm text-content placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
                <FieldError messages={errors.question} />
            </div>

            <div class="flex flex-col gap-2">
                <span class="text-sm font-bold text-content">Opções</span>
                {#each options as _, index (index)}
                    <div class="flex items-center gap-2">
                        <input
                            bind:value={options[index]}
                            maxlength={POLL_OPTION_MAX_LENGTH}
                            placeholder="Opção {index + 1}"
                            aria-label="Opção {index + 1}"
                            class="h-9 w-full rounded-theme border border-line bg-canvas px-3 text-sm text-content placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                        />
                        {#if options.length > POLL_MIN_OPTIONS}
                            <button
                                type="button"
                                onclick={() => removeOption(index)}
                                class="shrink-0 cursor-pointer text-xs text-primary underline underline-offset-2"
                            >
                                remover
                            </button>
                        {/if}
                    </div>
                {/each}
                {#if options.length < POLL_MAX_OPTIONS}
                    <button
                        type="button"
                        onclick={addOption}
                        class="w-fit cursor-pointer text-xs text-primary underline underline-offset-2"
                    >
                        adicionar opção
                    </button>
                {/if}
                <FieldError messages={errors.options} />
            </div>

            <div class="flex flex-col gap-1">
                <span class="text-sm font-bold text-content">
                    Quantas opções cada pessoa pode marcar
                </span>
                <div class="flex items-center gap-2 text-sm text-content">
                    de
                    <input
                        type="number"
                        min="1"
                        max={filledOptions.length}
                        bind:value={minChoices}
                        aria-label="Mínimo de opções que cada pessoa marca"
                        class="h-9 w-16 rounded-theme border border-line bg-canvas px-2 text-sm text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    />
                    até
                    <input
                        type="number"
                        min={minChoices}
                        max={filledOptions.length}
                        bind:value={maxChoices}
                        aria-label="Máximo de opções que cada pessoa marca"
                        class="h-9 w-16 rounded-theme border border-line bg-canvas px-2 text-sm text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    />
                </div>
                {#if filledOptions.length >= POLL_MIN_OPTIONS && maxChoices > filledOptions.length}
                    <p class="text-xs text-danger">
                        O teto não pode passar do número de opções ({filledOptions.length}).
                    </p>
                {/if}
                <p class="text-xs text-muted">
                    Deixe "de 1 até 1" para escolha única. Um teto maior vira caixa de seleção.
                </p>
            </div>

            <div class="flex justify-end">
                <Button type="submit" disabled={saving || !valid}>
                    {saving ? "criando..." : "criar enquete"}
                </Button>
            </div>
        </form>
    {/if}
</main>

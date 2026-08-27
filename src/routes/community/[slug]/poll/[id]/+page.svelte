<script lang="ts">
    import { goto, refreshAll } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import {
        POLL_MAX_OPTIONS,
        POLL_MIN_OPTIONS,
        POLL_OPTION_MAX_LENGTH,
        POLL_QUESTION_MAX_LENGTH,
        choiceCountHint,
        closePoll,
        deletePoll,
        optionPercent,
        pollStatusLabel,
        updatePoll,
        votePoll,
        votesLabel,
    } from "#lib/poll";
    import { loginUrl } from "#lib/redirect";
    import { auth } from "#lib/state/user.svelte";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let poll = $derived(data.poll);
    let busy = $state(false);
    let editing = $state(false);
    let confirmingVote = $state(false);
    let confirmingClose = $state(false);
    let confirmingDelete = $state(false);
    let errors = $state<Record<string, string[]>>({});

    /** Marcações do leitor no formulário de voto, espelhando `poll.my_choices`. */
    let selected = $state<string[]>([]);

    /** Rascunho do editor do autor ou da moderação. */
    let form = $state({ question: "", options: [] as string[], minChoices: 1, maxChoices: 1 });

    const community = $derived(data.community);
    const isMember = $derived(community.my_role !== null);
    const single = $derived(poll.max_choices === 1);

    // Depende da enquete de propósito: abrir outra recarrega as marcações e fecha os formulários.
    $effect(() => {
        poll.id;
        selected = [...poll.my_choices];
        editing = false;
        confirmingVote = false;
        confirmingClose = false;
        confirmingDelete = false;
        errors = {};
    });

    // Com a página aberta na hora de encerrar, o load roda de novo para trazer os
    // resultados e o estado fechado direto do servidor.
    $effect(() => {
        const remaining = new Date(poll.closes_at).getTime() - Date.now();
        if (poll.is_closed || remaining <= 0) return;

        const timer = setTimeout(() => refreshAll(), remaining);
        return () => clearTimeout(timer);
    });

    const filledOptions = $derived(
        form.options.map((option) => option.trim()).filter((option) => option !== ""),
    );
    const editValid = $derived(
        form.question.trim() !== "" &&
            filledOptions.length >= POLL_MIN_OPTIONS &&
            form.minChoices >= 1 &&
            form.maxChoices >= form.minChoices &&
            form.maxChoices <= filledOptions.length,
    );
    const voteReady = $derived(
        selected.length >= poll.min_choices && selected.length <= poll.max_choices,
    );

    function toggle(optionId: string) {
        if (single) {
            selected = [optionId];
            return;
        }
        selected = selected.includes(optionId)
            ? selected.filter((id) => id !== optionId)
            : [...selected, optionId];
    }

    /**
     * Perder o vínculo, a enquete encerrar ou já ter um voto (409) deixam a tela velha,
     * então o load roda de novo para o estado do servidor voltar a valer.
     */
    function handleWriteError(error: unknown) {
        const apiError = toastApiError(error);
        if ([403, 404, 409].includes(apiError.status)) refreshAll();
    }

    function askVote(event: SubmitEvent) {
        event.preventDefault();
        if (voteReady) confirmingVote = true;
    }

    async function submitVote() {
        busy = true;
        try {
            poll = await votePoll(poll.id, selected);
            toast.success("Voto registrado");
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
            confirmingVote = false;
        }
    }

    async function close() {
        busy = true;
        try {
            poll = await closePoll(poll.id);
            toast.success("Enquete encerrada");
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
            confirmingClose = false;
        }
    }

    async function remove() {
        busy = true;
        try {
            await deletePoll(poll.id);
            toast.success("Enquete excluída");
            await goto(`/community/${community.slug}/poll`, { replaceState: true });
        } catch (error) {
            handleWriteError(error);
            busy = false;
            confirmingDelete = false;
        }
    }

    function startEditing() {
        form = {
            question: poll.question,
            options: poll.options.map((option) => option.text),
            minChoices: poll.min_choices,
            maxChoices: poll.max_choices,
        };
        errors = {};
        editing = true;
    }

    function addOption() {
        if (form.options.length < POLL_MAX_OPTIONS) form.options = [...form.options, ""];
    }

    function removeOption(index: number) {
        if (form.options.length <= POLL_MIN_OPTIONS) return;
        form.options = form.options.filter((_, i) => i !== index);

        // Menos opções pode deixar o teto de marcações impossível, então acompanha.
        const available = Math.max(1, form.options.filter((option) => option.trim() !== "").length);
        form.maxChoices = Math.min(form.maxChoices, available);
        form.minChoices = Math.min(form.minChoices, form.maxChoices);
    }

    async function saveEditing(event: SubmitEvent) {
        event.preventDefault();
        if (!editValid) return;

        busy = true;
        errors = {};
        try {
            // Sem `can_edit_options` os campos travados mantêm o valor atual, e o PUT aceita.
            poll = await updatePoll(poll.id, {
                question: form.question.trim(),
                min_choices: form.minChoices,
                max_choices: form.maxChoices,
                options: filledOptions,
            });
            editing = false;
        } catch (error) {
            errors = toastApiError(error).fieldMessages();
        } finally {
            busy = false;
        }
    }
</script>

<svelte:head><title>{poll.question} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <a
            href="/community/{community.slug}"
            class="text-sm text-primary underline underline-offset-2"
        >
            {community.name}
        </a>
        <a
            href="/community/{community.slug}/poll"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para as enquetes
        </a>
    </div>

    <article class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4">
        <div class="flex items-center gap-3">
            <a href="/@{poll.author.slug}" class="shrink-0">
                <Avatar
                    src={poll.author.avatar_url}
                    name={poll.author.name}
                    class="size-10"
                    textClass="text-sm"
                />
            </a>
            <div class="min-w-0">
                <a
                    href="/@{poll.author.slug}"
                    class="text-sm font-bold text-primary underline underline-offset-2"
                >
                    {poll.author.name}
                </a>
                <p class="text-xs text-muted">
                    {formatDateTime(poll.created_at)}
                    {#if poll.edited_at}(editado){/if}
                    &middot; {pollStatusLabel(poll)}
                    {#if !poll.is_closed}
                        &middot; até {formatDateTime(poll.closes_at)}
                    {/if}
                </p>
            </div>
        </div>

        {#if editing}
            <form onsubmit={saveEditing} class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label for="question" class="text-sm font-bold text-content">Pergunta</label>
                    <input
                        id="question"
                        bind:value={form.question}
                        maxlength={POLL_QUESTION_MAX_LENGTH}
                        class="h-9 w-full rounded-theme border border-line bg-canvas px-3 text-sm text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    />
                    <FieldError messages={errors.question} />
                </div>

                <div class="flex flex-col gap-2">
                    <span class="text-sm font-bold text-content">Opções</span>
                    {#if !poll.can_edit_options}
                        <p class="text-xs text-muted">
                            A enquete já tem votos: dá para mudar só a pergunta.
                        </p>
                    {/if}
                    {#each form.options as _, index (index)}
                        <div class="flex items-center gap-2">
                            <input
                                bind:value={form.options[index]}
                                maxlength={POLL_OPTION_MAX_LENGTH}
                                disabled={!poll.can_edit_options}
                                aria-label="Opção {index + 1}"
                                class="h-9 w-full rounded-theme border border-line bg-canvas px-3 text-sm text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
                            />
                            {#if poll.can_edit_options && form.options.length > POLL_MIN_OPTIONS}
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
                    {#if poll.can_edit_options && form.options.length < POLL_MAX_OPTIONS}
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

                {#if poll.can_edit_options}
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
                                bind:value={form.minChoices}
                                aria-label="Mínimo de opções que cada pessoa marca"
                                class="h-9 w-16 rounded-theme border border-line bg-canvas px-2 text-sm text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            />
                            até
                            <input
                                type="number"
                                min={form.minChoices}
                                max={filledOptions.length}
                                bind:value={form.maxChoices}
                                aria-label="Máximo de opções que cada pessoa marca"
                                class="h-9 w-16 rounded-theme border border-line bg-canvas px-2 text-sm text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                            />
                        </div>
                        {#if filledOptions.length >= POLL_MIN_OPTIONS && form.maxChoices > filledOptions.length}
                            <p class="text-xs text-danger">
                                O teto não pode passar do número de opções ({filledOptions.length}).
                            </p>
                        {/if}
                    </div>
                {/if}

                <div class="flex gap-2">
                    <Button type="submit" size="sm" disabled={busy || !editValid}>
                        {busy ? "salvando..." : "salvar"}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onclick={() => (editing = false)}
                    >
                        cancelar
                    </Button>
                </div>
            </form>
        {:else}
            <h1 class="text-xl font-bold break-words text-content">{poll.question}</h1>

            {#if poll.results_visible}
                <ul class="flex flex-col gap-2">
                    {#each poll.options as option (option.id)}
                        {@const mine = poll.my_choices.includes(option.id)}
                        {@const percent = optionPercent(option.votes ?? 0, poll.total_votes ?? 0)}
                        <li class="flex flex-col gap-1">
                            <div class="flex justify-between gap-2 text-sm">
                                <span class="break-words text-content {mine ? 'font-bold' : ''}">
                                    {option.text}{#if mine}&nbsp;(seu voto){/if}
                                </span>
                                <span class="shrink-0 text-muted">
                                    {percent}% &middot; {votesLabel(option.votes ?? 0)}
                                </span>
                            </div>
                            <div class="h-2 overflow-hidden rounded-theme bg-canvas">
                                <div
                                    class="h-full rounded-theme bg-primary"
                                    style="width: {percent}%"
                                ></div>
                            </div>
                        </li>
                    {/each}
                </ul>
                <p class="text-xs text-muted">{votesLabel(poll.total_votes ?? 0)} no total</p>
            {/if}

            {#if poll.can_vote}
                <form onsubmit={askVote} class="flex flex-col gap-2">
                    <p class="text-sm text-muted">
                        Vote para ver os resultados. O voto é único e definitivo.
                    </p>
                    <fieldset class="flex flex-col gap-2">
                        <legend class="sr-only">{poll.question}</legend>
                        {#each poll.options as option (option.id)}
                            <label class="flex items-center gap-2 text-sm text-content">
                                <input
                                    type={single ? "radio" : "checkbox"}
                                    name="poll-choice"
                                    checked={selected.includes(option.id)}
                                    onchange={() => toggle(option.id)}
                                    class="rounded-theme border-line text-primary focus:ring-primary"
                                />
                                <span class="break-words">{option.text}</span>
                            </label>
                        {/each}
                    </fieldset>
                    <div class="flex flex-wrap items-center gap-2">
                        <Button type="submit" size="sm" disabled={busy || !voteReady}>votar</Button>
                        <span class="text-xs text-muted">
                            {choiceCountHint(poll.min_choices, poll.max_choices)}
                        </span>
                    </div>
                </form>
            {:else if !poll.results_visible}
                <p class="text-sm text-muted">Vote para ver os resultados.</p>
                {#if !isMember}
                    <div
                        class="flex flex-wrap items-center justify-between gap-2 rounded-theme border border-line bg-canvas p-3"
                    >
                        <p class="text-sm text-muted">Só quem participa da comunidade vota.</p>
                        {#if auth.isAuthenticated}
                            <a
                                href="/community/{community.slug}"
                                class="text-sm text-primary underline underline-offset-2"
                            >
                                participar da comunidade
                            </a>
                        {:else}
                            <a
                                href={loginUrl(page.url.pathname)}
                                class="text-sm text-primary underline underline-offset-2"
                            >
                                entrar na sua conta
                            </a>
                        {/if}
                    </div>
                {/if}
            {/if}

            {#if poll.can_edit || poll.can_close || poll.can_delete}
                <div class="flex flex-wrap gap-3 text-xs text-primary">
                    {#if poll.can_edit}
                        <button
                            type="button"
                            class="cursor-pointer underline underline-offset-2"
                            disabled={busy}
                            onclick={startEditing}
                        >
                            editar
                        </button>
                    {/if}
                    {#if poll.can_close}
                        <button
                            type="button"
                            class="cursor-pointer underline underline-offset-2"
                            disabled={busy}
                            onclick={() => (confirmingClose = true)}
                        >
                            encerrar
                        </button>
                    {/if}
                    {#if poll.can_delete}
                        <button
                            type="button"
                            class="cursor-pointer underline underline-offset-2"
                            disabled={busy}
                            onclick={() => (confirmingDelete = true)}
                        >
                            excluir
                        </button>
                    {/if}
                </div>
            {/if}
        {/if}
    </article>
</main>

{#if confirmingVote}
    <ConfirmDialog
        title="Confirmar voto"
        confirmLabel="votar"
        {busy}
        onconfirm={submitVote}
        oncancel={() => (confirmingVote = false)}
    >
        O voto é único e definitivo: não dá para trocar nem retirar depois. Tem certeza?
    </ConfirmDialog>
{/if}

{#if confirmingClose}
    <ConfirmDialog
        title="Encerrar enquete"
        confirmLabel="encerrar"
        {busy}
        onconfirm={close}
        oncancel={() => (confirmingClose = false)}
    >
        Depois de encerrada ninguém mais vota e não dá para reabrir. Tem certeza?
    </ConfirmDialog>
{/if}

{#if confirmingDelete}
    <ConfirmDialog
        title="Excluir enquete"
        confirmLabel="excluir"
        {busy}
        onconfirm={remove}
        oncancel={() => (confirmingDelete = false)}
    >
        A enquete e os votos somem para todo mundo. Tem certeza?
    </ConfirmDialog>
{/if}

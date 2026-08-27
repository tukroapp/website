<script lang="ts">
    import { untrack, type Snippet } from "svelte";
    import { goto, refreshAll, replaceState } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import RichText from "#lib/components/RichText.svelte";
    import RichTextarea from "#lib/components/RichTextarea.svelte";
    import { isBlankBbcode, stripBbcode } from "#lib/bbcode";
    import { ApiError } from "#lib/error";
    import { loginUrl } from "#lib/redirect";
    import { auth } from "#lib/state/user.svelte";
    import {
        COMMENT_MAX_INDENT,
        COMMENT_MAX_LENGTH,
        TOPIC_BODY_MAX_LENGTH,
        TOPIC_TITLE_MAX_LENGTH,
        buildCommentTree,
        createComment,
        deleteComment,
        deleteTopic,
        fetchCommentContext,
        fetchTopicComments,
        setTopicLocked,
        setTopicPinned,
        updateComment,
        updateTopic,
    } from "#lib/topic";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { Comment, CommentContext, CommentNode } from "#lib/types";

    let { data } = $props();

    let topic = $derived(data.topic);
    let comments = $derived(data.comments);
    let nextCursor = $derived(data.nextCursor);
    let body = $state("");
    let replyingTo = $state<string | null>(null);
    let replyBody = $state("");
    let editingId = $state<string | null>(null);
    let editingBody = $state("");
    let editingTopic = $state(false);
    let topicForm = $state({ title: "", body: "" });
    let confirmingDelete = $state(false);
    let loading = $state(false);
    let busy = $state(false);

    /** Comentário em foco na visão de contexto, espelhado no search param `comment`. */
    let contextId = $state<string | null>(null);
    let context = $state<CommentContext | null>(null);
    /** Ids visitados antes do que está em foco, para o botão voltar andar a conversa de trás para frente. */
    let contextStack = $state<string[]>([]);
    let contextLoading = $state(false);
    /** Comentário já aberto pela barra de endereço, para nunca reabrir sozinho. */
    let consumedFocus: string | null = null;

    /** Um card por comentário raiz, com a subárvore inteira daquela raiz aninhada dentro dele. */
    const threads = $derived(buildCommentTree(comments));
    const contextReplies = $derived(buildCommentTree(context?.replies ?? []));

    const community = $derived(data.community);
    const isMember = $derived(community.my_role !== null);
    const canInteract = $derived(isMember && !topic.is_locked);

    // Depende do tópico de propósito: abrir outro zera formulários e fecha o contexto aberto.
    $effect(() => {
        topic.id;
        body = "";
        replyingTo = null;
        editingId = null;
        editingTopic = false;
        confirmingDelete = false;

        // `closeContext` escreve no estado do contexto, e rastreá-lo aqui faria o efeito
        // disparar de novo a cada passo da navegação dentro da conversa.
        untrack(() => closeContext());
    });

    // A notificação de resposta aponta direto para um comentário, que abre no contexto.
    $effect(() => {
        const focus = page.url.searchParams.get("comment");
        untrack(() => {
            if (focus === null || focus === consumedFocus) return;
            consumedFocus = focus;
            openContext(focus);
        });
    });

    function commentsLabel(count: number): string {
        return `${count} ${count === 1 ? "comentário" : "comentários"}`;
    }

    /** Acima do teto de recuo a hierarquia para de aparecer, então a resposta diz a quem responde. */
    function parentAuthorName(comment: Comment): string | null {
        if (comment.depth <= COMMENT_MAX_INDENT || comment.parent_id === null) return null;
        return comments.find((item) => item.id === comment.parent_id)?.author?.name ?? null;
    }

    /** Perder o vínculo, o tópico ser trancado ou o comentário sumir deixam a tela desatualizada. */
    function handleWriteError(error: unknown) {
        const apiError = toastApiError(error);
        if (apiError.status === 403 || apiError.status === 404) refreshAll();
    }

    async function loadMore() {
        loading = true;
        try {
            const next = await fetchTopicComments(topic.id, nextCursor);
            comments = [...comments, ...next.results];
            // O tamanho de `results` não diz nada: o cursor anda pelas raízes, não pela árvore.
            nextCursor = next.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function submitComment(event: SubmitEvent) {
        event.preventDefault();
        if (isBlankBbcode(body)) return;

        busy = true;
        try {
            const comment = await createComment(topic.id, body.trim());
            comments = [...comments, comment];
            body = "";
            topic = { ...topic, comment_count: topic.comment_count + 1 };
            toast.success("Comentário publicado");
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
        }
    }

    /** A lista é plana em ordem de leitura, então a resposta entra depois da subárvore do pai dela. */
    function insertReply(parent: Comment, reply: Comment) {
        const start = comments.findIndex((item) => item.id === parent.id);
        if (start === -1) return;

        let index = start + 1;
        while (index < comments.length && comments[index].depth > parent.depth) index++;

        // O endpoint de criação sempre responde profundidade 0, a real é conhecida aqui.
        const placed = { ...reply, depth: parent.depth + 1 };
        comments = [...comments.slice(0, index), placed, ...comments.slice(index)];
    }

    function startReply(comment: Comment) {
        replyingTo = comment.id;
        replyBody = "";
    }

    async function submitReply(parent: Comment) {
        if (isBlankBbcode(replyBody)) return;

        busy = true;
        try {
            const reply = await createComment(topic.id, replyBody.trim(), parent.id);
            insertReply(parent, reply);
            replyingTo = null;
            replyBody = "";
            topic = { ...topic, comment_count: topic.comment_count + 1 };
            toast.success("Resposta publicada");
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
        }
    }

    function startEditing(comment: Comment) {
        editingId = comment.id;
        editingBody = comment.body;
    }

    async function saveEditing(comment: Comment) {
        if (isBlankBbcode(editingBody)) return;

        busy = true;
        try {
            const updated = await updateComment(topic.id, comment.id, editingBody.trim());
            // Os endpoints de escrita respondem profundidade 0, a posição na árvore vem da lista.
            comments = comments.map((item) =>
                item.id === comment.id ? { ...updated, depth: item.depth } : item,
            );
            editingId = null;
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
        }
    }

    async function removeComment(comment: Comment) {
        busy = true;
        try {
            await deleteComment(topic.id, comment.id);
            // O comentário fica na conversa como marcador: as respostas abaixo dependem dele.
            comments = comments.map((item) =>
                item.id === comment.id
                    ? {
                          ...item,
                          deleted_at: new Date().toISOString(),
                          author: null,
                          can_edit: false,
                          can_delete: false,
                      }
                    : item,
            );
            topic = { ...topic, comment_count: Math.max(0, topic.comment_count - 1) };
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
        }
    }

    function startEditingTopic() {
        topicForm = { title: topic.title, body: topic.body };
        editingTopic = true;
    }

    async function saveTopic(event: SubmitEvent) {
        event.preventDefault();
        if (topicForm.title.trim() === "" || isBlankBbcode(topicForm.body)) return;

        busy = true;
        try {
            topic = await updateTopic(topic.id, {
                title: topicForm.title.trim(),
                body: topicForm.body.trim(),
            });
            editingTopic = false;
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
        }
    }

    async function togglePin() {
        busy = true;
        try {
            topic = await setTopicPinned(topic.id, !topic.is_pinned);
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
        }
    }

    async function toggleLock() {
        busy = true;
        try {
            topic = await setTopicLocked(topic.id, !topic.is_locked);
        } catch (error) {
            handleWriteError(error);
        } finally {
            busy = false;
        }
    }

    async function removeTopic() {
        busy = true;
        try {
            await deleteTopic(topic.id);
            toast.success("Tópico excluído");
            await goto(`/community/${community.slug}/topic`, { replaceState: true });
        } catch (error) {
            handleWriteError(error);
            busy = false;
        }
    }

    /**
     * Mantém o comentário em foco na barra de endereço, para um reload cair na mesma visão.
     * `replaceState` reescreve só a barra de endereço e deixa `page.url` no valor do load da
     * página, e é por isso que quem é lido aqui é o location atual.
     */
    function syncContextParam(id: string | null) {
        const url = new URL(location.href);
        if (id === null) {
            url.searchParams.delete("comment");
        } else {
            url.searchParams.set("comment", id);
        }
        replaceState(url, {});
    }

    /** Entrar em outro comentário empilha o atual, e o botão voltar desempilha. */
    function showContext(id: string) {
        if (contextId !== null) contextStack = [...contextStack, contextId];
        syncContextParam(id);
        openContext(id);
    }

    function backContext() {
        const previous = contextStack.at(-1) ?? null;
        contextStack = contextStack.slice(0, -1);
        if (previous === null) {
            dismissContext();
        } else {
            syncContextParam(previous);
            openContext(previous);
        }
    }

    function closeContext() {
        contextStack = [];
        contextId = null;
        context = null;
    }

    /** Fechar é decisão de quem lê, então o comentário sai da barra de endereço junto. */
    function dismissContext() {
        closeContext();
        syncContextParam(null);
    }

    async function openContext(id: string) {
        contextId = id;
        context = null;
        contextLoading = true;
        try {
            context = await fetchCommentContext(topic.id, id);
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                toast.info("Esse comentário não existe mais");
            } else {
                toastApiError(error);
            }
            dismissContext();
        } finally {
            contextLoading = false;
        }
    }

    async function loadMoreContextReplies() {
        if (contextId === null || context === null || context.next_cursor === null) return;

        contextLoading = true;
        try {
            const next = await fetchCommentContext(topic.id, contextId, context.next_cursor);
            context = { ...next, replies: [...context.replies, ...next.replies] };
        } catch (error) {
            toastApiError(error);
        } finally {
            contextLoading = false;
        }
    }
</script>

<svelte:head><title>{topic.title} | Tukro</title></svelte:head>
<svelte:window onkeydown={(event) => event.key === "Escape" && dismissContext()} />

{#snippet commentMeta(comment: Comment)}
    <div class="flex flex-wrap items-baseline justify-between gap-2">
        {#if comment.author}
            <a
                href="/@{comment.author.slug}"
                class="text-sm font-bold text-primary underline underline-offset-2"
            >
                {comment.author.name}
            </a>
        {:else}
            <span class="text-sm font-bold text-muted italic">comentário excluído</span>
        {/if}
        <span class="text-xs text-muted">
            {formatDateTime(comment.created_at)}
            {#if comment.edited_at}(editado){/if}
        </span>
    </div>
{/snippet}

{#snippet contextBlock(comment: Comment)}
    {#if comment.deleted_at}
        <p class="text-sm text-muted italic">comentário excluído</p>
    {:else}
        {@render commentMeta(comment)}
        <RichText value={comment.body} class="mt-1 text-sm text-content" />
        <button
            type="button"
            class="mt-1 w-fit cursor-pointer text-xs text-primary underline underline-offset-2"
            onclick={() => showContext(comment.id)}
        >
            ver contexto
        </button>
    {/if}
{/snippet}

<!--
    O trilho é desenhado uma vez por nível, pela caixa que segura os filhos, então ele vai da
    primeira resposta até a última e um comentário se lê como pendurado no de cima. Acima do
    teto o trilho para de crescer, senão uma conversa longa vira uma tira fina de texto no
    celular, e aí a resposta diz em voz alta a quem responde.
-->
{#snippet commentBranch(node: CommentNode, level: number, row: Snippet<[Comment]>)}
    <div class="flex flex-col gap-3">
        {@render row(node.comment)}

        {#if node.children.length > 0}
            <div
                class="flex flex-col gap-3 {level < COMMENT_MAX_INDENT
                    ? 'border-s border-line ps-3'
                    : ''}"
            >
                {#each node.children as child (child.comment.id)}
                    {@render commentBranch(child, level + 1, row)}
                {/each}
            </div>
        {/if}
    </div>
{/snippet}

{#snippet commentBlock(comment: Comment)}
    {#if comment.deleted_at}
        <p class="text-sm text-muted italic">comentário excluído</p>
    {:else}
        <div class="flex gap-3">
            <a href="/@{comment.author?.slug}" class="shrink-0">
                <Avatar
                    src={comment.author?.avatar_url ?? null}
                    name={comment.author?.name ?? ""}
                    class="size-9"
                    textClass="text-xs"
                />
            </a>

            <div class="flex min-w-0 flex-1 flex-col gap-1">
                {@render commentMeta(comment)}

                {#if parentAuthorName(comment)}
                    <p class="text-xs text-muted">
                        em resposta a {parentAuthorName(comment)}
                    </p>
                {/if}

                {#if editingId === comment.id}
                    <RichTextarea bind:value={editingBody} maxlength={COMMENT_MAX_LENGTH} />
                    <div class="flex gap-2">
                        <Button
                            size="sm"
                            disabled={busy || isBlankBbcode(editingBody)}
                            onclick={() => saveEditing(comment)}
                        >
                            salvar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onclick={() => (editingId = null)}
                        >
                            cancelar
                        </Button>
                    </div>
                {:else}
                    <RichText value={comment.body} class="text-sm text-content" />

                    <div class="flex flex-wrap gap-3 text-xs text-primary">
                        {#if canInteract}
                            <button
                                type="button"
                                class="cursor-pointer underline underline-offset-2"
                                onclick={() => startReply(comment)}
                            >
                                responder
                            </button>
                        {/if}
                        {#if comment.can_edit}
                            <button
                                type="button"
                                class="cursor-pointer underline underline-offset-2"
                                disabled={busy}
                                onclick={() => startEditing(comment)}
                            >
                                editar
                            </button>
                        {/if}
                        {#if comment.can_delete}
                            <button
                                type="button"
                                class="cursor-pointer underline underline-offset-2"
                                disabled={busy}
                                onclick={() => removeComment(comment)}
                            >
                                apagar
                            </button>
                        {/if}
                        <button
                            type="button"
                            class="cursor-pointer underline underline-offset-2"
                            onclick={() => showContext(comment.id)}
                        >
                            ver contexto
                        </button>
                    </div>
                {/if}

                {#if replyingTo === comment.id}
                    <div class="flex flex-col gap-2">
                        <RichTextarea
                            bind:value={replyBody}
                            maxlength={COMMENT_MAX_LENGTH}
                            placeholder="Responder a {comment.author?.name}"
                        />
                        <div class="flex gap-2">
                            <Button
                                size="sm"
                                disabled={busy || isBlankBbcode(replyBody)}
                                onclick={() => submitReply(comment)}
                            >
                                responder
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onclick={() => (replyingTo = null)}
                            >
                                cancelar
                            </Button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
{/snippet}

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <a
            href="/community/{community.slug}"
            class="text-sm text-primary underline underline-offset-2"
        >
            {community.name}
        </a>
        <a
            href="/community/{community.slug}/topic"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para o fórum
        </a>
    </div>

    <article class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
        <div class="flex flex-wrap items-center gap-2">
            {#if topic.is_pinned}
                <span class="rounded-theme bg-accent px-1.5 py-0.5 text-xs text-on-accent">
                    fixado
                </span>
            {/if}
            {#if topic.is_locked}
                <span class="rounded-theme border border-line px-1.5 py-0.5 text-xs text-muted">
                    trancado
                </span>
            {/if}
        </div>

        {#if editingTopic}
            <form onsubmit={saveTopic} class="flex flex-col gap-2">
                <input
                    bind:value={topicForm.title}
                    maxlength={TOPIC_TITLE_MAX_LENGTH}
                    class="h-9 w-full rounded-theme border border-line bg-canvas px-3 text-sm text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                />
                <RichTextarea
                    bind:value={topicForm.body}
                    rows={8}
                    maxlength={TOPIC_BODY_MAX_LENGTH}
                />
                <div class="flex gap-2">
                    <Button
                        type="submit"
                        size="sm"
                        disabled={busy ||
                            topicForm.title.trim() === "" ||
                            isBlankBbcode(topicForm.body)}
                    >
                        salvar
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onclick={() => (editingTopic = false)}
                    >
                        cancelar
                    </Button>
                </div>
            </form>
        {:else}
            <h1 class="text-xl font-bold break-words text-content">{topic.title}</h1>

            <div class="flex items-center gap-3">
                <a href="/@{topic.author.slug}" class="shrink-0">
                    <Avatar
                        src={topic.author.avatar_url}
                        name={topic.author.name}
                        class="size-10"
                        textClass="text-sm"
                    />
                </a>
                <div class="min-w-0">
                    <a
                        href="/@{topic.author.slug}"
                        class="text-sm font-bold text-primary underline underline-offset-2"
                    >
                        {topic.author.name}
                    </a>
                    <p class="text-xs text-muted">
                        {formatDateTime(topic.created_at)}
                        {#if topic.edited_at}(editado){/if}
                    </p>
                </div>
            </div>

            <RichText value={topic.body} class="text-sm text-content" />

            <div class="flex flex-wrap gap-3 text-xs text-primary">
                {#if topic.can_edit && !topic.is_locked}
                    <button
                        type="button"
                        class="cursor-pointer underline underline-offset-2"
                        disabled={busy}
                        onclick={startEditingTopic}
                    >
                        editar
                    </button>
                {/if}
                {#if topic.can_moderate}
                    <button
                        type="button"
                        class="cursor-pointer underline underline-offset-2"
                        disabled={busy}
                        onclick={togglePin}
                    >
                        {topic.is_pinned ? "desafixar" : "fixar"}
                    </button>
                    <button
                        type="button"
                        class="cursor-pointer underline underline-offset-2"
                        disabled={busy}
                        onclick={toggleLock}
                    >
                        {topic.is_locked ? "destrancar" : "trancar"}
                    </button>
                {/if}
                {#if topic.can_delete}
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

            {#if confirmingDelete}
                <div class="flex flex-wrap items-center gap-2 rounded-theme bg-canvas p-3">
                    <p class="flex-1 text-sm text-content">
                        Excluir este tópico? Os comentários somem junto.
                    </p>
                    <Button size="sm" variant="danger" disabled={busy} onclick={removeTopic}>
                        excluir
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onclick={() => (confirmingDelete = false)}
                    >
                        cancelar
                    </Button>
                </div>
            {/if}
        {/if}
    </article>

    <h2 class="text-sm font-bold text-content">{commentsLabel(topic.comment_count)}</h2>

    {#if canInteract}
        <form
            onsubmit={submitComment}
            class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3"
        >
            <RichTextarea
                bind:value={body}
                rows={4}
                maxlength={COMMENT_MAX_LENGTH}
                placeholder="Escreva um comentário"
            />
            <div class="flex flex-wrap items-center justify-between gap-2">
                <Button type="submit" size="sm" disabled={busy || isBlankBbcode(body)}>
                    comentar
                </Button>
                <span class="text-xs text-muted">
                    {COMMENT_MAX_LENGTH - body.length} caracteres restantes
                </span>
            </div>
        </form>
    {:else if topic.is_locked}
        <EmptyState
            >Este tópico foi trancado pela moderação: ninguém comenta nem edita comentário.</EmptyState
        >
    {:else}
        <div
            class="flex flex-wrap items-center justify-between gap-2 rounded-theme border border-line bg-surface p-3"
        >
            <p class="text-sm text-muted">Entre na comunidade para comentar no fórum.</p>
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

    {#if comments.length === 0}
        <EmptyState>{loading ? "Carregando..." : "Nenhum comentário ainda."}</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each threads as thread (thread.comment.id)}
                <li class="rounded-theme border border-line bg-surface p-3">
                    {@render commentBranch(thread, 0, commentBlock)}
                </li>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

{#if contextId !== null}
    <div class="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3">
        <div
            class="mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-theme border border-line bg-surface p-3"
        >
            <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-bold text-content">Comentário no contexto</h2>
                <div class="flex gap-2">
                    {#if contextStack.length > 0}
                        <Button size="sm" variant="outline" onclick={backContext}>voltar</Button>
                    {/if}
                    <Button size="sm" variant="ghost" onclick={dismissContext}>fechar</Button>
                </div>
            </div>

            {#if context === null}
                <p class="text-sm text-muted">Carregando comentário...</p>
            {:else}
                {#if context.ancestors.length > 0}
                    <ul class="flex flex-col gap-1 border-s-2 border-line ps-3">
                        {#each context.ancestors as ancestor (ancestor.id)}
                            <li class="text-xs">
                                {#if ancestor.deleted_at}
                                    <p class="text-muted italic">comentário excluído</p>
                                {:else}
                                    <p class="text-muted">
                                        <span class="font-bold text-content">
                                            {ancestor.author?.name}
                                        </span>
                                        <span class="line-clamp-2 break-words"
                                            >{stripBbcode(ancestor.body)}</span
                                        >
                                    </p>
                                    <button
                                        type="button"
                                        class="cursor-pointer text-primary underline underline-offset-2"
                                        onclick={() => showContext(ancestor.id)}
                                    >
                                        ver contexto
                                    </button>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                {/if}

                <div class="rounded-theme border border-primary bg-canvas p-3">
                    {#if context.comment.deleted_at}
                        <p class="text-sm text-muted italic">comentário excluído</p>
                    {:else}
                        {@render commentMeta(context.comment)}
                        <RichText value={context.comment.body} class="mt-1 text-sm text-content" />
                    {/if}
                </div>

                {#if context.replies.length === 0}
                    <p class="text-sm text-muted">Nenhuma resposta a este comentário.</p>
                {:else}
                    <ul class="flex flex-col gap-3 rounded-theme border border-line p-3">
                        {#each contextReplies as reply (reply.comment.id)}
                            <li>{@render commentBranch(reply, 0, contextBlock)}</li>
                        {/each}
                    </ul>
                {/if}

                {#if context.next_cursor !== null}
                    <div class="flex justify-center">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={contextLoading}
                            onclick={loadMoreContextReplies}
                        >
                            {contextLoading ? "carregando..." : "carregar mais respostas"}
                        </Button>
                    </div>
                {/if}
            {/if}
        </div>
    </div>
{/if}

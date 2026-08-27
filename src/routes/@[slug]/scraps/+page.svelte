<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import RichText from "#lib/components/RichText.svelte";
    import RichTextarea from "#lib/components/RichTextarea.svelte";
    import {
        SCRAP_MAX_LENGTH,
        createScrap,
        createScrapReply,
        deleteScrap,
        fetchProfileScraps,
        fetchScrapReplies,
        updateScrap,
    } from "#lib/scrap";
    import { isBlankBbcode } from "#lib/bbcode";
    import { ApiError } from "#lib/error";
    import { auth } from "#lib/state/user.svelte";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { Scrap } from "#lib/types";

    interface Thread {
        open: boolean;
        loading: boolean;
        replies: Scrap[];
        nextCursor: string | null;
        body: string;
    }

    let { data } = $props();

    let scraps = $derived(data.scraps);
    let nextCursor = $derived(data.nextCursor);
    let threads = $state<Record<string, Thread>>({});
    let body = $state("");
    let editingId = $state<string | null>(null);
    let editingBody = $state("");
    let loading = $state(false);
    let busy = $state(false);

    let profile = $derived(data.profile);
    const firstName = $derived(profile.name.split(" ")[0]);
    const isWallOwner = $derived(auth.user?.slug === profile.slug);
    const remaining = $derived(SCRAP_MAX_LENGTH - body.length);

    // Depende do slug de propósito: trocar de mural zera rascunho, edição e respostas abertas.
    $effect(() => {
        profile.slug;
        threads = {};
        body = "";
        editingId = null;
    });

    function canEdit(scrap: Scrap): boolean {
        return auth.user?.id === scrap.author.id;
    }

    function canDelete(scrap: Scrap): boolean {
        return canEdit(scrap) || isWallOwner;
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchProfileScraps(profile.slug, nextCursor);
            scraps = [...scraps, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    /**
     * O contador do cabeçalho vem do load, então ele anda junto com o mural. Só recado de
     * primeiro nível conta, e ele é null quando o mural é privado para quem está olhando.
     */
    function countScraps(delta: number) {
        if (profile.scraps_count === null) return;
        profile = { ...profile, scraps_count: Math.max(0, profile.scraps_count + delta) };
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (isBlankBbcode(body)) return;

        busy = true;
        try {
            const scrap = await createScrap(profile.slug, body.trim());
            scraps = [scrap, ...scraps];
            countScraps(1);
            body = "";
            toast.success("Recado enviado");
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    function startEditing(scrap: Scrap) {
        editingId = scrap.id;
        editingBody = scrap.body;
    }

    async function saveEditing(scrap: Scrap) {
        if (isBlankBbcode(editingBody)) return;

        busy = true;
        try {
            const updated = await updateScrap(scrap.id, editingBody.trim());
            scraps = scraps.map((item) => (item.id === scrap.id ? updated : item));
            editingId = null;
            toast.success("Recado editado");
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                toast.info("Esse recado não existe mais");
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    async function remove(scrap: Scrap) {
        busy = true;
        try {
            await deleteScrap(scrap.id);
            // Apagar um recado de primeiro nível apaga as respostas dele, então a conversa vai junto.
            scraps = scraps.filter((item) => item.id !== scrap.id);
            delete threads[scrap.id];
            countScraps(-1);
            // Apagar o recado apaga em cascata a notificação dele, então o contador muda.
            await auth.fetchUser();
            toast.success("Recado apagado");
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    async function toggleThread(scrap: Scrap) {
        const thread = threads[scrap.id];
        if (thread) {
            thread.open = !thread.open;
            return;
        }

        threads[scrap.id] = { open: true, loading: true, replies: [], nextCursor: null, body: "" };
        try {
            const page = await fetchScrapReplies(scrap.id);
            // A API responde do mais novo para o mais antigo, e a conversa se lê melhor em ordem cronológica.
            threads[scrap.id].replies = [...page.results].reverse();
            threads[scrap.id].nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
            delete threads[scrap.id];
        } finally {
            if (threads[scrap.id]) threads[scrap.id].loading = false;
        }
    }

    async function loadMoreReplies(scrap: Scrap) {
        const thread = threads[scrap.id];
        if (!thread || thread.nextCursor === null) return;

        thread.loading = true;
        try {
            const page = await fetchScrapReplies(scrap.id, thread.nextCursor);
            thread.replies = [...[...page.results].reverse(), ...thread.replies];
            thread.nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            thread.loading = false;
        }
    }

    async function submitReply(scrap: Scrap) {
        const thread = threads[scrap.id];
        if (!thread || isBlankBbcode(thread.body)) return;

        busy = true;
        try {
            const reply = await createScrapReply(scrap.id, thread.body.trim());
            thread.replies = [...thread.replies, reply];
            thread.body = "";
            scraps = scraps.map((item) =>
                item.id === scrap.id ? { ...item, reply_count: item.reply_count + 1 } : item,
            );
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                toast.info("Esse recado não existe mais");
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    async function removeReply(scrap: Scrap, reply: Scrap) {
        busy = true;
        try {
            await deleteScrap(reply.id);
            const thread = threads[scrap.id];
            if (thread) thread.replies = thread.replies.filter((item) => item.id !== reply.id);
            scraps = scraps.map((item) =>
                item.id === scrap.id
                    ? { ...item, reply_count: Math.max(0, item.reply_count - 1) }
                    : item,
            );
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }
</script>

<svelte:head><title>Recados de {profile.name} | Tukro</title></svelte:head>

{#snippet header(scrap: Scrap)}
    <div class="flex flex-wrap items-baseline justify-between gap-2">
        <a href="/@{scrap.author.slug}" class="font-bold text-primary underline underline-offset-2">
            {scrap.author.name}
        </a>
        <span class="text-xs text-muted">
            {formatDateTime(scrap.created_at)}
            {#if scrap.updated_at !== scrap.created_at}(editado){/if}
        </span>
    </div>
{/snippet}

<main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-xl font-bold text-content">
            Recados de {profile.name}
            {#if profile.scraps_count !== null}({profile.scraps_count}){/if}
        </h1>
        <a href="/@{profile.slug}" class="text-sm text-primary underline underline-offset-2">
            voltar ao perfil
        </a>
    </div>

    {#if !profile.scraps_visible}
        <EmptyState>O mural desse perfil é privado.</EmptyState>
    {:else}
        {#if profile.can_write_scrap}
            <form
                onsubmit={submit}
                class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3"
            >
                <RichTextarea
                    bind:value={body}
                    rows={4}
                    maxlength={SCRAP_MAX_LENGTH}
                    placeholder="Escreva um recado para {firstName}"
                />

                <div class="flex flex-wrap items-center justify-between gap-2">
                    <Button size="sm" type="submit" disabled={busy || isBlankBbcode(body)}>
                        enviar recado
                    </Button>
                    <span class="text-xs text-muted">{remaining} caracteres restantes</span>
                </div>
            </form>
        {/if}

        {#if scraps.length === 0}
            <EmptyState>{loading ? "Carregando..." : "Nenhum recado ainda."}</EmptyState>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each scraps as scrap (scrap.id)}
                    <li class="flex gap-3 rounded-theme border border-line bg-surface p-3">
                        <a href="/@{scrap.author.slug}" class="shrink-0">
                            <Avatar
                                src={scrap.author.avatar_url}
                                name={scrap.author.name}
                                class="size-12"
                            />
                        </a>

                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                            {@render header(scrap)}

                            {#if editingId === scrap.id}
                                <RichTextarea
                                    bind:value={editingBody}
                                    maxlength={SCRAP_MAX_LENGTH}
                                />
                                <div class="flex gap-2">
                                    <Button
                                        size="sm"
                                        disabled={busy || isBlankBbcode(editingBody)}
                                        onclick={() => saveEditing(scrap)}
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
                                <RichText value={scrap.body} class="text-sm text-content" />

                                <div class="flex flex-wrap gap-3 text-xs text-primary">
                                    <button
                                        type="button"
                                        class="cursor-pointer underline underline-offset-2"
                                        onclick={() => toggleThread(scrap)}
                                    >
                                        {threads[scrap.id]?.open ? "ocultar" : "responder"}
                                        {#if scrap.reply_count > 0}({scrap.reply_count}){/if}
                                    </button>
                                    {#if canEdit(scrap)}
                                        <button
                                            type="button"
                                            class="cursor-pointer underline underline-offset-2"
                                            disabled={busy}
                                            onclick={() => startEditing(scrap)}
                                        >
                                            editar
                                        </button>
                                    {/if}
                                    {#if canDelete(scrap)}
                                        <button
                                            type="button"
                                            class="cursor-pointer underline underline-offset-2"
                                            disabled={busy}
                                            onclick={() => remove(scrap)}
                                        >
                                            apagar
                                        </button>
                                    {/if}
                                </div>
                            {/if}

                            {#if threads[scrap.id]?.open}
                                <div class="mt-1 flex flex-col gap-2 border-s-2 border-line ps-3">
                                    {#if threads[scrap.id].nextCursor !== null}
                                        <button
                                            type="button"
                                            class="w-fit cursor-pointer text-xs text-primary underline underline-offset-2"
                                            disabled={threads[scrap.id].loading}
                                            onclick={() => loadMoreReplies(scrap)}
                                        >
                                            ver respostas anteriores
                                        </button>
                                    {/if}

                                    {#if threads[scrap.id].loading}
                                        <p class="text-xs text-muted">Carregando respostas...</p>
                                    {/if}

                                    {#each threads[scrap.id].replies as reply (reply.id)}
                                        <div class="flex gap-2">
                                            <a href="/@{reply.author.slug}" class="shrink-0">
                                                <Avatar
                                                    src={reply.author.avatar_url}
                                                    name={reply.author.name}
                                                    class="size-8"
                                                    textClass="text-xs"
                                                />
                                            </a>

                                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                                {@render header(reply)}
                                                <RichText
                                                    value={reply.body}
                                                    class="text-sm text-content"
                                                />
                                                {#if canDelete(reply)}
                                                    <button
                                                        type="button"
                                                        class="w-fit cursor-pointer text-xs text-primary underline underline-offset-2"
                                                        disabled={busy}
                                                        onclick={() => removeReply(scrap, reply)}
                                                    >
                                                        apagar
                                                    </button>
                                                {/if}
                                            </div>
                                        </div>
                                    {/each}

                                    {#if profile.can_write_scrap}
                                        <div class="flex flex-col gap-2">
                                            <RichTextarea
                                                bind:value={threads[scrap.id].body}
                                                rows={2}
                                                maxlength={SCRAP_MAX_LENGTH}
                                                placeholder="Responder"
                                            />
                                            <Button
                                                size="sm"
                                                disabled={busy ||
                                                    isBlankBbcode(threads[scrap.id].body)}
                                                onclick={() => submitReply(scrap)}
                                            >
                                                responder
                                            </Button>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </li>
                {/each}
            </ul>

            <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
        {/if}
    {/if}
</main>

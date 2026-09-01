<script lang="ts">
    import AuthorLink from "#lib/components/AuthorLink.svelte";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import ReportDialog from "#lib/components/ReportDialog.svelte";
    import {
        MEDIA_COMMENT_MAX_LENGTH,
        createMediaComment,
        deleteMediaComment,
        fetchMediaComments,
    } from "#lib/media";
    import { auth } from "#lib/state/user.svelte";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import { EMAIL_GATE_HINT } from "#lib/verification";
    import type { MediaComment } from "#lib/types";

    interface Props {
        mediaId: string;
        /** Slug do dono da foto: pode apagar qualquer comentário. */
        ownerSlug: string;
        /** Avisa a mudança de contagem, para o pai atualizar o badge do card. */
        oncountchange?: (delta: number) => void;
    }

    let { mediaId, ownerSlug, oncountchange }: Props = $props();

    let comments = $state<MediaComment[]>([]);
    let nextCursor = $state<string | null>(null);
    let loading = $state(true);
    let body = $state("");
    let busy = $state(false);
    let reporting = $state(false);
    let reportRef = $state("");

    const isPhotoOwner = $derived(auth.user?.slug === ownerSlug);

    // Recarrega ao trocar de foto.
    $effect(() => {
        mediaId;
        load();
    });

    async function load() {
        loading = true;
        comments = [];
        try {
            const page = await fetchMediaComments(mediaId);
            comments = page.results;
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function loadMore() {
        try {
            const page = await fetchMediaComments(mediaId, nextCursor);
            comments = [...comments, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        }
    }

    function canDelete(comment: MediaComment): boolean {
        return isPhotoOwner || (!!auth.user && comment.author?.id === auth.user.id);
    }

    function canReport(comment: MediaComment): boolean {
        return !!auth.user && comment.author?.id !== auth.user.id;
    }

    async function submit(event: SubmitEvent) {
        event.preventDefault();
        if (busy || body.trim() === "") return;
        busy = true;
        try {
            const created = await createMediaComment(mediaId, body);
            comments = [...comments, created];
            body = "";
            oncountchange?.(1);
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function remove(comment: MediaComment) {
        busy = true;
        try {
            await deleteMediaComment(mediaId, comment.id);
            comments = comments.filter((entry) => entry.id !== comment.id);
            oncountchange?.(-1);
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    function openReport(comment: MediaComment) {
        reportRef = comment.id;
        reporting = true;
    }
</script>

<div class="flex flex-col gap-2">
    {#if loading}
        <p class="text-sm text-muted">Carregando comentários...</p>
    {:else}
        {#if comments.length === 0}
            <p class="text-sm text-muted">Nenhum comentário ainda.</p>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each comments as comment (comment.id)}
                    <li class="flex gap-2">
                        <Avatar
                            src={comment.author?.avatar_url ?? null}
                            name={comment.author?.name ?? "?"}
                            class="size-7 shrink-0"
                            textClass="text-xs"
                        />
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-baseline gap-x-2 text-xs text-muted">
                                {#if comment.author}
                                    <AuthorLink
                                        slug={comment.author.slug}
                                        class="font-bold text-primary underline underline-offset-2"
                                    >
                                        {comment.author.name}
                                    </AuthorLink>
                                {:else}
                                    <span class="font-bold">Usuário excluído</span>
                                {/if}
                                <span>{formatDateTime(comment.created_at)}</span>
                            </div>
                            <p class="text-sm whitespace-pre-wrap text-content">{comment.body}</p>
                            <div class="flex flex-wrap gap-3 text-xs">
                                {#if canDelete(comment)}
                                    <button
                                        type="button"
                                        class="cursor-pointer text-primary underline underline-offset-2"
                                        disabled={busy}
                                        onclick={() => remove(comment)}
                                    >
                                        apagar
                                    </button>
                                {/if}
                                {#if canReport(comment)}
                                    <button
                                        type="button"
                                        class="cursor-pointer text-primary underline underline-offset-2"
                                        onclick={() => openReport(comment)}
                                    >
                                        denunciar
                                    </button>
                                {/if}
                            </div>
                        </div>
                    </li>
                {/each}
            </ul>

            {#if nextCursor}
                <button
                    type="button"
                    class="w-fit cursor-pointer text-xs text-primary underline underline-offset-2"
                    onclick={loadMore}
                >
                    ver mais comentários
                </button>
            {/if}
        {/if}

        {#if auth.user}
            <form onsubmit={submit} class="flex flex-col gap-2">
                <textarea
                    bind:value={body}
                    rows="2"
                    maxlength={MEDIA_COMMENT_MAX_LENGTH}
                    placeholder="Escreva um comentário"
                    class="w-full rounded-theme border border-line bg-canvas px-2 py-1 text-sm text-content focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                ></textarea>
                <Button
                    size="sm"
                    type="submit"
                    disabled={busy || body.trim() === "" || !auth.canWrite}
                    title={auth.canWrite ? undefined : EMAIL_GATE_HINT}
                >
                    comentar
                </Button>
            </form>
        {/if}
    {/if}
</div>

<ReportDialog
    bind:open={reporting}
    kind="media_comment"
    reference={reportRef}
    name="este comentário"
/>

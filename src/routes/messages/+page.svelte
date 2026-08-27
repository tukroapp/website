<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import { fetchConversations } from "#lib/message";
    import { pollWhileVisible } from "#lib/polling";
    import { relativeTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { ConversationSummary } from "#lib/types";

    let { data } = $props();

    let conversations = $derived(data.conversations);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    // Página 1 a cada 25s enquanto a lista está aberta: a resposta já traz o unread por conversa.
    $effect(() => pollWhileVisible(refresh, 25_000));

    /** Merge por id e reordena pela última mensagem: uma conversa antiga sobe ao receber recado. */
    function mergeFirstPage(fresh: ConversationSummary[]) {
        const byId = new Map(conversations.map((item) => [item.id, item]));
        for (const item of fresh) byId.set(item.id, item);
        conversations = [...byId.values()].sort((a, b) =>
            b.last_message_at.localeCompare(a.last_message_at),
        );
    }

    async function refresh() {
        try {
            const page = await fetchConversations();
            mergeFirstPage(page.results);
        } catch {
            // Poll de fundo: o próximo tick resolve.
        }
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchConversations(nextCursor);
            const known = new Set(conversations.map((item) => item.id));
            conversations = [
                ...conversations,
                ...page.results.filter((item) => !known.has(item.id)),
            ];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>Mensagens | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-2xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Mensagens</h1>

    {#if conversations.length === 0}
        <EmptyState>
            Nenhuma conversa ainda. Abra o perfil de alguém e toque em "enviar mensagem".
        </EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each conversations as conversation (conversation.id)}
                <li>
                    <a
                        href="/messages/{conversation.counterpart.slug}"
                        class="flex items-center gap-3 rounded-theme border border-line bg-surface p-3 hover:bg-surface-hover"
                    >
                        <Avatar
                            src={conversation.counterpart.avatar_url}
                            name={conversation.counterpart.name}
                            class="size-11 shrink-0"
                            textClass="text-sm"
                        />

                        <div class="min-w-0 flex-1">
                            <div class="flex items-baseline justify-between gap-2">
                                <span class="truncate font-medium text-content">
                                    {conversation.counterpart.name}
                                </span>
                                <span class="shrink-0 text-xs text-muted">
                                    {relativeTime(conversation.last_message_at)}
                                </span>
                            </div>
                            <p class="truncate text-sm text-muted">
                                {conversation.last_message.from_me ? "Você: " : ""}{conversation
                                    .last_message.preview}
                            </p>
                        </div>

                        {#if conversation.unread_count > 0}
                            <span
                                class="shrink-0 rounded-theme bg-accent px-1.5 py-0.5 text-xs text-on-accent"
                            >
                                {conversation.unread_count}
                            </span>
                        {/if}
                    </a>
                </li>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

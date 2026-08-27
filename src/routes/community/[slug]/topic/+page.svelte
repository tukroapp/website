<script lang="ts">
    import { page } from "$app/state";
    import Avatar from "#lib/components/Avatar.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import { loginUrl } from "#lib/redirect";
    import { auth } from "#lib/state/user.svelte";
    import { timeSince } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import { fetchCommunityTopics } from "#lib/topic";

    let { data } = $props();

    let topics = $derived(data.topics);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    const community = $derived(data.community);
    const isMember = $derived(community.my_role !== null);

    function commentsLabel(count: number): string {
        return `${count} ${count === 1 ? "comentário" : "comentários"}`;
    }

    async function loadMore() {
        loading = true;
        try {
            // Os tópicos fixados só vêm na primeira página, então o resto é só acrescentar no fim.
            const next = await fetchCommunityTopics(community.slug, nextCursor);
            topics = [...topics, ...next.results];
            nextCursor = next.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>Fórum de {community.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Fórum de {community.name}</h1>
        <a
            href="/community/{community.slug}"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para a comunidade
        </a>
    </div>

    {#if !data.visible}
        <EmptyState>Esta comunidade é privada: o fórum aparece só para quem participa.</EmptyState>
    {:else}
        {#if isMember}
            <div>
                <a
                    href="/community/{community.slug}/topic/new"
                    class="inline-flex h-8 items-center rounded-theme bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
                >
                    abrir tópico
                </a>
            </div>
        {:else}
            <div
                class="flex flex-wrap items-center justify-between gap-2 rounded-theme border border-line bg-surface p-3"
            >
                <p class="text-sm text-muted">
                    Só quem participa da comunidade abre tópicos e comenta.
                </p>
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

        {#if topics.length === 0}
            <EmptyState>{loading ? "Carregando..." : "Nenhum tópico ainda."}</EmptyState>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each topics as topic (topic.id)}
                    <li class="flex gap-3 rounded-theme border border-line bg-surface p-3">
                        <a href="/@{topic.author.slug}" class="shrink-0">
                            <Avatar
                                src={topic.author.avatar_url}
                                name={topic.author.name}
                                class="size-10"
                                textClass="text-sm"
                            />
                        </a>

                        <div class="flex min-w-0 flex-1 flex-col gap-1">
                            <div class="flex flex-wrap items-center gap-2">
                                {#if topic.is_pinned}
                                    <span
                                        class="rounded-theme bg-accent px-1.5 py-0.5 text-xs text-on-accent"
                                    >
                                        fixado
                                    </span>
                                {/if}
                                {#if topic.is_locked}
                                    <span
                                        class="rounded-theme border border-line px-1.5 py-0.5 text-xs text-muted"
                                    >
                                        trancado
                                    </span>
                                {/if}
                                <a
                                    href="/community/{community.slug}/topic/{topic.id}"
                                    class="font-bold break-words text-primary underline underline-offset-2"
                                >
                                    {topic.title}
                                </a>
                            </div>

                            <p class="text-xs text-muted">
                                por
                                <a
                                    href="/@{topic.author.slug}"
                                    class="text-primary underline underline-offset-2"
                                >
                                    {topic.author.name}
                                </a>
                                &middot; {commentsLabel(topic.comment_count)}
                                &middot; última atividade {timeSince(topic.last_activity_at)}
                            </p>
                        </div>
                    </li>
                {/each}
            </ul>

            <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
        {/if}
    {/if}
</main>

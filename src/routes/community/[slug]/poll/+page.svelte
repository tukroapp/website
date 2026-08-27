<script lang="ts">
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import { fetchCommunityPolls, pollStatusLabel, votesLabel } from "#lib/poll";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let polls = $derived(data.polls);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    const community = $derived(data.community);

    async function loadMore() {
        loading = true;
        try {
            const next = await fetchCommunityPolls(community.slug, nextCursor);
            polls = [...polls, ...next.results];
            nextCursor = next.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>Enquetes de {community.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Enquetes de {community.name}</h1>
        <a
            href="/community/{community.slug}"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para a comunidade
        </a>
    </div>

    {#if !data.visible}
        <EmptyState>
            Esta comunidade é privada: as enquetes aparecem só para quem participa.
        </EmptyState>
    {:else}
        {#if community.can_moderate}
            <div>
                <a
                    href="/community/{community.slug}/poll/new"
                    class="inline-flex h-8 items-center rounded-theme bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
                >
                    criar enquete
                </a>
            </div>
        {/if}

        {#if polls.length === 0}
            <EmptyState>{loading ? "Carregando..." : "Nenhuma enquete ainda."}</EmptyState>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each polls as poll (poll.id)}
                    <li class="flex flex-col gap-1 rounded-theme border border-line bg-surface p-3">
                        <a
                            href="/community/{community.slug}/poll/{poll.id}"
                            class="font-bold break-words text-primary underline underline-offset-2"
                        >
                            {poll.question}
                        </a>
                        <p class="text-xs text-muted">
                            por
                            <a
                                href="/@{poll.author.slug}"
                                class="text-primary underline underline-offset-2"
                            >
                                {poll.author.name}
                            </a>
                            &middot; {pollStatusLabel(poll)}
                            {#if poll.total_votes !== null}
                                &middot; {votesLabel(poll.total_votes)}
                            {/if}
                        </p>
                    </li>
                {/each}
            </ul>

            <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
        {/if}
    {/if}
</main>

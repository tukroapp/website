<script lang="ts">
    import CommunityCard from "#lib/components/CommunityCard.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import { fetchProfileCommunities } from "#lib/community";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let communities = $derived(data.communities);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    async function loadMore() {
        if (!auth.user) return;

        loading = true;
        try {
            const page = await fetchProfileCommunities(auth.user.slug, nextCursor);
            communities = [...communities, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>Minhas comunidades | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Minhas comunidades</h1>
        <div class="flex flex-wrap items-center gap-3">
            <a href="/community" class="text-sm text-primary underline underline-offset-2">
                descobrir comunidades
            </a>
            <a
                href="/community/new"
                class="inline-flex h-8 items-center rounded-theme bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
            >
                criar comunidade
            </a>
        </div>
    </div>

    {#if communities.length === 0}
        <EmptyState>Você ainda não participa de nenhuma comunidade.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each communities as community (community.id)}
                <CommunityCard {community} />
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

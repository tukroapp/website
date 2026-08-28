<script lang="ts">
    import CommunityCard from "#lib/components/CommunityCard.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import { fetchProfileCommunities } from "#lib/community";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let communities = $derived(data.communities);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    const profile = $derived(data.profile);

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchProfileCommunities(
                profile.slug,
                nextCursor,
                undefined,
                data.mutual,
            );
            communities = [...communities, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>
        {data.mutual ? "Comunidades em comum" : `Comunidades de ${profile.name}`} | Tukro
    </title>
</svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">
            {#if data.mutual}
                Comunidades em comum com {profile.name}
            {:else}
                Comunidades de {profile.name}
            {/if}
        </h1>
        <a href="/@{profile.slug}" class="text-sm text-primary underline underline-offset-2">
            voltar ao perfil
        </a>
    </div>

    {#if communities.length === 0}
        <EmptyState>
            {#if data.mutual}
                Vocês não participam das mesmas comunidades.
            {:else}
                Nenhuma comunidade por aqui.
            {/if}
        </EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each communities as community (community.id)}
                <CommunityCard {community} />
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

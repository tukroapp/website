<script lang="ts">
    import CommunityCard from "#lib/components/CommunityCard.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import Input from "#lib/components/Input.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import { COMMUNITY_SEARCH_MIN_LENGTH, searchCommunities } from "#lib/community";
    import { SEARCH_DEBOUNCE_MS } from "#lib/profile";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let communities = $derived(data.communities);
    let nextCursor = $derived(data.nextCursor);
    let query = $state("");
    let loading = $state(false);
    let timer: ReturnType<typeof setTimeout> | null = null;

    /** O termo a que os resultados atuais pertencem, para o "carregar mais" manter o mesmo q. */
    let searchedTerm = $state<string | null>(null);

    const term = $derived(query.trim());
    const tooShort = $derived(term.length > 0 && term.length < COMMUNITY_SEARCH_MIN_LENGTH);

    async function search() {
        const requested = term.length >= COMMUNITY_SEARCH_MIN_LENGTH ? term : null;
        loading = true;
        try {
            const page = await searchCommunities(requested);
            searchedTerm = requested;
            communities = page.results;
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await searchCommunities(searchedTerm, nextCursor);
            communities = [...communities, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    function onInput() {
        if (timer !== null) clearTimeout(timer);
        if (tooShort) return;
        timer = setTimeout(search, SEARCH_DEBOUNCE_MS);
    }
</script>

<svelte:head><title>Comunidades | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Comunidades</h1>
        {#if auth.user}
            <div class="flex flex-wrap items-center gap-3">
                <a href="/community/mine" class="text-sm text-primary underline underline-offset-2">
                    minhas comunidades
                </a>
                <a
                    href="/community/new"
                    class="inline-flex h-8 items-center rounded-theme bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
                >
                    criar comunidade
                </a>
            </div>
        {/if}
    </div>

    <Input
        variant="search"
        type="search"
        bind:value={query}
        oninput={onInput}
        placeholder="Buscar comunidade"
    />

    {#if tooShort}
        <p class="text-sm text-muted">
            Digite pelo menos {COMMUNITY_SEARCH_MIN_LENGTH} caracteres.
        </p>
    {:else if communities.length === 0}
        <EmptyState>
            {#if loading}Carregando...{:else}Nenhuma comunidade encontrada.{/if}
        </EmptyState>
    {:else}
        {#if searchedTerm === null}
            <h2 class="text-sm text-muted">as mais recentes</h2>
        {/if}

        <ul class="flex flex-col gap-2">
            {#each communities as community (community.id)}
                <CommunityCard {community} />
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

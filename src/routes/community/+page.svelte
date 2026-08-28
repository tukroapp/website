<script lang="ts">
    import { goto } from "$app/navigation";
    import CommunityCard from "#lib/components/CommunityCard.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import Input from "#lib/components/Input.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import {
        COMMUNITY_CATEGORIES,
        COMMUNITY_SEARCH_MIN_LENGTH,
        COMMUNITY_SORTS,
        communityCategoryLabel,
        fetchCommunities,
    } from "#lib/community";
    import { SEARCH_DEBOUNCE_MS } from "#lib/profile";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";
    import type { CommunitySummary } from "#lib/types";

    let { data } = $props();

    let communities = $state<CommunitySummary[]>([]);
    let nextCursor = $state<string | null>(null);
    let query = $state("");
    let loading = $state(false);
    let timer: ReturnType<typeof setTimeout> | null = null;

    /** O termo a que os resultados atuais pertencem, `null` no modo descoberta. */
    let searchedTerm = $state<string | null>(null);

    // O índice (categoria/ordenação) vem do `load`; ao (re)carregar, volta a valer.
    $effect(() => {
        communities = data.communities;
        nextCursor = data.nextCursor;
        searchedTerm = null;
    });

    const term = $derived(query.trim());
    const tooShort = $derived(term.length > 0 && term.length < COMMUNITY_SEARCH_MIN_LENGTH);
    const searching = $derived(searchedTerm !== null);

    /** Contagem por categoria, com zero para as que não vieram na resposta. */
    const categoryCount = $derived(
        new Map(data.categories.map((entry) => [entry.category, entry.count])),
    );

    /** Troca de categoria ou ordenação recarrega a página: o cursor guardado morre junto. */
    function discoverHref(params: { category?: string | null; sort?: string }): string {
        const category = params.category === undefined ? data.category : params.category;
        const sort = params.sort ?? data.sort;
        const search = new URLSearchParams();
        if (category) search.set("category", category);
        if (sort !== "created_at_desc") search.set("sort", sort);
        const qs = search.toString();
        return qs ? `/community?${qs}` : "/community";
    }

    async function search() {
        const requested = term.length >= COMMUNITY_SEARCH_MIN_LENGTH ? term : null;
        if (requested === null) {
            // Voltou a ficar vazio: recupera o índice do `load`.
            communities = data.communities;
            nextCursor = data.nextCursor;
            searchedTerm = null;
            return;
        }
        loading = true;
        try {
            const page = await fetchCommunities({ q: requested });
            searchedTerm = requested;
            communities = page.results;
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

    async function loadMore() {
        loading = true;
        try {
            const page = searching
                ? await fetchCommunities({ q: searchedTerm, cursor: nextCursor })
                : await fetchCommunities({
                      category: data.category,
                      sort: data.sort,
                      cursor: nextCursor,
                  });
            communities = [...communities, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
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
    {:else if searching}
        {#if communities.length === 0}
            <EmptyState>
                {loading ? "Carregando..." : "Nenhuma comunidade encontrada."}
            </EmptyState>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each communities as community (community.id)}
                    <CommunityCard {community} />
                {/each}
            </ul>
            <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
        {/if}
    {:else}
        {#if data.friendCommunities.length > 0}
            <section class="flex flex-col gap-2">
                <h2 class="text-sm font-bold text-content">Comunidades dos seus amigos</h2>
                <ul class="flex flex-col gap-2">
                    {#each data.friendCommunities as community (community.id)}
                        <CommunityCard {community} />
                    {/each}
                </ul>
            </section>
        {/if}

        <section class="flex flex-col gap-2">
            <h2 class="text-sm font-bold text-content">Categorias</h2>
            <div class="flex flex-wrap gap-1.5">
                <TabPill href={discoverHref({ category: null })} active={data.category === null}>
                    todas
                </TabPill>
                {#each COMMUNITY_CATEGORIES as item}
                    <TabPill
                        href={discoverHref({ category: item.value })}
                        active={data.category === item.value}
                    >
                        {item.label} ({categoryCount.get(item.value) ?? 0})
                    </TabPill>
                {/each}
            </div>
        </section>

        <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-bold text-content">
                {data.category ? communityCategoryLabel(data.category) : "Todas as comunidades"}
            </h2>
            <label class="flex items-center gap-1.5 text-xs text-muted">
                ordenar
                <select
                    value={data.sort}
                    onchange={(event) => goto(discoverHref({ sort: event.currentTarget.value }))}
                    class="rounded-theme border-line bg-canvas px-2 py-1 text-xs text-content focus:border-primary focus:ring-primary"
                >
                    {#each COMMUNITY_SORTS as item}
                        <option value={item.value}>{item.label}</option>
                    {/each}
                </select>
            </label>
        </div>

        {#if communities.length === 0}
            <EmptyState>Nenhuma comunidade nesta categoria ainda.</EmptyState>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each communities as community (community.id)}
                    <CommunityCard {community} />
                {/each}
            </ul>
            <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
        {/if}
    {/if}
</main>

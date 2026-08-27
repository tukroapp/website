<script lang="ts">
    import EmptyState from "#lib/components/EmptyState.svelte";
    import Input from "#lib/components/Input.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import ProfileRow from "#lib/components/ProfileRow.svelte";
    import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_LENGTH, searchProfiles } from "#lib/profile";
    import { toastApiError } from "#lib/toast";
    import type { ProfileSummary } from "#lib/types";

    let query = $state("");
    let results = $state<ProfileSummary[]>([]);
    let nextCursor = $state<string | null>(null);
    let loading = $state(false);
    let searched = $state(false);
    let timer: ReturnType<typeof setTimeout> | null = null;

    /** O termo a que os resultados atuais pertencem, para o "carregar mais" manter o mesmo q. */
    let searchedTerm = $state("");

    const term = $derived(query.trim());
    const tooShort = $derived(term.length > 0 && term.length < SEARCH_MIN_LENGTH);

    async function search() {
        if (term.length < SEARCH_MIN_LENGTH) return;

        const requested = term;
        loading = true;
        try {
            const page = await searchProfiles(requested);
            searchedTerm = requested;
            results = page.results;
            nextCursor = page.next_cursor;
            searched = true;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await searchProfiles(searchedTerm, nextCursor);
            results = [...results, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    function onInput() {
        if (timer !== null) clearTimeout(timer);

        if (term.length < SEARCH_MIN_LENGTH) {
            results = [];
            nextCursor = null;
            searched = false;
            return;
        }

        timer = setTimeout(search, SEARCH_DEBOUNCE_MS);
    }
</script>

<svelte:head><title>Buscar perfis | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Buscar perfis</h1>

    <Input
        variant="search"
        type="search"
        bind:value={query}
        oninput={onInput}
        placeholder="Nome ou apelido"
    />

    {#if tooShort}
        <p class="text-sm text-muted">Digite pelo menos {SEARCH_MIN_LENGTH} caracteres.</p>
    {:else if results.length === 0 && loading}
        <p class="text-sm text-muted">Carregando...</p>
    {:else if searched && results.length === 0}
        <EmptyState>Nenhum perfil encontrado.</EmptyState>
    {:else if results.length > 0}
        <ul class="flex flex-col gap-2">
            {#each results as profile (profile.id)}
                <ProfileRow
                    slug={profile.slug}
                    name={profile.name}
                    avatarUrl={profile.avatar_url}
                    status={profile.status}
                />
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

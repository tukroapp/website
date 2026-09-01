<script lang="ts">
    import { goto } from "$app/navigation";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import Input from "#lib/components/Input.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import ProfileRow from "#lib/components/ProfileRow.svelte";
    import Button from "#lib/components/Button.svelte";
    import { SEARCH_MIN_LENGTH, searchProfiles } from "#lib/profile";
    import { toastApiError } from "#lib/toast";
    import type { ProfileSearchResult } from "#lib/types";

    let { data } = $props();

    let results = $derived(data.results as ProfileSearchResult[]);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    // O formulário parte dos filtros da URL e é reidratado quando a navegação muda.
    let form = $state({ q: "", city: "", interest: "" });
    $effect(() => {
        form = {
            q: data.filters.q ?? "",
            city: data.filters.city ?? "",
            interest: data.filters.interest ?? "",
        };
    });

    const hasFilter = $derived(Object.values(data.filters).some((value) => value != null));

    function submit(event: SubmitEvent) {
        event.preventDefault();
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(form)) {
            if (value.trim() !== "") params.set(key, value.trim());
        }
        const query = params.toString();
        goto(query ? `/search?${query}` : "/search");
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await searchProfiles({ ...data.filters, cursor: nextCursor });
            results = [...results, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    function rowSubtitle(profile: ProfileSearchResult): string {
        const parts: string[] = [];
        if (profile.city) parts.push(profile.city);
        if (profile.age != null) parts.push(`${profile.age} anos`);
        return parts.length > 0 ? parts.join(" · ") : `@${profile.slug}`;
    }
</script>

<svelte:head><title>Buscar perfis | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Buscar perfis</h1>

    <form
        onsubmit={submit}
        class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4"
    >
        <div class="flex flex-col gap-1.5">
            <label for="q" class="text-sm font-medium text-content">Nome ou apelido</label>
            <Input id="q" type="search" bind:value={form.q} placeholder="Fulano de Tal" />
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-1.5">
                <label for="city" class="text-sm font-medium text-content">Cidade</label>
                <Input id="city" type="text" bind:value={form.city} />
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="interest" class="text-sm font-medium text-content">Interesse</label>
                <Input id="interest" type="text" bind:value={form.interest} />
            </div>
        </div>

        <div class="flex justify-end gap-2">
            {#if hasFilter}
                <Button type="button" variant="outline" onclick={() => goto("/search")}>
                    limpar
                </Button>
            {/if}
            <Button type="submit">buscar</Button>
        </div>
    </form>

    <h2 class="text-base font-bold text-content">
        {hasFilter ? "Resultados" : "Gente nova no Tukro"}
    </h2>

    {#if data.tooShort}
        <p class="text-sm text-muted">Digite pelo menos {SEARCH_MIN_LENGTH} caracteres.</p>
    {:else if results.length === 0}
        <EmptyState>Nenhum perfil encontrado.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each results as profile (profile.id)}
                <ProfileRow
                    slug={profile.slug}
                    name={profile.name}
                    avatarUrl={profile.avatar_url}
                    subtitle={rowSubtitle(profile)}
                    status={profile.status}
                />
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

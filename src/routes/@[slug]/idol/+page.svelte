<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import { fetchIdols } from "#lib/fan";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let idols = $derived(data.idols);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);

    const profile = $derived(data.profile);

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchIdols(profile.slug, nextCursor);
            idols = [...idols, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>{profile.name} é fã de | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-7xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">
            {profile.name} é fã de ({profile.idols_count})
        </h1>
        <a href="/@{profile.slug}" class="text-sm text-primary underline underline-offset-2">
            voltar ao perfil
        </a>
    </div>

    {#if idols.length === 0}
        <EmptyState>{loading ? "Carregando..." : "Não é fã de ninguém ainda."}</EmptyState>
    {:else}
        <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {#each idols as idol (idol.id)}
                <li class="rounded-theme border border-line bg-surface p-2">
                    <a href="/@{idol.slug}" class="block text-center">
                        <Avatar
                            src={idol.avatar_url}
                            name={idol.name}
                            class="aspect-square w-full"
                            textClass="text-2xl"
                        />
                        <span class="mt-1 block truncate text-sm text-content">{idol.name}</span>
                        <span class="block truncate text-xs text-muted">@{idol.slug}</span>
                    </a>
                </li>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import Input from "#lib/components/Input.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import { fetchProfileFriends } from "#lib/friend";
    import { SEARCH_DEBOUNCE_MS } from "#lib/profile";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let friends = $derived(data.friends);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);
    let query = $state("");
    let timer: ReturnType<typeof setTimeout> | null = null;

    /** O termo a que os resultados atuais pertencem, para o "carregar mais" manter o mesmo q. */
    let searchedTerm = $state("");

    const profile = $derived(data.profile);

    async function filter() {
        const requested = query.trim();
        loading = true;
        try {
            const page = await fetchProfileFriends(profile.slug, requested);
            searchedTerm = requested;
            friends = page.results;
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    function onInput() {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(filter, SEARCH_DEBOUNCE_MS);
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchProfileFriends(profile.slug, searchedTerm, nextCursor);
            friends = [...friends, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head><title>Amigos de {profile.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-7xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">
            Amigos de {profile.name}
            {#if profile.friends_count !== null}({profile.friends_count}){/if}
        </h1>
        <a href="/@{profile.slug}" class="text-sm text-primary underline underline-offset-2">
            voltar ao perfil
        </a>
    </div>

    {#if data.isPrivate}
        <EmptyState>Este perfil mantém a lista de amigos privada.</EmptyState>
    {:else}
        <Input
            variant="search"
            type="search"
            bind:value={query}
            oninput={onInput}
            placeholder="Filtrar por nome ou apelido"
        />

        {#if friends.length === 0}
            <EmptyState>
                {#if loading}
                    Carregando...
                {:else if searchedTerm}
                    Nenhum amigo encontrado para "{searchedTerm}".
                {:else}
                    Ninguém por aqui ainda.
                {/if}
            </EmptyState>
        {:else}
            <ul class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {#each friends as friend (friend.id)}
                    <li class="rounded-theme border border-line bg-surface p-2">
                        <a href="/@{friend.slug}" class="block text-center">
                            <Avatar
                                src={friend.avatar_url}
                                name={friend.name}
                                class="aspect-square w-full"
                                textClass="text-2xl"
                            />
                            <span class="mt-1 block truncate text-sm text-content">
                                {friend.name}
                            </span>
                            <span class="block truncate text-xs text-muted">@{friend.slug}</span>
                        </a>
                    </li>
                {/each}
            </ul>

            <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
        {/if}
    {/if}
</main>

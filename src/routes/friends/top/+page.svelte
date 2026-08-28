<script lang="ts">
    import { goto } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import AuthorLink from "#lib/components/AuthorLink.svelte";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import Input from "#lib/components/Input.svelte";
    import { ApiError } from "#lib/error";
    import { TOP_FRIENDS_MAX, fetchProfileFriends, setTopFriends } from "#lib/friend";
    import { SEARCH_DEBOUNCE_MS } from "#lib/profile";
    import { toastApiError } from "#lib/toast";
    import type { ProfileSummary } from "#lib/types";

    let { data } = $props();

    /** A seleção em edição. A ordem do array é a ordem que vai para o backend. */
    let selected = $state<ProfileSummary[]>([]);
    /** Os amigos que a busca oferece para destacar. */
    let pool = $state<ProfileSummary[]>([]);
    let query = $state("");
    let searching = $state(false);
    let saving = $state(false);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let dragFrom = $state<number | null>(null);

    // Semeia os buffers de edição a cada carga da página.
    $effect(() => {
        selected = [...data.topFriends];
        pool = data.friends;
    });

    const selectedSlugs = $derived(new Set(selected.map((friend) => friend.slug)));
    const available = $derived(pool.filter((friend) => !selectedSlugs.has(friend.slug)));
    const full = $derived(selected.length >= TOP_FRIENDS_MAX);
    const changed = $derived(
        selected.length !== data.topFriends.length ||
            selected.some((friend, index) => friend.slug !== data.topFriends[index]?.slug),
    );

    function add(friend: ProfileSummary) {
        if (full || selectedSlugs.has(friend.slug)) return;
        selected = [...selected, friend];
    }

    function remove(slug: string) {
        selected = selected.filter((friend) => friend.slug !== slug);
    }

    function move(index: number, delta: number) {
        const target = index + delta;
        if (target < 0 || target >= selected.length) return;
        const next = [...selected];
        [next[index], next[target]] = [next[target], next[index]];
        selected = next;
    }

    function onDrop(index: number) {
        if (dragFrom === null || dragFrom === index) {
            dragFrom = null;
            return;
        }
        const next = [...selected];
        const [moved] = next.splice(dragFrom, 1);
        next.splice(index, 0, moved);
        selected = next;
        dragFrom = null;
    }

    async function search() {
        const term = query.trim();
        searching = true;
        try {
            const page = await fetchProfileFriends(data.mySlug, term || null);
            pool = page.results;
        } catch (error) {
            toastApiError(error);
        } finally {
            searching = false;
        }
    }

    function onQueryInput() {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(search, SEARCH_DEBOUNCE_MS);
    }

    async function save() {
        saving = true;
        try {
            await setTopFriends(selected.map((friend) => friend.slug));
            toast.success("Destaque salvo");
            await goto(`/@${data.mySlug}`);
        } catch (error) {
            if (error instanceof ApiError) {
                const first = error.errorsAt("slugs").at(0);
                if (first?.code === "not_a_friend") {
                    const slug = first.params?.slug;
                    toast.error(
                        slug
                            ? `@${slug} não está mais na sua lista de amigos.`
                            : "Alguém da seleção não é mais seu amigo.",
                    );
                    return;
                }
                if (first?.code === "duplicated") {
                    toast.error("Tem alguém repetido na seleção.");
                    return;
                }
            }
            toastApiError(error);
        } finally {
            saving = false;
        }
    }
</script>

<svelte:head><title>Amigos em destaque | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-2xl flex-col gap-4 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">Amigos em destaque</h1>
        <a href="/@{data.mySlug}" class="text-sm text-primary underline underline-offset-2">
            voltar ao perfil
        </a>
    </div>

    <p class="text-sm text-muted">
        Escolha até {TOP_FRIENDS_MAX} amigos para a vitrine do seu perfil e arraste para ordenar. Sem
        nenhum destaque, o perfil mostra a lista de amigos de sempre.
    </p>

    <section class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
        <h2 class="border-b border-line pb-1 text-sm font-bold text-content">
            Selecionados ({selected.length}/{TOP_FRIENDS_MAX})
        </h2>

        {#if selected.length === 0}
            <p class="text-sm text-muted">Nenhum amigo em destaque ainda.</p>
        {:else}
            <ul class="flex flex-col gap-1">
                {#each selected as friend, index (friend.slug)}
                    <li
                        draggable="true"
                        ondragstart={() => (dragFrom = index)}
                        ondragover={(event) => event.preventDefault()}
                        ondrop={() => onDrop(index)}
                        ondragend={() => (dragFrom = null)}
                        class="flex items-center gap-2 rounded-theme border border-line bg-canvas p-1.5
                            {dragFrom === index ? 'opacity-50' : ''}"
                    >
                        <span class="cursor-grab px-1 text-muted select-none" aria-hidden="true">
                            ⠿
                        </span>
                        <span class="w-5 shrink-0 text-center text-xs text-muted">{index + 1}</span>
                        <Avatar
                            src={friend.avatar_url}
                            name={friend.name}
                            class="size-8 shrink-0"
                            textClass="text-xs"
                        />
                        <span class="min-w-0 flex-1 truncate text-sm text-content">
                            {friend.name}
                        </span>
                        <div class="flex shrink-0 items-center gap-1">
                            <button
                                type="button"
                                class="cursor-pointer px-1 text-muted disabled:opacity-30"
                                disabled={index === 0}
                                aria-label="Mover para cima"
                                onclick={() => move(index, -1)}
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                class="cursor-pointer px-1 text-muted disabled:opacity-30"
                                disabled={index === selected.length - 1}
                                aria-label="Mover para baixo"
                                onclick={() => move(index, 1)}
                            >
                                ↓
                            </button>
                            <button
                                type="button"
                                class="cursor-pointer px-1 text-xs text-primary underline underline-offset-2"
                                onclick={() => remove(friend.slug)}
                            >
                                tirar
                            </button>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}

        <div class="flex justify-end pt-1">
            <Button disabled={saving || !changed} onclick={save}>
                {saving ? "salvando..." : "salvar destaque"}
            </Button>
        </div>
    </section>

    <section class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
        <h2 class="border-b border-line pb-1 text-sm font-bold text-content">Seus amigos</h2>

        <Input
            variant="search"
            type="search"
            bind:value={query}
            oninput={onQueryInput}
            placeholder="Filtrar por nome ou apelido"
        />

        {#if full}
            <p class="text-xs text-muted">
                Você já tem {TOP_FRIENDS_MAX} em destaque. Tire alguém para trocar.
            </p>
        {:else if data.hasMoreFriends}
            <p class="text-xs text-muted">
                Mostrando os primeiros amigos. Use a busca para achar os outros.
            </p>
        {/if}

        {#if available.length === 0}
            <EmptyState>
                {searching
                    ? "Carregando..."
                    : query.trim()
                      ? "Nenhum amigo encontrado."
                      : "Todos os seus amigos já estão em destaque."}
            </EmptyState>
        {:else}
            <ul class="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {#each available as friend (friend.slug)}
                    <li class="flex items-center gap-2 rounded-theme border border-line p-1.5">
                        <Avatar
                            src={friend.avatar_url}
                            name={friend.name}
                            class="size-8 shrink-0"
                            textClass="text-xs"
                        />
                        <div class="min-w-0 flex-1">
                            <AuthorLink
                                slug={friend.slug}
                                class="block truncate text-sm text-primary underline underline-offset-2"
                            >
                                {friend.name}
                            </AuthorLink>
                            <span class="block truncate text-xs text-muted">@{friend.slug}</span>
                        </div>
                        <button
                            type="button"
                            class="shrink-0 cursor-pointer px-1 text-xs text-primary underline underline-offset-2 disabled:opacity-40"
                            disabled={full}
                            onclick={() => add(friend)}
                        >
                            destacar
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>
</main>

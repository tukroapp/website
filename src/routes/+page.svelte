<script lang="ts">
    import { onMount } from "svelte";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import Card from "#lib/components/Card.svelte";
    import FeedRow from "#lib/components/FeedRow.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import ProfileRow from "#lib/components/ProfileRow.svelte";
    import RichText from "#lib/components/RichText.svelte";
    import { ApiError } from "#lib/error";
    import { fetchFeed, groupFeed, markFeedSeen } from "#lib/feed";
    import { acceptFriendRequest, rejectFriendRequest } from "#lib/friend";
    import { auth } from "#lib/state/user.svelte";
    import { relativeTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { FriendRequestItem } from "#lib/types";

    let { data } = $props();

    let requests = $derived(data.requests);
    let busyId = $state<string | null>(null);

    let feed = $derived(data.feed);
    let feedCursor = $derived(data.feedCursor);
    let loadingFeed = $state(false);
    let loadingNew = $state(false);

    const feedGroups = $derived(groupFeed(feed));
    const unseen = $derived(auth.feedUnseen);

    const profile = $derived(data.profile);
    const firstName = $derived(profile.name.split(" ")[0]);
    const hasPending = $derived(requests.length > 0 || data.testimonials.length > 0);

    // O backend já devolve a lista ordenada do dia 1 ao 31; aqui só sobem os de hoje.
    const birthdays = $derived([
        ...data.birthdays.birthdays.filter((entry) => entry.is_today),
        ...data.birthdays.birthdays.filter((entry) => !entry.is_today),
    ]);

    onMount(() => {
        // Abrir o feed zera o contador na hora e no servidor.
        auth.setFeedUnseen(0);
        markFeedSeen().catch(() => {});
    });

    async function loadNewFeed() {
        loadingNew = true;
        try {
            const page = await fetchFeed();
            const known = new Set(feed.map((item) => item.id));
            feed = [...page.results.filter((item) => !known.has(item.id)), ...feed];
            await markFeedSeen();
            auth.setFeedUnseen(0);
        } catch (error) {
            toastApiError(error);
        } finally {
            loadingNew = false;
        }
    }

    async function loadMoreFeed() {
        loadingFeed = true;
        try {
            const page = await fetchFeed(feedCursor);
            const known = new Set(feed.map((item) => item.id));
            feed = [...feed, ...page.results.filter((item) => !known.has(item.id))];
            feedCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loadingFeed = false;
        }
    }

    const sections = $derived([
        { label: "recados", href: `/@${profile.slug}/scraps`, count: profile.scraps_count },
        { label: "fotos", href: `/@${profile.slug}/album?kind=photo`, count: null },
        { label: "vídeos", href: `/@${profile.slug}/album?kind=video`, count: null },
        {
            label: "depoimentos",
            href: `/@${profile.slug}/testimonials`,
            count: profile.testimonials_count,
        },
        { label: "amigos", href: `/@${profile.slug}/friends`, count: profile.friends_count },
        { label: "comunidades", href: "/community/mine", count: null },
    ]);

    async function respond(request: FriendRequestItem, accept: boolean) {
        busyId = request.id;
        try {
            if (accept) {
                await acceptFriendRequest(request.id);
                toast.success("Agora vocês são amigos");
            } else {
                await rejectFriendRequest(request.id);
                toast.success("Pedido recusado");
            }
            requests = requests.filter((item) => item.id !== request.id);
        } catch (error) {
            // Um 404 significa que o pedido sumiu, então tirar da lista é o certo.
            if (error instanceof ApiError && error.status === 404) {
                toast.info("Esse pedido não está mais pendente");
                requests = requests.filter((item) => item.id !== request.id);
            } else {
                toastApiError(error);
            }
        } finally {
            busyId = null;
        }
    }
</script>

<svelte:head><title>Tukro</title></svelte:head>

<main
    class="mx-auto grid w-full max-w-7xl gap-4 p-3 lg:grid-cols-[13rem_minmax(0,1fr)_15rem] lg:items-start"
>
    <aside class="flex flex-col gap-3">
        <div class="rounded-theme border border-line bg-surface p-3 text-center lg:text-start">
            <a href="/@{profile.slug}" class="mx-auto block w-40 sm:w-48 lg:w-full">
                <Avatar
                    src={profile.avatar_url}
                    name={profile.name}
                    class="aspect-square w-full"
                    textClass="text-5xl"
                />
            </a>

            <h1 class="mt-2 text-base font-bold text-content">{profile.name}</h1>
            <p class="text-xs text-muted">@{profile.slug}</p>
            {#if profile.status}
                <p class="mt-1 text-xs text-accent">{profile.status}</p>
            {/if}

            <div class="mt-3 flex flex-col gap-1 text-sm text-primary">
                <a href="/@{profile.slug}" class="underline underline-offset-2 lg:text-start">
                    meu perfil
                </a>
                <a href="/settings" class="underline underline-offset-2 lg:text-start">
                    editar perfil
                </a>
                <a href="/visitors" class="underline underline-offset-2 lg:text-start">
                    quem me visitou
                </a>
            </div>
        </div>

        <nav class="rounded-theme border border-line bg-surface">
            <ul class="flex flex-col text-sm">
                {#each sections as section}
                    <li
                        class="flex items-center justify-between border-b border-line px-3 py-1.5 last:border-b-0"
                    >
                        <a href={section.href} class="text-primary underline underline-offset-2">
                            {section.label}
                        </a>
                        {#if section.count !== null}
                            <span class="text-xs text-muted">{section.count}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        </nav>
    </aside>

    <section class="flex flex-col gap-3">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
            <h2 class="text-2xl font-bold text-content">Olá, {firstName}</h2>
            <a href="/search" class="text-sm text-primary underline underline-offset-2">
                procurar gente
            </a>
        </div>

        {#if hasPending}
            <h3 class="text-base font-bold text-content">Esperando você</h3>

            <ul class="flex flex-col gap-2">
                {#each requests as request (request.id)}
                    <ProfileRow
                        slug={request.slug}
                        name={request.name}
                        avatarUrl={request.avatar_url}
                        subtitle="quer ser seu amigo, {relativeTime(request.created_at)}"
                    >
                        {#snippet actions()}
                            <Button
                                size="sm"
                                disabled={busyId === request.id}
                                onclick={() => respond(request, true)}
                            >
                                aceitar
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === request.id}
                                onclick={() => respond(request, false)}
                            >
                                recusar
                            </Button>
                        {/snippet}
                    </ProfileRow>
                {/each}

                {#each data.testimonials as testimonial (testimonial.id)}
                    <ProfileRow
                        slug={testimonial.profile.slug}
                        name={testimonial.profile.name}
                        avatarUrl={testimonial.profile.avatar_url}
                        subtitle="escreveu um depoimento, {relativeTime(testimonial.created_at)}"
                    >
                        {#snippet actions()}
                            <a
                                href="/testimonials"
                                class="text-xs text-primary underline underline-offset-2"
                            >
                                ler e responder
                            </a>
                        {/snippet}
                    </ProfileRow>
                {/each}
            </ul>

            {#if data.moreRequests || data.moreTestimonials}
                <div class="flex flex-wrap gap-3 text-xs text-primary">
                    {#if data.moreRequests}
                        <a href="/friends/requests" class="underline underline-offset-2">
                            ver todos os pedidos de amizade
                        </a>
                    {/if}
                    {#if data.moreTestimonials}
                        <a href="/testimonials" class="underline underline-offset-2">
                            ver todos os depoimentos pendentes
                        </a>
                    {/if}
                </div>
            {/if}
        {/if}

        <section class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4">
            <h2 class="border-b border-line pb-1 text-base font-bold text-content">Novidades</h2>

            {#if unseen > 0}
                <button
                    type="button"
                    onclick={loadNewFeed}
                    disabled={loadingNew}
                    class="w-fit cursor-pointer rounded-theme bg-primary px-3 py-1.5 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-50"
                >
                    {#if loadingNew}
                        carregando...
                    {:else}
                        {unseen}
                        {unseen === 1 ? "atualização nova" : "atualizações novas"}
                    {/if}
                </button>
            {/if}

            {#if feedGroups.length === 0}
                <p class="text-sm text-muted">
                    Quando seus amigos e ídolos fizerem algo, aparece aqui.
                </p>
            {:else}
                <ul class="flex flex-col">
                    {#each feedGroups as group (group.id)}
                        <li
                            class="flex items-start gap-3 border-b border-line py-2 last:border-b-0"
                        >
                            <FeedRow {group} />
                        </li>
                    {/each}
                </ul>

                <LoadMore cursor={feedCursor} loading={loadingFeed} onclick={loadMoreFeed} />
            {/if}
        </section>

        <Card title="Recados no seu mural" linkHref="/@{profile.slug}/scraps" linkLabel="ver todos">
            {#if data.scraps.length === 0}
                <p class="text-sm text-muted">Seu mural está vazio.</p>
            {:else}
                <ul class="flex flex-col gap-3">
                    {#each data.scraps as scrap (scrap.id)}
                        <li class="flex gap-3">
                            <a href="/@{scrap.author.slug}" class="shrink-0">
                                <Avatar
                                    src={scrap.author.avatar_url}
                                    name={scrap.author.name}
                                    class="size-10"
                                    textClass="text-sm"
                                />
                            </a>

                            <div class="min-w-0">
                                <a
                                    href="/@{scrap.author.slug}"
                                    class="text-sm font-bold text-primary underline underline-offset-2"
                                >
                                    {scrap.author.name}
                                </a>
                                <span class="ms-1 text-xs text-muted">
                                    {relativeTime(scrap.created_at)}
                                </span>
                                <RichText
                                    value={scrap.body}
                                    class="line-clamp-3 text-sm text-content"
                                />
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </Card>
    </section>

    <aside class="flex flex-col gap-3">
        {#if birthdays.length > 0}
            <Card title="aniversariantes do mês" compact>
                <ul class="flex flex-col gap-2">
                    {#each birthdays as entry (entry.profile.id)}
                        <li class="flex items-center gap-2">
                            <a href="/@{entry.profile.slug}" class="shrink-0">
                                <Avatar
                                    src={entry.profile.avatar_url}
                                    name={entry.profile.name}
                                    class="size-8"
                                    textClass="text-xs"
                                />
                            </a>
                            <div class="min-w-0">
                                <a
                                    href="/@{entry.profile.slug}"
                                    class="block truncate text-sm text-primary underline underline-offset-2"
                                >
                                    {entry.profile.name}
                                </a>
                                <span
                                    class="block text-xs {entry.is_today
                                        ? 'font-bold text-accent'
                                        : 'text-muted'}"
                                >
                                    {entry.is_today ? "hoje" : `dia ${entry.day}`} · {entry.age} anos
                                </span>
                            </div>
                        </li>
                    {/each}
                </ul>
            </Card>
        {/if}

        <Card
            title="amigos ({profile.friends_count ?? 0})"
            linkHref="/@{profile.slug}/friends"
            linkLabel="ver todos"
            compact
        >
            {#if profile.friends.length === 0}
                <p class="text-sm text-muted">
                    Você ainda não tem amigos.
                    <a href="/search" class="text-primary underline underline-offset-2">
                        Procure alguém.
                    </a>
                </p>
            {:else}
                <ul class="grid grid-cols-3 gap-2">
                    {#each profile.friends as friend (friend.id)}
                        <li>
                            <a href="/@{friend.slug}" class="block text-center">
                                <Avatar
                                    src={friend.avatar_url}
                                    name={friend.name}
                                    class="aspect-square w-full"
                                />
                                <span class="mt-1 block truncate text-xs text-content">
                                    {friend.name}
                                </span>
                            </a>
                        </li>
                    {/each}
                </ul>
            {/if}
        </Card>

        <Card title="comunidades" linkHref="/community/mine" linkLabel="ver todas" compact>
            {#if data.communities.length === 0}
                <p class="text-sm text-muted">
                    Você ainda não entrou em nenhuma.
                    <a href="/community" class="text-primary underline underline-offset-2">
                        Descubra comunidades.
                    </a>
                </p>
            {:else}
                <ul class="grid grid-cols-3 gap-2">
                    {#each data.communities as community (community.id)}
                        <li>
                            <a href="/community/{community.slug}" class="block text-center">
                                <Avatar
                                    src={community.avatar_url}
                                    name={community.name}
                                    class="aspect-square w-full"
                                />
                                <span class="mt-1 block truncate text-xs text-content">
                                    {community.name}
                                </span>
                            </a>
                        </li>
                    {/each}
                </ul>
            {/if}
        </Card>
    </aside>
</main>

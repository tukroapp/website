<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import {
        cancelJoinRequest,
        communityRoleLabel,
        joinCommunity,
        leaveCommunity,
        membersLabel,
    } from "#lib/community";
    import { ApiError } from "#lib/error";
    import { pollStatusLabel, votesLabel } from "#lib/poll";
    import { loginUrl } from "#lib/redirect";
    import { auth } from "#lib/state/user.svelte";
    import { formatDate, timeSince } from "#lib/time";
    import { toastApiError } from "#lib/toast";

    let { data } = $props();

    let busy = $state(false);
    let confirmingLeave = $state(false);
    /** O dono precisa transferir a comunidade antes de sair, e a API avisa isso num 409. */
    let mustTransfer = $state(false);

    const community = $derived(data.community);

    // Depende do slug de propósito: trocar de comunidade fecha os avisos da anterior.
    $effect(() => {
        community.slug;
        confirmingLeave = false;
        mustTransfer = false;
    });

    const membersHref = $derived(`/community/${community.slug}/member`);
    const forumHref = $derived(`/community/${community.slug}/topic`);
    const pollHref = $derived(`/community/${community.slug}/poll`);
    const isMember = $derived(community.my_role !== null);
    const pendingCount = $derived(community.pending_requests_count ?? 0);

    const sections = $derived([
        { label: "comunidade", href: null, count: undefined, current: true },
        { label: "fórum", href: forumHref, count: undefined, current: false },
        { label: "enquetes", href: pollHref, count: undefined, current: false },
        {
            label: "membros",
            href: community.members_visible ? membersHref : null,
            count: community.members_count,
            current: false,
        },
    ]);

    function commentsLabel(count: number): string {
        return `${count} ${count === 1 ? "comentário" : "comentários"}`;
    }

    function memberCode(error: unknown): string | null {
        return error instanceof ApiError ? (error.errorsAt("member").at(0)?.code ?? null) : null;
    }

    async function join() {
        busy = true;
        try {
            const result = await joinCommunity(community.slug);
            if (result.status === "joined") {
                toast.success("Agora você participa da comunidade");
            } else {
                toast.success("Pedido enviado, agora é esperar a aprovação");
            }
            await refreshAll();
        } catch (error) {
            const code = memberCode(error);
            // Já era membro ou já tinha pedido: os dois casos só querem a tela atualizada.
            if (code === "already_member" || code === "request_pending") {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    async function cancelRequest() {
        busy = true;
        try {
            await cancelJoinRequest(community.slug);
            toast.success("Pedido cancelado");
            await refreshAll();
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
        }
    }

    async function confirmLeave() {
        busy = true;
        try {
            await leaveCommunity(community.slug);
            toast.success("Você saiu da comunidade");
            await refreshAll();
        } catch (error) {
            const code = memberCode(error);
            if (code === "owner_cannot_leave") {
                mustTransfer = true;
            } else if (code === "not_a_member") {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
            confirmingLeave = false;
        }
    }
</script>

<svelte:head><title>{community.name} | Tukro</title></svelte:head>

{#snippet primaryAction()}
    {#if !auth.user}
        <a
            href={loginUrl(page.url.pathname)}
            class="text-sm text-primary underline underline-offset-2"
        >
            entre para participar
        </a>
    {:else if community.my_role}
        <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onclick={() => (confirmingLeave = true)}
        >
            sair da comunidade
        </Button>
    {:else if community.has_pending_request}
        <Button size="sm" variant="outline" disabled={busy} onclick={cancelRequest}>
            pedido enviado, cancelar
        </Button>
    {:else if community.can_join}
        <Button size="sm" disabled={busy} onclick={join}>
            {community.is_private ? "pedir para entrar" : "participar da comunidade"}
        </Button>
    {/if}
{/snippet}

<main
    class="mx-auto grid w-full max-w-7xl gap-4 p-3 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start"
>
    <aside class="flex flex-col gap-3">
        <div class="rounded-theme border border-line bg-surface p-3 text-center lg:text-start">
            <div class="mx-auto w-40 sm:w-48 lg:w-full">
                <Avatar
                    src={community.avatar_url}
                    name={community.name}
                    class="aspect-square w-full"
                    textClass="text-5xl"
                />
            </div>

            <h1 class="mt-2 text-base font-bold text-content">{community.name}</h1>
            <p class="text-xs text-muted italic">{membersLabel(community.members_count)}</p>
            {#if community.my_role}
                <p class="text-xs text-muted">
                    você participa como {communityRoleLabel(community.my_role)}
                </p>
            {/if}
        </div>

        <nav class="rounded-theme border border-line bg-surface">
            <ul class="flex flex-col text-sm">
                {#each sections as section}
                    <li
                        class="flex items-center justify-between border-b border-line px-3 py-1.5 last:border-b-0"
                    >
                        {#if section.current}
                            <span class="font-bold text-content">{section.label}</span>
                        {:else if section.href}
                            <a
                                href={section.href}
                                class="text-primary underline underline-offset-2"
                            >
                                {section.label}
                            </a>
                        {:else}
                            <span class="text-muted">{section.label}</span>
                        {/if}
                        {#if section.count != null}
                            <span class="text-xs text-muted">{section.count}</span>
                        {/if}
                    </li>
                {/each}
            </ul>
        </nav>

        {#if community.can_moderate}
            <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-3">
                <h2 class="border-b border-line pb-1 text-sm font-bold text-content">Ações</h2>

                <ul class="flex flex-col gap-1 text-sm text-primary">
                    <li>
                        <a
                            href="/community/{community.slug}/join-request"
                            class="underline underline-offset-2"
                        >
                            pedidos de entrada
                        </a>
                        {#if pendingCount > 0}
                            <span
                                class="ms-1 rounded-theme bg-accent px-1.5 py-0.5 text-xs text-on-accent"
                            >
                                {pendingCount}
                            </span>
                        {/if}
                    </li>
                    <li>
                        <a href={membersHref} class="underline underline-offset-2">
                            gerenciar membros
                        </a>
                    </li>
                    {#if community.can_edit}
                        <li>
                            <a
                                href="/community/{community.slug}/edit"
                                class="underline underline-offset-2"
                            >
                                editar comunidade
                            </a>
                        </li>
                    {/if}
                </ul>
            </div>
        {/if}
    </aside>

    <section class="flex flex-col gap-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-xl font-bold text-content">{community.name}</h2>
                {#if community.is_private}
                    <span
                        class="rounded-theme border border-line bg-surface px-2 py-0.5 text-xs text-muted"
                    >
                        privada
                    </span>
                {/if}
            </div>

            {@render primaryAction()}
        </div>

        {#if mustTransfer}
            <p class="rounded-theme border border-line bg-surface p-3 text-sm text-muted">
                Como dono, você precisa transferir a comunidade antes de sair.
                <a href={membersHref} class="text-primary underline underline-offset-2">
                    escolher novo dono
                </a>
            </p>
        {/if}

        {#if community.has_pending_request}
            <p class="rounded-theme border border-line bg-surface p-3 text-sm text-muted">
                Seu pedido está aguardando a resposta de um moderador.
            </p>
        {/if}

        <dl
            class="grid gap-x-6 gap-y-1 rounded-theme border border-line bg-surface p-4 text-sm sm:grid-cols-2"
        >
            <div>
                <dt class="inline font-bold text-content">tipo:</dt>
                <dd class="inline text-content">
                    {community.is_private ? "privada" : "pública"}
                </dd>
            </div>
            <div>
                <dt class="inline font-bold text-content">criada em:</dt>
                <dd class="inline text-content">
                    {formatDate(community.created_at)} ({timeSince(community.created_at)})
                </dd>
            </div>
            <div>
                <dt class="inline font-bold text-content">membros:</dt>
                <dd class="inline text-content">{community.members_count}</dd>
            </div>
            {#if data.owner}
                <div class="min-w-0">
                    <dt class="inline font-bold text-content">proprietário:</dt>
                    <dd class="inline">
                        <a
                            href="/@{data.owner.profile.slug}"
                            class="text-primary underline underline-offset-2"
                        >
                            {data.owner.profile.name}
                        </a>
                    </dd>
                </div>
            {/if}
            {#if data.moderators.length > 0}
                <div class="min-w-0 sm:col-span-2">
                    <dt class="inline font-bold text-content">moderadores:</dt>
                    <dd class="inline">
                        {#each data.moderators as moderator, index (moderator.profile.id)}
                            <a
                                href="/@{moderator.profile.slug}"
                                class="text-primary underline underline-offset-2"
                            >
                                {moderator.profile.name}
                            </a>{index < data.moderators.length - 1 ? ", " : ""}
                        {/each}
                    </dd>
                </div>
            {/if}
        </dl>

        <div class="rounded-theme border border-line bg-surface p-4">
            {#if community.description}
                <p class="text-sm break-words whitespace-pre-wrap text-content">
                    {community.description}
                </p>
            {:else}
                <p class="text-sm text-muted">Esta comunidade ainda não tem descrição.</p>
            {/if}
        </div>

        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4">
            <div class="flex items-center justify-between border-b border-line pb-1">
                <h2 class="text-base font-bold text-content">Fórum</h2>
                {#if isMember}
                    <a
                        href="{forumHref}/new"
                        class="inline-flex h-7 items-center rounded-theme bg-primary px-2.5 text-xs font-medium text-on-primary hover:bg-primary-hover"
                    >
                        criar tópico
                    </a>
                {/if}
            </div>

            {#if !data.forumVisible}
                <p class="text-sm text-muted">
                    Esta comunidade é privada: o fórum aparece só para quem participa.
                </p>
            {:else if data.topics.length === 0}
                <p class="text-sm text-muted">Nenhum tópico ainda.</p>
            {:else}
                <ul class="flex flex-col">
                    {#each data.topics as topic (topic.id)}
                        <li class="flex gap-2 border-b border-line py-2 last:border-b-0 last:pb-0">
                            <a href="/@{topic.author.slug}" class="shrink-0">
                                <Avatar
                                    src={topic.author.avatar_url}
                                    name={topic.author.name}
                                    class="size-8"
                                    textClass="text-xs"
                                />
                            </a>

                            <div class="flex min-w-0 flex-1 flex-col">
                                <div class="flex flex-wrap items-center gap-2">
                                    {#if topic.is_pinned}
                                        <span
                                            class="rounded-theme bg-accent px-1.5 py-0.5 text-xs text-on-accent"
                                        >
                                            fixado
                                        </span>
                                    {/if}
                                    {#if topic.is_locked}
                                        <span
                                            class="rounded-theme border border-line px-1.5 py-0.5 text-xs text-muted"
                                        >
                                            trancado
                                        </span>
                                    {/if}
                                    <a
                                        href="{forumHref}/{topic.id}"
                                        class="text-sm font-bold break-words text-primary underline underline-offset-2"
                                    >
                                        {topic.title}
                                    </a>
                                </div>

                                <p class="text-xs text-muted">
                                    {commentsLabel(topic.comment_count)} &middot; última atividade
                                    {timeSince(topic.last_activity_at)}
                                </p>
                            </div>
                        </li>
                    {/each}
                </ul>

                <a href={forumHref} class="text-xs text-primary underline underline-offset-2">
                    ver todos os tópicos
                </a>
            {/if}
        </div>

        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4">
            <div class="flex items-center justify-between border-b border-line pb-1">
                <h2 class="text-base font-bold text-content">Enquetes</h2>
                {#if community.can_moderate}
                    <a
                        href="{pollHref}/new"
                        class="inline-flex h-7 items-center rounded-theme bg-primary px-2.5 text-xs font-medium text-on-primary hover:bg-primary-hover"
                    >
                        criar enquete
                    </a>
                {/if}
            </div>

            {#if !data.pollsVisible}
                <p class="text-sm text-muted">
                    Esta comunidade é privada: as enquetes aparecem só para quem participa.
                </p>
            {:else if data.polls.length === 0}
                <p class="text-sm text-muted">Nenhuma enquete ainda.</p>
            {:else}
                <ul class="flex flex-col">
                    {#each data.polls as poll (poll.id)}
                        <li
                            class="flex flex-col border-b border-line py-2 last:border-b-0 last:pb-0"
                        >
                            <a
                                href="{pollHref}/{poll.id}"
                                class="text-sm font-bold break-words text-primary underline underline-offset-2"
                            >
                                {poll.question}
                            </a>
                            <p class="text-xs text-muted">
                                {pollStatusLabel(poll)}
                                {#if poll.total_votes !== null}
                                    &middot; {votesLabel(poll.total_votes)}
                                {/if}
                            </p>
                        </li>
                    {/each}
                </ul>

                <a href={pollHref} class="text-xs text-primary underline underline-offset-2">
                    ver todas as enquetes
                </a>
            {/if}
        </div>

        <div class="flex flex-col gap-2 rounded-theme border border-line bg-surface p-4">
            <div class="flex items-center justify-between border-b border-line pb-1">
                <h2 class="text-base font-bold text-content">
                    Membros ({community.members_count})
                </h2>
                {#if community.members_visible}
                    <a href={membersHref} class="text-xs text-primary underline underline-offset-2">
                        ver todos
                    </a>
                {/if}
            </div>

            {#if !community.members_visible}
                <p class="text-sm text-muted">
                    Esta comunidade é privada: a lista de membros aparece só para quem participa.
                </p>
            {:else if community.members.length === 0}
                <p class="text-sm text-muted">Ninguém por aqui ainda.</p>
            {:else}
                <ul class="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
                    {#each community.members as member (member.profile.id)}
                        <li>
                            <a href="/@{member.profile.slug}" class="block text-center">
                                <Avatar
                                    src={member.profile.avatar_url}
                                    name={member.profile.name}
                                    class="aspect-square w-full"
                                />
                                <span class="mt-1 block truncate text-xs text-content">
                                    {member.profile.name}
                                </span>
                                {#if member.role !== "member"}
                                    <span class="block truncate text-xs text-muted">
                                        {communityRoleLabel(member.role)}
                                    </span>
                                {/if}
                            </a>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </section>
</main>

{#if confirmingLeave}
    <ConfirmDialog
        title="Sair da comunidade"
        confirmLabel="sair"
        {busy}
        onconfirm={confirmLeave}
        oncancel={() => (confirmingLeave = false)}
    >
        {#if community.is_private}
            Você deixa de ver a lista de membros e precisará de aprovação para voltar. Tem certeza?
        {:else}
            Você pode voltar quando quiser. Tem certeza?
        {/if}
    </ConfirmDialog>
{/if}

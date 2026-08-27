<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import Input from "#lib/components/Input.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import ProfileRow from "#lib/components/ProfileRow.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import {
        communityRoleLabel,
        fetchCommunityMembers,
        kickMember,
        setMemberRole,
        transferCommunity,
    } from "#lib/community";
    import { ApiError } from "#lib/error";
    import { SEARCH_DEBOUNCE_MS } from "#lib/profile";
    import { auth } from "#lib/state/user.svelte";
    import { timeSince } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { CommunityMember, CommunityRole } from "#lib/types";

    type Confirmation = { kind: "kick" | "transfer"; member: CommunityMember };

    let { data } = $props();

    let members = $derived(data.members);
    let nextCursor = $derived(data.nextCursor);
    let query = $state("");
    let loading = $state(false);
    let busy = $state(false);
    let confirming = $state<Confirmation | null>(null);
    let timer: ReturnType<typeof setTimeout> | null = null;

    /** O termo a que a página atual pertence, para o "carregar mais" manter ele. */
    let appliedTerm = $state<string | null>(null);

    let community = $derived(data.community);

    const filters: { value: CommunityRole | null; label: string }[] = [
        { value: null, label: "todos" },
        { value: "owner", label: "dono" },
        { value: "admin", label: "moderadores" },
        { value: "member", label: "membros" },
    ];

    // Depende da aba de propósito: trocar de filtro começa a busca por texto do zero.
    $effect(() => {
        data.role;
        query = "";
        appliedTerm = null;
        confirming = null;
    });

    function isSelf(member: CommunityMember): boolean {
        return auth.user?.slug === member.profile.slug;
    }

    function canKick(member: CommunityMember): boolean {
        if (isSelf(member) || member.role === "owner") return false;
        if (community.can_edit) return true;
        return community.can_moderate && member.role === "member";
    }

    function formatDate(value: string): string {
        return new Date(value).toLocaleDateString("pt-BR");
    }

    function roleHref(value: CommunityRole | null): string {
        const base = `/community/${community.slug}/member`;
        return value === null ? base : `${base}?role=${value}`;
    }

    async function search() {
        const requestedTerm = query.trim() || null;
        loading = true;
        try {
            const page = await fetchCommunityMembers(community.slug, requestedTerm, data.role);
            appliedTerm = requestedTerm;
            members = page.results;
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    function onInput() {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(search, SEARCH_DEBOUNCE_MS);
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchCommunityMembers(
                community.slug,
                appliedTerm,
                data.role,
                nextCursor,
            );
            members = [...members, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function changeRole(member: CommunityMember, next: "admin" | "member") {
        busy = true;
        try {
            await setMemberRole(community.slug, member.profile.slug, next);
            members = members.map((item) =>
                item.profile.id === member.profile.id ? { ...item, role: next } : item,
            );
            toast.success(
                next === "admin"
                    ? `${member.profile.name} agora é moderador`
                    : `${member.profile.name} voltou a ser membro`,
            );
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

    async function confirmKick(member: CommunityMember) {
        busy = true;
        try {
            await kickMember(community.slug, member.profile.slug);
            members = members.filter((item) => item.profile.id !== member.profile.id);
            // O contador do cabeçalho vem do load, então ele desce junto com a lista.
            community = { ...community, members_count: Math.max(0, community.members_count - 1) };
            toast.success(`${member.profile.name} saiu da comunidade`);
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
            confirming = null;
        }
    }

    async function confirmTransfer(member: CommunityMember) {
        busy = true;
        try {
            await transferCommunity(community.slug, member.profile.slug);
            await refreshAll();
            toast.success(`${member.profile.name} agora é o dono da comunidade`);
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busy = false;
            confirming = null;
        }
    }
</script>

<svelte:head><title>Membros de {community.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">
            Membros de {community.name} ({community.members_count})
        </h1>
        <a
            href="/community/{community.slug}"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para a comunidade
        </a>
    </div>

    {#if data.isPrivate}
        <EmptyState
            >Esta comunidade é privada: a lista de membros aparece só para quem participa.</EmptyState
        >
    {:else}
        <Input
            variant="search"
            type="search"
            bind:value={query}
            oninput={onInput}
            placeholder="Buscar por nome ou apelido"
        />

        <div class="flex flex-wrap gap-2">
            {#each filters as filter}
                <TabPill href={roleHref(filter.value)} active={data.role === filter.value}>
                    {filter.label}
                </TabPill>
            {/each}
        </div>

        {#if members.length === 0}
            <EmptyState>{loading ? "Carregando..." : "Nenhum membro encontrado."}</EmptyState>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each members as member (member.profile.id)}
                    <ProfileRow
                        slug={member.profile.slug}
                        name={member.profile.name}
                        avatarUrl={member.profile.avatar_url}
                        status={member.profile.status}
                        subtitle="{communityRoleLabel(member.role)} desde {formatDate(
                            member.joined_at,
                        )} ({timeSince(member.joined_at)})"
                    >
                        {#snippet actions()}
                            {#if community.can_edit && member.role === "member"}
                                <button
                                    type="button"
                                    class="cursor-pointer text-xs text-primary underline underline-offset-2"
                                    disabled={busy}
                                    onclick={() => changeRole(member, "admin")}
                                >
                                    promover a moderador
                                </button>
                            {:else if community.can_edit && member.role === "admin"}
                                <button
                                    type="button"
                                    class="cursor-pointer text-xs text-primary underline underline-offset-2"
                                    disabled={busy}
                                    onclick={() => changeRole(member, "member")}
                                >
                                    rebaixar a membro
                                </button>
                            {/if}

                            {#if community.can_edit && member.role !== "owner"}
                                <button
                                    type="button"
                                    class="cursor-pointer text-xs text-primary underline underline-offset-2"
                                    disabled={busy}
                                    onclick={() => (confirming = { kind: "transfer", member })}
                                >
                                    transferir comunidade
                                </button>
                            {/if}

                            {#if canKick(member)}
                                <button
                                    type="button"
                                    class="cursor-pointer text-xs text-primary underline underline-offset-2"
                                    disabled={busy}
                                    onclick={() => (confirming = { kind: "kick", member })}
                                >
                                    expulsar
                                </button>
                            {/if}
                        {/snippet}
                    </ProfileRow>
                {/each}
            </ul>

            <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
        {/if}
    {/if}
</main>

{#if confirming !== null}
    {@const target = confirming}
    {#if target.kind === "kick"}
        <ConfirmDialog
            title="Expulsar membro"
            confirmLabel="expulsar"
            {busy}
            onconfirm={() => confirmKick(target.member)}
            oncancel={() => (confirming = null)}
        >
            {target.member.profile.name} deixa de participar da comunidade. Em comunidade pública, nada
            impede de entrar de novo.
        </ConfirmDialog>
    {:else}
        <ConfirmDialog
            title="Transferir comunidade"
            confirmLabel="transferir"
            {busy}
            onconfirm={() => confirmTransfer(target.member)}
            oncancel={() => (confirming = null)}
        >
            {target.member.profile.name} passa a ser o dono e você vira moderador. Você não consegue desfazer
            isso sozinho.
        </ConfirmDialog>
    {/if}
{/if}

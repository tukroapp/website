<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import Button from "#lib/components/Button.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import ProfileRow from "#lib/components/ProfileRow.svelte";
    import { acceptJoinRequest, fetchJoinRequests, rejectJoinRequest } from "#lib/community";
    import { ApiError } from "#lib/error";
    import { relativeTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import type { JoinRequestItem } from "#lib/types";

    let { data } = $props();

    let community = $derived(data.community);
    let requests = $derived(data.requests);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);
    let busyId = $state<string | null>(null);

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchJoinRequests(community.slug, nextCursor);
            requests = [...requests, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function respond(request: JoinRequestItem, accept: boolean) {
        busyId = request.id;
        try {
            if (accept) {
                await acceptJoinRequest(community.slug, request.id);
                toast.success(`${request.profile.name} entrou na comunidade`);
            } else {
                await rejectJoinRequest(community.slug, request.id);
                toast.success("Pedido recusado");
            }
            // Os contadores da comunidade vivem no load, então ele roda de novo.
            await refreshAll();
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                toast.info("Esse pedido não está mais pendente");
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busyId = null;
        }
    }
</script>

<svelte:head><title>Pedidos de {community.name} | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">
            Pedidos de entrada
            {#if community.pending_requests_count}({community.pending_requests_count}){/if}
        </h1>
        <a
            href="/community/{community.slug}"
            class="text-sm text-primary underline underline-offset-2"
        >
            voltar para a comunidade
        </a>
    </div>

    <p class="text-sm text-muted">
        Recusar não avisa ninguém, e quem foi recusado pode pedir de novo depois.
    </p>

    {#if requests.length === 0}
        <EmptyState>Nenhum pedido aguardando resposta.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each requests as request (request.id)}
                <ProfileRow
                    slug={request.profile.slug}
                    name={request.profile.name}
                    avatarUrl={request.profile.avatar_url}
                    subtitle="pediu {relativeTime(request.created_at)}"
                >
                    {#snippet actions()}
                        <Button
                            size="sm"
                            disabled={busyId === request.id}
                            onclick={() => respond(request, true)}
                        >
                            aprovar
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
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

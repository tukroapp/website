<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import Button from "#lib/components/Button.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import ProfileRow from "#lib/components/ProfileRow.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import { ApiError } from "#lib/error";
    import {
        acceptFriendRequest,
        cancelFriendRequest,
        fetchFriendRequests,
        rejectFriendRequest,
    } from "#lib/friend";
    import { toastApiError } from "#lib/toast";
    import type { FriendRequestItem } from "#lib/types";

    let { data } = $props();

    let requests = $derived(data.requests);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);
    let busyId = $state<string | null>(null);

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchFriendRequests(data.direction, nextCursor);
            requests = [...requests, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

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
            await handleFailure(error);
        } finally {
            busyId = null;
        }
    }

    async function cancel(request: FriendRequestItem) {
        busyId = request.id;
        try {
            await cancelFriendRequest(request.slug);
            requests = requests.filter((item) => item.id !== request.id);
            toast.success("Pedido cancelado");
        } catch (error) {
            await handleFailure(error);
        } finally {
            busyId = null;
        }
    }

    /** Um 404 aqui significa que o outro lado já respondeu, então a lista está desatualizada. */
    async function handleFailure(error: unknown) {
        if (error instanceof ApiError && error.status === 404) {
            toast.info("Esse pedido não está mais pendente");
            await refreshAll();
        } else {
            toastApiError(error);
        }
    }
</script>

<svelte:head><title>Pedidos de amizade | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Pedidos de amizade</h1>

    <div class="flex gap-2">
        <TabPill href="/friends/requests" active={data.direction === "received"}>recebidos</TabPill>
        <TabPill href="/friends/requests?direction=sent" active={data.direction === "sent"}>
            enviados
        </TabPill>
    </div>

    {#if requests.length === 0}
        <EmptyState>Nenhum pedido pendente.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each requests as request (request.id)}
                <ProfileRow slug={request.slug} name={request.name} avatarUrl={request.avatar_url}>
                    {#snippet actions()}
                        {#if data.direction === "received"}
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
                        {:else}
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === request.id}
                                onclick={() => cancel(request)}
                            >
                                cancelar pedido
                            </Button>
                        {/if}
                    {/snippet}
                </ProfileRow>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

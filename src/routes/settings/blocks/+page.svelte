<script lang="ts">
    import { refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import Button from "#lib/components/Button.svelte";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import ProfileRow from "#lib/components/ProfileRow.svelte";
    import { fetchBlocks, unblockProfile } from "#lib/block";
    import { ApiError } from "#lib/error";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";
    import type { ProfileSummary } from "#lib/types";

    let { data } = $props();

    let blocks = $derived(data.blocks);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);
    let busySlug = $state<string | null>(null);

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchBlocks(nextCursor);
            blocks = [...blocks, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function unblock(profile: ProfileSummary) {
        busySlug = profile.slug;
        try {
            await unblockProfile(profile.slug);
            blocks = blocks.filter((item) => item.slug !== profile.slug);
            // Desbloquear traz de volta as notificações daquela pessoa, contador incluído.
            await auth.fetchUser();
            toast.success("Perfil desbloqueado");
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                await refreshAll();
            } else {
                toastApiError(error);
            }
        } finally {
            busySlug = null;
        }
    }
</script>

<svelte:head><title>Perfis bloqueados | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Perfis bloqueados</h1>
    <p class="text-sm text-muted">
        Enquanto o bloqueio existir, o perfil não abre para você. Desbloquear não devolve a amizade.
    </p>

    {#if blocks.length === 0}
        <EmptyState>Nenhum perfil bloqueado.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each blocks as profile (profile.id)}
                <ProfileRow slug={profile.slug} name={profile.name} avatarUrl={profile.avatar_url}>
                    {#snippet actions()}
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={busySlug === profile.slug}
                            onclick={() => unblock(profile)}
                        >
                            desbloquear
                        </Button>
                    {/snippet}
                </ProfileRow>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

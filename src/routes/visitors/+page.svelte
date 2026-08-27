<script lang="ts">
    import EmptyState from "#lib/components/EmptyState.svelte";
    import ProfileRow from "#lib/components/ProfileRow.svelte";
    import { relativeTime } from "#lib/time";

    let { data } = $props();

    const visitors = $derived(data.visitors);

    function visitorsLabel(count: number): string {
        return `${count} ${count === 1 ? "visitante" : "visitantes"} nos últimos 30 dias`;
    }
</script>

<svelte:head><title>Quem me visitou | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-2xl flex-col gap-3 p-3">
    <h1 class="text-lg font-bold text-content">Quem me visitou</h1>

    {#if !visitors.enabled}
        <EmptyState>
            O registro de visitas está desligado. Ligue em
            <a href="/settings" class="text-primary underline underline-offset-2">configurações</a>
            para ver quem passou pelo seu perfil e aparecer para os perfis que você visita.
        </EmptyState>
    {:else}
        <p class="text-sm text-muted">{visitorsLabel(visitors.count_30d)}.</p>

        {#if visitors.recent.length === 0}
            <EmptyState>Ninguém visitou seu perfil nos últimos 7 dias.</EmptyState>
        {:else}
            <ul class="flex flex-col gap-2">
                {#each visitors.recent as visitor (visitor.profile.id)}
                    <ProfileRow
                        slug={visitor.profile.slug}
                        name={visitor.profile.name}
                        avatarUrl={visitor.profile.avatar_url}
                        subtitle="visitou {relativeTime(visitor.visited_at)}"
                    />
                {/each}
            </ul>

            {#if visitors.count_30d > visitors.recent.length}
                <p class="text-xs text-muted">
                    A lista cobre só os últimos 7 dias. A contagem de 30 dias inclui visitantes que
                    já saíram dela.
                </p>
            {/if}
        {/if}
    {/if}
</main>

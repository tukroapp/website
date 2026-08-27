<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import { relativeTime } from "#lib/time";
    import type { FeedGroup } from "#lib/types";

    interface Props {
        group: FeedGroup;
    }

    let { group }: Props = $props();

    const item = $derived(group.lead);
    const LINK = "font-bold text-primary underline underline-offset-2";

    function mediaLabel(): string {
        if (group.count <= 1) {
            return group.media[0]?.kind === "video" ? "um vídeo" : "uma foto";
        }
        if (group.media.every((entry) => entry.kind === "photo")) return `${group.count} fotos`;
        if (group.media.every((entry) => entry.kind === "video")) return `${group.count} vídeos`;
        return `${group.count} arquivos`;
    }

    const albumHref = $derived(
        `/@${item.actor.slug}/album?kind=${group.media[0]?.kind ?? "photo"}`,
    );
</script>

<Avatar
    src={item.actor.avatar_url}
    name={item.actor.name}
    class="size-10 shrink-0"
    textClass="text-sm"
/>

<div class="min-w-0 flex-1">
    <p class="text-sm text-content">
        <a href="/@{item.actor.slug}" class={LINK}>{item.actor.name}</a>

        {#if item.kind === "testimonial_received"}
            recebeu um depoimento{#if item.target_user}
                de <a href="/@{item.target_user.slug}" class={LINK}>{item.target_user.name}</a>{/if}
        {:else if item.kind === "community_joined"}
            {#if group.count > 1}
                entrou em {group.count} comunidades
            {:else if item.community}
                entrou na comunidade
                <a href="/community/{item.community.slug}" class={LINK}>{item.community.name}</a>
            {:else}
                entrou numa comunidade
            {/if}
        {:else if item.kind === "community_created"}
            criou a comunidade
            {#if item.community}
                <a href="/community/{item.community.slug}" class={LINK}>{item.community.name}</a>
            {/if}
        {:else if item.kind === "became_fan"}
            virou fã {#if item.target_user}
                de <a href="/@{item.target_user.slug}" class={LINK}>{item.target_user.name}</a>{/if}
        {:else if item.kind === "friendship_made"}
            e
            {#if item.target_user}
                <a href="/@{item.target_user.slug}" class={LINK}>{item.target_user.name}</a>
            {:else}
                outra pessoa
            {/if}
            agora são amigos
        {:else if item.kind === "media_added"}
            adicionou <a href={albumHref} class={LINK}>{mediaLabel()}</a>
        {:else if item.kind === "status_changed"}
            atualizou o recado
        {/if}
    </p>

    {#if item.kind === "status_changed" && item.text}
        <p class="mt-0.5 text-sm text-accent italic">"{item.text}"</p>
    {/if}

    {#if item.kind === "media_added" && group.media.length > 0}
        <a href={albumHref} class="mt-1 flex flex-wrap gap-1">
            {#each group.media.slice(0, 8) as entry (entry.id)}
                {#if entry.kind === "photo"}
                    <img
                        src={entry.url}
                        alt=""
                        class="size-14 rounded-theme border border-line object-cover"
                    />
                {:else}
                    <span
                        class="flex size-14 items-center justify-center rounded-theme border border-line bg-canvas text-xs text-muted"
                    >
                        vídeo
                    </span>
                {/if}
            {/each}
        </a>
    {/if}

    <span class="mt-0.5 block text-xs text-muted">{relativeTime(item.created_at)}</span>
</div>

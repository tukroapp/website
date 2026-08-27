<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import { membersLabel } from "#lib/community";
    import type { CommunitySummary } from "#lib/types";

    interface Props {
        community: CommunitySummary;
    }

    let { community }: Props = $props();
</script>

<li class="rounded-theme border border-line bg-surface p-3">
    <a href="/community/{community.slug}" class="flex items-center gap-3">
        <Avatar src={community.avatar_url} name={community.name} class="size-14 shrink-0" />

        <div class="min-w-0">
            <span class="block truncate font-medium text-content">{community.name}</span>
            <span class="block truncate text-xs text-muted">
                {membersLabel(community.members_count)}
                {#if community.is_private}· privada{/if}
            </span>
            {#if community.description}
                <span class="block truncate text-xs text-muted">{community.description}</span>
            {/if}
        </div>
    </a>
</li>

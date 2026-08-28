<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import { communityCategoryLabel, membersLabel } from "#lib/community";
    import type { CommunitySummary, FriendCommunity } from "#lib/types";

    interface Props {
        community: CommunitySummary | FriendCommunity;
    }

    let { community }: Props = $props();

    const friendsCount = $derived("friends_count" in community ? community.friends_count : null);
</script>

<li class="rounded-theme border border-line bg-surface p-3">
    <div class="flex items-center gap-3">
        <a href="/community/{community.slug}" class="shrink-0">
            <Avatar src={community.avatar_url} name={community.name} class="size-14" />
        </a>

        <div class="min-w-0 flex-1">
            <a href="/community/{community.slug}" class="block truncate font-medium text-content">
                {community.name}
            </a>
            <span class="block truncate text-xs text-muted">
                {membersLabel(community.members_count)}
                {#if community.is_private}· privada{/if}
                ·
                <a
                    href="/community?category={community.category}"
                    class="text-primary underline underline-offset-2"
                >
                    {communityCategoryLabel(community.category)}
                </a>
            </span>
            {#if friendsCount !== null}
                <span class="block truncate text-xs text-primary">
                    {friendsCount}
                    {friendsCount === 1 ? "amigo seu participa" : "amigos seus participam"}
                </span>
            {:else if community.description}
                <span class="block truncate text-xs text-muted">{community.description}</span>
            {/if}
        </div>
    </div>
</li>

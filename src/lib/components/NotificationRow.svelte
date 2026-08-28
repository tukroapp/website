<script lang="ts">
    import Avatar from "#lib/components/Avatar.svelte";
    import { notificationMessage, notificationShowsActor } from "#lib/notification";
    import { relativeTime } from "#lib/time";
    import type { Notification } from "#lib/types";

    interface Props {
        notification: Notification;
    }

    let { notification }: Props = $props();

    const showActor = $derived(notificationShowsActor(notification.kind));
</script>

<Avatar
    src={notification.actor?.avatar_url ?? null}
    name={notification.actor?.name ?? "?"}
    class="size-10 shrink-0"
    textClass="text-sm"
/>

<span class="min-w-0 flex-1">
    <span class="block text-sm text-content">
        {#if showActor}
            <span class="font-bold">{notification.actor?.name}</span>
        {/if}
        {notificationMessage(notification)}
    </span>
    <span class="block text-xs text-muted">{relativeTime(notification.created_at)}</span>
</span>

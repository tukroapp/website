<script lang="ts">
    import { goto } from "$app/navigation";
    import Avatar from "#lib/components/Avatar.svelte";
    import NotificationRow from "#lib/components/NotificationRow.svelte";
    import {
        NOTIFICATION_DROPDOWN_SIZE,
        fetchNotifications,
        markAllNotificationsRead,
        markNotificationRead,
        notificationHref,
    } from "#lib/notification";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";
    import type { Notification } from "#lib/types";

    let open = $state(false);
    let loading = $state(false);
    let notifications = $state<Notification[]>([]);
    let container = $state<HTMLElement | null>(null);

    const user = $derived(auth.user);
    const unread = $derived(user?.unread_notifications_count ?? 0);

    async function toggle() {
        open = !open;
        // Só vale buscar a lista quando o painel abre de verdade.
        if (!open) return;

        loading = true;
        try {
            const page = await fetchNotifications(false, null, NOTIFICATION_DROPDOWN_SIZE);
            notifications = page.results;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function openNotification(notification: Notification) {
        open = false;
        if (notification.read_at === null) {
            try {
                await markNotificationRead(notification.id);
                auth.setUnreadNotifications(unread - 1);
            } catch (error) {
                toastApiError(error);
            }
        }
        await goto(notificationHref(notification));
    }

    async function readAll() {
        try {
            const remaining = await markAllNotificationsRead();
            auth.setUnreadNotifications(remaining);
            const now = new Date().toISOString();
            notifications = notifications.map((item) => {
                if (item.read_at !== null) return item;
                return { ...item, read_at: now };
            });
        } catch (error) {
            toastApiError(error);
        }
    }

    function onWindowPointerDown(event: PointerEvent) {
        if (!open || !container) return;
        if (!container.contains(event.target as Node)) open = false;
    }

    function onWindowKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") open = false;
    }
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeyDown} />

<div bind:this={container} class="relative">
    <button
        type="button"
        onclick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        class="flex cursor-pointer items-center gap-2 rounded-theme px-1 py-0.5 text-content hover:bg-surface-hover"
    >
        {#if user}
            <Avatar
                src={user.avatar_url}
                name={user.name}
                class="size-7 shrink-0"
                textClass="text-xs"
            />
        {/if}
        <span class="max-w-40 truncate">{user?.name}</span>
        {#if unread > 0}
            <span class="rounded-theme bg-accent px-1.5 py-0.5 text-xs text-on-accent">
                {unread}
            </span>
        {/if}
    </button>

    {#if open}
        <div
            class="absolute end-0 z-50 mt-1 flex w-80 flex-col rounded-theme border border-line bg-surface shadow-lg"
        >
            <div class="border-b border-line px-3 py-2 font-bold text-content">Notificações</div>

            {#if loading}
                <p class="px-3 py-4 text-sm text-muted">Carregando...</p>
            {:else if notifications.length === 0}
                <p class="px-3 py-4 text-sm text-muted">Nada por aqui ainda.</p>
            {:else}
                <ul class="flex max-h-96 flex-col overflow-y-auto">
                    {#each notifications as notification (notification.id)}
                        <li>
                            <button
                                type="button"
                                onclick={() => openNotification(notification)}
                                class="flex w-full cursor-pointer items-center gap-2 border-b border-line px-3 py-2 text-start hover:bg-surface-hover {notification.read_at ===
                                null
                                    ? 'bg-canvas'
                                    : ''}"
                            >
                                <NotificationRow {notification} />
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}

            <div class="flex items-center justify-between border-t border-line px-3 py-2 text-xs">
                <button
                    type="button"
                    onclick={readAll}
                    disabled={unread === 0}
                    class="cursor-pointer text-primary underline underline-offset-2 disabled:cursor-default disabled:text-muted disabled:no-underline"
                >
                    marcar todas como lidas
                </button>
                <a
                    href="/notifications"
                    onclick={() => (open = false)}
                    class="text-primary underline underline-offset-2"
                >
                    ver todas
                </a>
            </div>
        </div>
    {/if}
</div>

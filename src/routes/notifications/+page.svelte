<script lang="ts">
    import { goto, refreshAll } from "$app/navigation";
    import { toast } from "svelte-sonner";
    import EmptyState from "#lib/components/EmptyState.svelte";
    import LoadMore from "#lib/components/LoadMore.svelte";
    import NotificationRow from "#lib/components/NotificationRow.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import { ApiError } from "#lib/error";
    import {
        deleteNotification,
        fetchNotifications,
        markAllNotificationsRead,
        markNotificationRead,
        notificationHref,
    } from "#lib/notification";
    import { pollWhileVisible } from "#lib/polling";
    import { auth } from "#lib/state/user.svelte";
    import { toastApiError } from "#lib/toast";
    import type { Notification } from "#lib/types";

    let { data } = $props();

    let notifications = $derived(data.notifications);
    let nextCursor = $derived(data.nextCursor);
    let loading = $state(false);
    let busy = $state(false);

    const unread = $derived(auth.user?.unread_notifications_count ?? 0);

    // Página 1 a cada 30s enquanto o feed está aberto, só acrescentando o que é novo.
    $effect(() => pollWhileVisible(pollNew, 30_000));

    async function pollNew() {
        try {
            const page = await fetchNotifications(data.onlyUnread);
            const known = new Set(notifications.map((item) => item.id));
            const fresh = page.results.filter((item) => !known.has(item.id));
            if (fresh.length > 0) {
                notifications = [...fresh, ...notifications].sort((a, b) =>
                    b.created_at.localeCompare(a.created_at),
                );
            }
        } catch {
            // Poll de fundo: o próximo tick tenta de novo.
        }
    }

    async function loadMore() {
        loading = true;
        try {
            const page = await fetchNotifications(data.onlyUnread, nextCursor);
            notifications = [...notifications, ...page.results];
            nextCursor = page.next_cursor;
        } catch (error) {
            toastApiError(error);
        } finally {
            loading = false;
        }
    }

    async function open(notification: Notification) {
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
        busy = true;
        try {
            const remaining = await markAllNotificationsRead();
            auth.setUnreadNotifications(remaining);
            await refreshAll();
            toast.success("Tudo marcado como lido");
        } catch (error) {
            toastApiError(error);
        } finally {
            busy = false;
        }
    }

    async function remove(notification: Notification) {
        busy = true;
        try {
            await deleteNotification(notification.id);
            notifications = notifications.filter((item) => item.id !== notification.id);
            if (notification.read_at === null) auth.setUnreadNotifications(unread - 1);
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
</script>

<svelte:head><title>Notificações | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
        <h1 class="text-lg font-bold text-content">
            Notificações
            {#if unread > 0}({unread} não lidas){/if}
        </h1>
        <button
            type="button"
            class="cursor-pointer text-sm text-primary underline underline-offset-2 disabled:cursor-default disabled:text-muted disabled:no-underline"
            disabled={busy || unread === 0}
            onclick={readAll}
        >
            marcar todas como lidas
        </button>
    </div>

    <div class="flex flex-wrap gap-2">
        <TabPill href="/notifications" active={!data.onlyUnread}>todas</TabPill>
        <TabPill href="/notifications?unread=true" active={data.onlyUnread}>só não lidas</TabPill>
    </div>

    {#if notifications.length === 0}
        <EmptyState>Nada por aqui ainda.</EmptyState>
    {:else}
        <ul class="flex flex-col gap-2">
            {#each notifications as notification (notification.id)}
                <li
                    class="flex items-center gap-3 rounded-theme border border-line p-3 {notification.read_at ===
                    null
                        ? 'bg-canvas'
                        : 'bg-surface'}"
                >
                    <button
                        type="button"
                        onclick={() => open(notification)}
                        class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-start"
                    >
                        <NotificationRow {notification} />
                    </button>

                    <button
                        type="button"
                        class="cursor-pointer text-xs text-primary underline underline-offset-2"
                        disabled={busy}
                        onclick={() => remove(notification)}
                    >
                        apagar
                    </button>
                </li>
            {/each}
        </ul>

        <LoadMore cursor={nextCursor} {loading} onclick={loadMore} />
    {/if}
</main>

<script lang="ts">
    import "./layout.css";
    import { Toaster } from "svelte-sonner";
    import GuestNavbar from "#lib/components/GuestNavbar.svelte";
    import LinkPrompt from "#lib/components/LinkPrompt.svelte";
    import Navbar from "#lib/components/Navbar.svelte";
    import NavigationProgress from "#lib/components/NavigationProgress.svelte";
    import { fetchUnreadCounts } from "#lib/message";
    import { pollWhileVisible } from "#lib/polling";
    import { auth } from "#lib/state/user.svelte";

    let { children } = $props();

    // A splash de boot vive no app.html, então quem a tira é a primeira montagem.
    $effect(() => {
        document.getElementById("boot")?.remove();
    });

    // Heartbeat: um COUNT barato a cada 30s mantém os badges do sino e das mensagens em dia.
    $effect(() => {
        if (!auth.user) return;
        return pollWhileVisible(
            async () => {
                try {
                    const counts = await fetchUnreadCounts();
                    auth.setUnreadNotifications(counts.notifications);
                    auth.setUnreadMessages(counts.messages);
                    auth.setFeedUnseen(counts.feed);
                } catch {
                    // Batimento de fundo: se falhar, o próximo resolve.
                }
            },
            30_000,
            true,
        );
    });
</script>

<svelte:head><link rel="icon" href="/favicon.svg" /></svelte:head>

<NavigationProgress />

<Toaster
    closeButton
    expand
    position="top-right"
    toastOptions={{
        unstyled: true,
        classes: {
            toast: "flex w-full items-start gap-3 rounded-theme border border-line bg-surface p-4 shadow-lg",
            icon: "relative mt-0.5 flex size-5 shrink-0 items-center justify-center",
            content: "flex min-w-0 flex-1 flex-col gap-1",
            title: "text-sm font-semibold text-content",
            description:
                "text-sm text-muted [&_a]:font-medium [&_a]:text-content [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-muted",
            loader: "absolute inset-0 m-auto size-4",
            actionButton:
                "shrink-0 rounded-theme bg-primary px-2.5 py-1.5 text-xs font-medium text-on-primary hover:bg-primary-hover",
            cancelButton:
                "shrink-0 rounded-theme bg-surface-hover px-2.5 py-1.5 text-xs font-medium text-content hover:opacity-80",
            closeButton:
                "absolute -top-2 -left-2 flex size-5 items-center justify-center rounded-full border border-line bg-surface text-muted hover:text-content",
            success: "text-content [&_[data-icon]]:text-primary",
            error: "text-content [&_[data-icon]]:text-danger",
            warning: "text-content [&_[data-icon]]:text-accent",
            info: "text-content [&_[data-icon]]:text-muted",
        },
    }}
/>
{#if auth.user}
    <Navbar />
{:else}
    <GuestNavbar />
{/if}

<LinkPrompt />

{@render children()}

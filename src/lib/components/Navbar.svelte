<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import Icon from "#lib/components/Icon.svelte";
    import type { IconName } from "#lib/components/Icon.svelte";
    import NotificationsMenu from "#lib/components/NotificationsMenu.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import { unreadBadge } from "#lib/format";
    import { auth } from "#lib/state/user.svelte";

    let open = $state(false);

    const currentPath = $derived(page.url.pathname);
    const profilePath = $derived(auth.user ? `/@${auth.user.slug}` : "/");
    const scrapsPath = $derived(auth.user ? `/@${auth.user.slug}/scraps` : "/");

    const unreadMessages = $derived(auth.user?.unread_messages_count ?? 0);
    const unreadNotifications = $derived(auth.user?.unread_notifications_count ?? 0);
    const feedUnseen = $derived(auth.feedUnseen);

    const links = $derived<{ label: string; href: string; icon: IconName }[]>([
        { label: "Início", href: "/", icon: "home" },
        { label: "Perfil", href: profilePath, icon: "profile" },
        { label: "Buscar", href: "/search", icon: "search" },
        { label: "Recados", href: scrapsPath, icon: "scraps" },
        { label: "Mensagens", href: "/messages", icon: "messages" },
        { label: "Comunidades", href: "/community", icon: "communities" },
        { label: "Configurações", href: "/settings", icon: "settings" },
        // Toda rota /admin responde 403 para os outros, então o item fica escondido.
        ...(auth.user?.is_superuser
            ? [{ label: "Denúncias", href: "/admin/reports", icon: "reports" as const }]
            : []),
    ]);

    $effect(() => {
        currentPath;
        open = false;
    });

    async function logout() {
        open = false;
        await auth.logout();
        toast.success("Sessão encerrada");
        await goto("/login");
    }
</script>

{#snippet pill(label: string, href: string, icon: IconName, iconClass: string)}
    <TabPill {href} active={currentPath === href}>
        <span class="flex items-center gap-1.5">
            <Icon name={icon} class={iconClass} />
            {label}
            {#if href === "/messages" && unreadMessages > 0}
                <span>({unreadBadge(unreadMessages)})</span>
            {:else if href === "/" && feedUnseen > 0}
                <span class="inline-block size-1.5 rounded-full bg-accent align-middle"></span>
            {/if}
        </span>
    </TabPill>
{/snippet}

<header class="border-b border-line bg-surface">
    <div class="mx-auto w-full max-w-7xl px-3 text-sm">
        <div class="flex h-12 items-center gap-2">
            <a href="/" class="text-2xl font-bold tracking-tight text-accent lowercase">tukro</a>

            <!-- O ícone só entra a partir de xl: entre lg e xl não cabe rótulo mais ícone. -->
            <nav class="hidden min-w-0 flex-1 items-center gap-1.5 lg:flex">
                {#each links as link (link.href)}
                    {@render pill(
                        link.label,
                        link.href,
                        link.icon,
                        "hidden size-4 shrink-0 xl:block",
                    )}
                {/each}
            </nav>

            <div class="ms-auto hidden lg:block">
                <NotificationsMenu />
            </div>

            <button
                type="button"
                onclick={logout}
                class="hidden cursor-pointer rounded-theme border border-line bg-surface-hover px-3 py-0.5 text-content hover:bg-line lg:block"
            >
                Sair
            </button>

            <button
                type="button"
                onclick={() => (open = !open)}
                aria-expanded={open}
                aria-controls="navbar-menu"
                aria-label="Abrir menu"
                class="ms-auto cursor-pointer rounded-theme border border-line bg-surface-hover px-3 py-1 text-lg leading-none text-content lg:hidden"
            >
                {open ? "×" : "≡"}
            </button>
        </div>

        {#if open}
            <nav id="navbar-menu" class="flex flex-col gap-1.5 border-t border-line py-2 lg:hidden">
                {#each links as link (link.href)}
                    {@render pill(link.label, link.href, link.icon, "size-4 shrink-0")}
                {/each}

                <TabPill href="/notifications" active={currentPath === "/notifications"}>
                    <span class="flex items-center gap-1.5">
                        <Icon name="notifications" class="size-4 shrink-0" />
                        Notificações
                        {#if unreadNotifications > 0}<span
                                >({unreadBadge(unreadNotifications)})</span
                            >{/if}
                    </span>
                </TabPill>

                <button
                    type="button"
                    onclick={logout}
                    class="cursor-pointer rounded-theme border border-line bg-surface-hover px-3 py-1.5 text-start text-content"
                >
                    Sair
                </button>
            </nav>
        {/if}
    </div>
</header>

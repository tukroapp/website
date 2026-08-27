<script lang="ts">
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { toast } from "svelte-sonner";
    import NotificationsMenu from "#lib/components/NotificationsMenu.svelte";
    import TabPill from "#lib/components/TabPill.svelte";
    import { auth } from "#lib/state/user.svelte";

    let open = $state(false);

    const currentPath = $derived(page.url.pathname);
    const profilePath = $derived(auth.user ? `/@${auth.user.slug}` : "/");
    const scrapsPath = $derived(auth.user ? `/@${auth.user.slug}/scraps` : "/");

    const unreadMessages = $derived(auth.user?.unread_messages_count ?? 0);
    const unreadNotifications = $derived(auth.user?.unread_notifications_count ?? 0);
    const feedUnseen = $derived(auth.feedUnseen);

    const links = $derived([
        { label: "Início", href: "/" },
        { label: "Perfil", href: profilePath },
        { label: "Buscar", href: "/search" },
        { label: "Recados", href: scrapsPath },
        { label: "Mensagens", href: "/messages" },
        { label: "Comunidades", href: "/community" },
        { label: "Configurações", href: "/settings" },
        // Toda rota /admin responde 403 para os outros, então o item fica escondido.
        ...(auth.user?.is_superuser ? [{ label: "Denúncias", href: "/admin/reports" }] : []),
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

{#snippet pill(label: string, href: string)}
    <TabPill {href} active={currentPath === href}>
        {label}
        {#if href === "/messages" && unreadMessages > 0}
            <span>({unreadMessages})</span>
        {:else if href === "/" && feedUnseen > 0}
            <span class="inline-block size-1.5 rounded-full bg-accent align-middle"></span>
        {/if}
    </TabPill>
{/snippet}

<header class="border-b border-line bg-surface">
    <div class="mx-auto w-full max-w-7xl px-3 text-sm">
        <div class="flex h-12 items-center gap-2">
            <a href="/" class="text-2xl font-bold tracking-tight text-accent lowercase">tukro</a>

            <nav class="hidden min-w-0 flex-1 items-center gap-1.5 lg:flex">
                {#each links as link (link.href)}
                    {@render pill(link.label, link.href)}
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
                    {@render pill(link.label, link.href)}
                {/each}

                <TabPill href="/notifications" active={currentPath === "/notifications"}>
                    Notificações
                    {#if unreadNotifications > 0}<span>({unreadNotifications})</span>{/if}
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

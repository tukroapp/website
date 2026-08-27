<script lang="ts">
    import type { Snippet } from "svelte";
    import Avatar from "#lib/components/Avatar.svelte";

    interface Props {
        slug: string;
        name: string;
        avatarUrl: string | null;
        /** Linha abaixo do nome. Sem valor, usa o @slug do perfil. */
        subtitle?: string;
        /** O status que a pessoa escreveu no próprio perfil, mostrado entre aspas. */
        status?: string | null;
        /** Botões ou links à direita da linha. */
        actions?: Snippet;
    }

    let { slug, name, avatarUrl, subtitle, status = null, actions }: Props = $props();
</script>

<li class="flex flex-wrap items-center gap-3 rounded-theme border border-line bg-surface p-3">
    <a href="/@{slug}" class="shrink-0">
        <Avatar src={avatarUrl} {name} class="size-12" />
    </a>

    <div class="min-w-0 flex-1">
        <a
            href="/@{slug}"
            class="block truncate font-medium text-primary underline underline-offset-2"
        >
            {name}
        </a>
        <span class="block truncate text-xs text-muted">{subtitle ?? `@${slug}`}</span>
        {#if status}
            <span class="block truncate text-xs text-accent italic">"{status}"</span>
        {/if}
    </div>

    {#if actions}
        <div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
    {/if}
</li>

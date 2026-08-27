<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        /** Link à direita do título, normalmente "ver todos". */
        linkHref?: string;
        linkLabel?: string;
        /** Espaçamento menor e título menor, para as colunas laterais. */
        compact?: boolean;
        children: Snippet;
    }

    let { title, linkHref, linkLabel, compact = false, children }: Props = $props();
</script>

<div
    class="flex flex-col gap-2 rounded-theme border border-line bg-surface {compact
        ? 'p-3'
        : 'p-4'}"
>
    <div class="flex items-center justify-between gap-2 border-b border-line pb-1">
        <h2 class="font-bold text-content {compact ? 'text-sm' : 'text-base'}">{title}</h2>
        {#if linkHref && linkLabel}
            <a href={linkHref} class="text-xs text-primary underline underline-offset-2">
                {linkLabel}
            </a>
        {/if}
    </div>

    {@render children()}
</div>

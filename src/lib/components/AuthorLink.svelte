<script lang="ts">
    import type { Snippet } from "svelte";
    import { isDeletedProfile } from "#lib/profile";

    interface Props {
        /** Slug do autor. Conta excluída vem como `deleted-xxxx` e não tem página. */
        slug: string;
        class?: string;
        children: Snippet;
    }

    let { slug, class: className = "", children }: Props = $props();
</script>

{#if isDeletedProfile(slug)}
    <span class={className}>{@render children()}</span>
{:else}
    <a href="/@{slug}" class={className}>{@render children()}</a>
{/if}

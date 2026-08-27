<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        active: boolean;
        /** Com valor, a pill vira link; sem valor, vira botão com onclick. */
        href?: string;
        onclick?: () => void;
        children: Snippet;
    }

    let { active, href, onclick, children }: Props = $props();

    const activeStyle = "bg-primary text-on-primary border-primary";
    const inactiveStyle = "bg-surface-hover text-content border-line hover:bg-line";

    const style = $derived(
        `rounded-theme border px-3 py-1 text-sm ${active ? activeStyle : inactiveStyle}`,
    );
</script>

{#if href}
    <a {href} class={style}>{@render children()}</a>
{:else}
    <button type="button" {onclick} class="cursor-pointer {style}">
        {@render children()}
    </button>
{/if}

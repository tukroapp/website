<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();
</script>

<p class="rounded-theme border border-line bg-surface p-4 text-sm text-muted">
    {@render children()}
</p>

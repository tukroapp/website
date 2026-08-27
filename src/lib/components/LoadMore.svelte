<script lang="ts">
    import Button from "#lib/components/Button.svelte";

    interface Props {
        /** Cursor da próxima página. Null significa que a lista acabou e nada é renderizado. */
        cursor: string | null;
        loading: boolean;
        onclick: () => void;
    }

    let { cursor, loading, onclick }: Props = $props();
</script>

{#if cursor !== null}
    <div class="flex justify-center">
        <Button variant="outline" disabled={loading} {onclick}>
            {loading ? "carregando..." : "carregar mais"}
        </Button>
    </div>
{/if}

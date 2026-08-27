<script lang="ts">
    interface Props {
        /** Mensagens que a API devolveu para um campo. Undefined quando o campo está certo. */
        messages: string[] | undefined;
    }

    let { messages }: Props = $props();
</script>

{#each messages ?? [] as message}
    <p class="text-xs text-danger">{message}</p>
{/each}

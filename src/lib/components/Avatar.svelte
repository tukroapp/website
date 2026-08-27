<script lang="ts">
    interface Props {
        /** URL absoluta enviada pelo backend, ou null quando a pessoa não tem foto. */
        src: string | null;
        name: string;
        /** Tamanho e formato vêm de quem chama, e o fallback acompanha a caixa da imagem. */
        class?: string;
        textClass?: string;
    }

    let { src, name, class: className = "", textClass = "text-lg" }: Props = $props();
</script>

{#if src}
    <img {src} alt="Foto de {name}" class="border border-line object-cover {className}" />
{:else}
    <div
        class="flex items-center justify-center border border-line bg-canvas font-bold text-muted {textClass} {className}"
    >
        {name.charAt(0).toUpperCase()}
    </div>
{/if}

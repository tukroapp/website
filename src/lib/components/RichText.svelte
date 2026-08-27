<script lang="ts">
    import { renderBbcode } from "#lib/bbcode";
    import { askLink } from "#lib/state/link.svelte";

    interface Props {
        /** Corpo cru como está guardado, ainda com `[b]`, `[url]` e companhia. */
        value: string;
        class?: string;
    }

    let { value, class: className = "" }: Props = $props();

    // Seguro por construção: `renderBbcode` escapa o texto e só emite as tags dele.
    const html = $derived(renderBbcode(value));

    /** Link escrito por outra pessoa pergunta antes de sair, com o endereço na tela. */
    function intercept(event: MouseEvent) {
        const anchor = (event.target as Element | null)?.closest("a[href]");
        if (!anchor) return;

        event.preventDefault();
        askLink(anchor.getAttribute("href") ?? "");
    }
</script>

<!--
    Os handlers ficam no wrapper porque os links são montados a partir do texto do corpo. O
    teclado já está coberto: Enter num link focado dispara este mesmo evento de clique, e
    `auxclick` pega o botão do meio, que abriria uma aba sem perguntar.
-->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    dir="auto"
    class="break-words whitespace-pre-wrap {className}"
    onclick={intercept}
    onauxclick={intercept}
>
    {@html html}
</div>

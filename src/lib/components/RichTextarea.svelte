<script lang="ts">
    import { tick } from "svelte";
    import RichText from "./RichText.svelte";
    import Textarea from "./Textarea.svelte";

    interface Props {
        value: string;
        /** Vai para o próprio textarea, para um `<label for>` continuar apontando para ele. */
        id?: string;
        rows?: number;
        maxlength?: number;
        placeholder?: string;
        disabled?: boolean;
    }

    let { value = $bindable(""), id, rows = 3, maxlength, placeholder, disabled }: Props = $props();

    type Panel = "link" | "image" | "color";

    const TOOL =
        "flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-theme px-1.5 text-xs text-content hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-50";

    /** A ajuda passa pelo mesmo parser de um corpo real, então não tem como divergir dele. */
    const EXAMPLES = [
        "[b]negrito[/b]",
        "[i]itálico[/i]",
        "[u]sublinhado[/u]",
        "[s]riscado[/s]",
        "[c]código[/c]",
        "[quote]citação[/quote]",
        "[center]centralizado[/center]",
        "[right]à direita[/right]",
        "[url=https://tukro.app]nome do link[/url]",
        "[color=#e0479b]colorido[/color]",
    ];

    let element = $state<HTMLTextAreaElement | null>(null);
    let helpOpen = $state(false);
    /** Cor livre do seletor nativo, que sempre devolve `#rrggbb`. */
    let pickedColor = $state("#e0479b");
    let panel = $state<Panel | null>(null);
    let preview = $state(false);
    let pendingUrl = $state("");

    function togglePanel(next: Panel) {
        panel = panel === next ? null : next;
        pendingUrl = "";
    }

    /** Envolve o que estiver selecionado e deixa a seleção nele, pronta para o próximo clique. */
    async function apply(open: string, close: string) {
        if (!element) return;

        const start = element.selectionStart;
        const end = element.selectionEnd;
        const selected = value.slice(start, end);

        value = value.slice(0, start) + open + selected + close + value.slice(end);
        panel = null;

        // O elemento só carrega o texto novo depois que o Svelte escreve no DOM.
        await tick();
        element.focus();
        element.setSelectionRange(start + open.length, start + open.length + selected.length);
    }

    /** O link dá nome ao texto selecionado, a imagem carrega o endereço como conteúdo. */
    function insertUrl() {
        const url = pendingUrl.trim();
        if (url === "" || !element) return;

        if (panel === "image") {
            apply(`[img]${url}[/img]`, "");
        } else if (element.selectionStart === element.selectionEnd) {
            // Nada selecionado significa nenhum texto para nomear o link, então o endereço aparece sozinho.
            apply(`[url=${url}]${url}[/url]`, "");
        } else {
            apply(`[url=${url}]`, "[/url]");
        }

        pendingUrl = "";
    }
</script>

<div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-1 rounded-theme border border-line bg-surface p-1">
        <button
            type="button"
            class="{TOOL} font-bold"
            title="Negrito"
            {disabled}
            onclick={() => apply("[b]", "[/b]")}
        >
            B
        </button>
        <button
            type="button"
            class="{TOOL} italic"
            title="Itálico"
            {disabled}
            onclick={() => apply("[i]", "[/i]")}
        >
            I
        </button>
        <button
            type="button"
            class="{TOOL} underline"
            title="Sublinhado"
            {disabled}
            onclick={() => apply("[u]", "[/u]")}
        >
            U
        </button>
        <button
            type="button"
            class="{TOOL} line-through"
            title="Riscado"
            {disabled}
            onclick={() => apply("[s]", "[/s]")}
        >
            S
        </button>
        <button
            type="button"
            class="{TOOL} font-mono"
            title="Código"
            {disabled}
            onclick={() => apply("[c]", "[/c]")}
        >
            código
        </button>
        <button
            type="button"
            class={TOOL}
            title="Citação"
            {disabled}
            onclick={() => apply("[quote]", "[/quote]")}
        >
            citação
        </button>
        <button
            type="button"
            class={TOOL}
            title="Centralizar"
            {disabled}
            onclick={() => apply("[center]", "[/center]")}
        >
            centro
        </button>
        <button
            type="button"
            class={TOOL}
            title="Alinhar à direita"
            {disabled}
            onclick={() => apply("[right]", "[/right]")}
        >
            direita
        </button>
        <button
            type="button"
            class={TOOL}
            title="Link"
            {disabled}
            onclick={() => togglePanel("link")}
        >
            link
        </button>
        <button
            type="button"
            class={TOOL}
            title="Imagem"
            {disabled}
            onclick={() => togglePanel("image")}
        >
            imagem
        </button>
        <button
            type="button"
            class={TOOL}
            title="Cor do texto"
            {disabled}
            onclick={() => togglePanel("color")}
        >
            cor
        </button>

        <button
            type="button"
            class="{TOOL} ms-auto text-primary underline underline-offset-2"
            title="Lista das tags"
            onclick={() => (helpOpen = true)}
        >
            tags
        </button>
        <button
            type="button"
            class="{TOOL} text-primary underline underline-offset-2"
            onclick={() => (preview = !preview)}
        >
            {preview ? "editar" : "prévia"}
        </button>
    </div>

    {#if panel === "link" || panel === "image"}
        <div class="flex flex-wrap gap-2">
            <input
                bind:value={pendingUrl}
                placeholder={panel === "image" ? "https://.../foto.png" : "https://"}
                class="h-8 flex-1 rounded-theme border border-line bg-canvas px-3 text-sm text-content placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onkeydown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    insertUrl();
                }}
            />
            <button
                type="button"
                class="h-8 cursor-pointer rounded-theme bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
                onclick={insertUrl}
            >
                inserir
            </button>
        </div>
    {:else if panel === "color"}
        <div class="flex flex-wrap items-center gap-2">
            <input
                type="color"
                bind:value={pickedColor}
                class="size-7 cursor-pointer rounded-theme border border-line bg-canvas p-0.5"
                aria-label="Escolher a cor do texto"
            />
            <button
                type="button"
                class="h-7 cursor-pointer rounded-theme bg-primary px-3 text-xs font-medium text-on-primary hover:bg-primary-hover"
                onclick={() => apply(`[color=${pickedColor}]`, "[/color]")}
            >
                aplicar
            </button>
        </div>
    {/if}

    {#if preview}
        <div class="min-h-16 rounded-theme border border-line bg-canvas px-3 py-2">
            {#if value.trim() === ""}
                <p class="text-sm text-muted">Nada para mostrar ainda.</p>
            {:else}
                <RichText {value} class="text-sm text-content" />
            {/if}
        </div>
    {:else}
        <Textarea bind:value bind:element {id} {rows} {maxlength} {placeholder} {disabled} />
    {/if}
</div>

<svelte:window onkeydown={(event) => event.key === "Escape" && (helpOpen = false)} />

{#if helpOpen}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3"
    >
        <div
            class="flex w-full max-w-lg flex-col gap-3 rounded-theme border border-line bg-surface p-4"
        >
            <div class="flex items-center justify-between gap-2">
                <h2 class="text-base font-bold text-content">Escrever as tags à mão</h2>
                <button
                    type="button"
                    class="{TOOL} text-primary underline underline-offset-2"
                    onclick={() => (helpOpen = false)}
                >
                    fechar
                </button>
            </div>

            <dl class="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-2 gap-y-1 text-xs">
                {#each EXAMPLES as example (example)}
                    <dt class="font-mono text-content">{example}</dt>
                    <dd class="text-muted">vira</dd>
                    <dd><RichText value={example} class="text-xs text-content" /></dd>
                {/each}
            </dl>

            <p class="text-xs text-muted">
                <span class="font-mono text-content">[img]endereço da imagem[/img]</span> mostra a imagem,
                e o endereço vai dentro da tag.
            </p>

            <p class="text-xs text-muted">
                A cor sai só em hexadecimal, e dentro de <span class="font-mono">[c]</span> nada é formatado.
                Tag que não existe, ou que ficou aberta, aparece como texto normal.
            </p>
        </div>
    </div>
{/if}

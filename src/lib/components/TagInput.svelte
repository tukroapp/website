<script lang="ts">
    import { LIST_ITEM_MAX_LENGTH } from "#lib/profile";

    interface Props {
        /** A lista editada. Bindable, sempre um array de strings. */
        value: string[];
        id?: string;
        placeholder?: string;
        /** Teto de itens. Chegando nele, o campo para de aceitar novos. */
        maxItems?: number;
        maxLength?: number;
    }

    let {
        value = $bindable([]),
        id,
        placeholder = "Digite e aperte Enter",
        maxItems,
        maxLength = LIST_ITEM_MAX_LENGTH,
    }: Props = $props();

    let draft = $state("");

    const full = $derived(maxItems != null && value.length >= maxItems);

    function add() {
        const item = draft.trim().slice(0, maxLength);
        draft = "";
        if (item === "" || full) return;
        // Duplicata não some da tela, então nem entra.
        if (value.some((existing) => existing.toLowerCase() === item.toLowerCase())) return;
        value = [...value, item];
    }

    function removeAt(index: number) {
        value = value.filter((_, position) => position !== index);
    }

    function onKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add();
        } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
            removeAt(value.length - 1);
        }
    }
</script>

<!-- A borda e o foco são da caixa toda; o input de dentro entra sem borda,
     senão o plugin de forms desenha a moldura escura padrão dele. -->
<div
    class="flex flex-wrap items-center gap-1.5 rounded-theme border border-line bg-canvas px-2 py-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
>
    {#each value as item, index (item)}
        <span
            class="flex items-center gap-1 rounded-theme bg-surface-hover px-2 py-0.5 text-sm text-content"
        >
            {item}
            <button
                type="button"
                aria-label="Remover {item}"
                onclick={() => removeAt(index)}
                class="cursor-pointer text-muted hover:text-content"
            >
                &times;
            </button>
        </span>
    {/each}

    <input
        {id}
        type="text"
        bind:value={draft}
        onkeydown={onKeydown}
        onblur={add}
        placeholder={full ? "Limite atingido" : placeholder}
        disabled={full}
        class="min-w-32 flex-1 border-0 bg-transparent p-0 py-0.5 text-base text-content placeholder:text-muted focus:ring-0 focus:outline-none disabled:opacity-50 sm:text-sm"
    />
</div>

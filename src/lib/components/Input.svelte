<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";

    type Variant = "form" | "search";

    /** `value` é bindable e sempre string, diferente do atributo solto do DOM. */
    interface Props extends Omit<HTMLInputAttributes, "value"> {
        value: string;
        variant?: Variant;
    }

    let {
        value = $bindable(""),
        variant = "form",
        type = "text",
        class: className = "",
        ...rest
    }: Props = $props();

    const variants: Record<Variant, string> = {
        /** Combina com os textareas ao lado nas telas de formulário, que vêm do plugin de forms. */
        form: "rounded-theme border-line bg-canvas px-3 py-2 text-base focus:border-primary focus:ring-primary sm:text-sm",
        /** A caixa de busca que fica acima de uma lista. */
        search: "h-9 rounded-theme border border-line bg-surface px-3 text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
    };
</script>

<input
    bind:value
    {type}
    class="w-full text-content placeholder:text-muted disabled:opacity-50
        {variants[variant]} {className}"
    {...rest}
/>

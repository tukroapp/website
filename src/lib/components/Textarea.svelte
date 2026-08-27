<script lang="ts">
    import type { HTMLTextareaAttributes } from "svelte/elements";

    type Variant = "content" | "form";

    /** `value` é bindable e sempre string, diferente do atributo solto do DOM. */
    interface Props extends Omit<HTMLTextareaAttributes, "value"> {
        value: string;
        variant?: Variant;
        /** O elemento em si, para quem precisa do cursor, como a barra de formatação. */
        element?: HTMLTextAreaElement | null;
    }

    let {
        value = $bindable(""),
        element = $bindable<HTMLTextAreaElement | null>(null),
        variant = "content",
        rows = 3,
        class: className = "",
        ...rest
    }: Props = $props();

    const variants: Record<Variant, string> = {
        /** Texto livre que as pessoas escrevem e leem: comentários, recados, depoimentos. */
        content:
            "resize-y border border-line text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
        /** Combina com os inputs ao lado nas telas de formulário, que vêm do plugin de forms. */
        form: "border-line text-base focus:border-primary focus:ring-primary sm:text-sm",
    };
</script>

<textarea
    bind:this={element}
    bind:value
    dir="auto"
    {rows}
    class="min-h-16 w-full rounded-theme bg-canvas px-3 py-2 text-content placeholder:text-muted
        {variants[variant]} {className}"
    {...rest}></textarea>

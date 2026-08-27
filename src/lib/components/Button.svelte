<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";

    type Variant = "primary" | "accent" | "outline" | "ghost" | "danger";
    type Size = "sm" | "md" | "lg";

    interface Props extends HTMLButtonAttributes {
        variant?: Variant;
        size?: Size;
        /** O elemento em si, para quem precisa mandar o foco para ele. */
        element?: HTMLButtonElement | null;
        children: Snippet;
    }

    let {
        variant = "primary",
        size = "md",
        type = "button",
        class: className = "",
        element = $bindable<HTMLButtonElement | null>(null),
        children,
        ...rest
    }: Props = $props();

    const variants: Record<Variant, string> = {
        primary: "bg-primary text-on-primary hover:bg-primary-hover",
        accent: "bg-accent text-on-accent hover:bg-accent-hover",
        outline: "border border-line bg-surface text-content hover:bg-surface-hover",
        ghost: "text-content hover:bg-surface-hover",
        danger: "bg-danger text-on-danger hover:opacity-90",
    };

    const sizes: Record<Size, string> = {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-base",
    };
</script>

<button
    bind:this={element}
    {type}
    class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-theme font-medium
        transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
        focus-visible:ring-offset-canvas focus-visible:outline-none
        disabled:pointer-events-none disabled:opacity-50 {variants[variant]} {sizes[
        size
    ]} {className}"
    {...rest}
>
    {@render children()}
</button>

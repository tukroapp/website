<script lang="ts">
    import type { RatingAxisKey } from "#lib/types";

    interface Props {
        axis: RatingAxisKey;
        /** Quanto do ícone fica preenchido, de 0 (vazio) a 1 (cheio). */
        fill: number;
        class?: string;
    }

    let { axis, fill, class: className = "" }: Props = $props();

    const percent = $derived(Math.min(Math.max(fill, 0), 1) * 100);

    /** Heroicons 24px solid: face-smile, cube e heart, o par exato dos contornos. */
    const SOLID: Record<RatingAxisKey, string> = {
        trusty: "M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 0 1-.189-.866c0-.298.059-.605.189-.866Zm2.023 6.828a.75.75 0 1 0-1.06-1.06 3.75 3.75 0 0 1-5.304 0 .75.75 0 0 0-1.06 1.06 5.25 5.25 0 0 0 7.424 0Z",
        cool: "M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z",
        sexy: "m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z",
    };

    /** Os mesmos três em 24px outline, para o que não foi preenchido. */
    const OUTLINE: Record<RatingAxisKey, string> = {
        trusty: "M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z",
        cool: "m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9",
        sexy: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z",
    };

    /**
     * Cores fixas, não as do tema: o amarelo, o azul e o vermelho são a
     * identidade da avaliação, e mudariam de sentido acompanhando o tema.
     */
    const COLORS: Record<RatingAxisKey, string> = {
        trusty: "text-amber-400",
        cool: "text-sky-400",
        sexy: "text-red-500",
    };
</script>

<!-- O contorno é a base e o ícone cheio vai por cima, recortado pela largura da
     máscara: meia avaliação vira meio desenho, não um desenho espremido. -->
<span class="relative inline-block shrink-0 {className}">
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        aria-hidden="true"
        class="size-full text-muted"
    >
        <path stroke-linecap="round" stroke-linejoin="round" d={OUTLINE[axis]} />
    </svg>

    {#if percent > 0}
        <span
            class="absolute inset-y-0 left-0 overflow-hidden"
            style="width: {percent}%"
            aria-hidden="true"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                class="max-w-none {COLORS[axis]} {className}"
            >
                <path fill-rule="evenodd" clip-rule="evenodd" d={SOLID[axis]} />
            </svg>
        </span>
    {/if}
</span>

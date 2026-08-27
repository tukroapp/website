/**
 * Roda `task` a cada `intervalMs` enquanto a aba está visível e pausa quando ela sai de
 * vista, retomando na volta. Devolve a função de limpeza para o `$effect` que chamou.
 *
 * ```ts
 * $effect(() => pollWhileVisible(refresh, 15_000));
 * ```
 */
export function pollWhileVisible(
    task: () => void,
    intervalMs: number,
    immediate = false,
): () => void {
    let timer: ReturnType<typeof setInterval> | null = null;
    let ranOnce = false;

    function start() {
        if (timer !== null) return;
        if (immediate && !ranOnce) {
            ranOnce = true;
            task();
        }
        timer = setInterval(task, intervalMs);
    }

    function stop() {
        if (timer === null) return;
        clearInterval(timer);
        timer = null;
    }

    function onVisibilityChange() {
        if (document.visibilityState === "visible") start();
        else stop();
    }

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
        stop();
        document.removeEventListener("visibilitychange", onVisibilityChange);
    };
}

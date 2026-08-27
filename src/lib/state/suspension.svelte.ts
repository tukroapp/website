import { ApiError } from "#lib/error";
import type { Suspension } from "#lib/types";

const STORAGE_KEY = "tukro-suspension";

/** `setTimeout` estoura depois de ~24,8 dias, e uma suspensão dessas não precisa cair ao vivo. */
const MAX_TIMER_MS = 24 * 60 * 60 * 1000;

let current = $state<Suspension | null>(null);
let timer: ReturnType<typeof setTimeout> | null = null;

function isSuspension(value: unknown): value is Suspension {
    if (typeof value !== "object" || value === null) return false;
    const { until, reason } = value as Suspension;
    return (
        (until === null || typeof until === "string") &&
        (reason === null || typeof reason === "string")
    );
}

function hasExpired(suspension: Suspension): boolean {
    return suspension.until !== null && new Date(suspension.until).getTime() <= Date.now();
}

/** Solta o bloqueio sozinho, para quem está esperando não precisar recarregar a página. */
function scheduleRelease(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;

    if (current?.until == null) return;

    const remaining = new Date(current.until).getTime() - Date.now();
    if (remaining > MAX_TIMER_MS) return;

    timer = setTimeout(clearSuspension, Math.max(remaining, 0));
}

export function getSuspension(): Suspension | null {
    return current;
}

export function setSuspension(suspension: Suspension): void {
    current = suspension;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(suspension));
    scheduleRelease();
}

export function clearSuspension(): void {
    current = null;
    localStorage.removeItem(STORAGE_KEY);
    if (timer !== null) clearTimeout(timer);
    timer = null;
}

/** Restaura o bloqueio de uma tentativa anterior, descartando se o prazo já passou. */
export function initSuspension(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;

    let parsed: unknown = null;
    try {
        parsed = JSON.parse(raw);
    } catch {
        parsed = null;
    }

    if (!isSuspension(parsed) || hasExpired(parsed)) {
        clearSuspension();
        return;
    }

    current = parsed;
    scheduleRelease();
}

export function suspensionMessage(suspension: Suspension): string {
    if (suspension.until === null) return "Sua conta está suspensa por tempo indeterminado.";

    const until = new Date(suspension.until).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

    return `Sua conta está suspensa até ${until}.`;
}

/** Lê o 403 do `POST /auth/login`, que carrega os mesmos dados do redirect do OAuth. */
export function suspensionFromApiError(error: unknown): Suspension | null {
    if (!(error instanceof ApiError)) return null;

    const [first] = error.errorsAt("account");
    if (first?.code !== "account_suspended") return null;

    const until = first.params.suspended_until;
    const reason = first.params.reason;

    return {
        until: typeof until === "string" ? until : null,
        reason: typeof reason === "string" ? reason : null,
    };
}

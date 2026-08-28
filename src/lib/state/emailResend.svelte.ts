/**
 * Limitador local do botão de reenviar e-mail de verificação. O backend tem o
 * dele; este só evita que a pessoa fique martelando o botão.
 *
 * Regra: cada reenvio dobra a espera a partir de 30s (30s, 1m, 2m, 4m, ...),
 * com teto de 1h numa espera. 30min depois do primeiro reenvio da janela, o
 * contador zera sozinho. O estado vive no `localStorage` para sobreviver a um
 * reload.
 */

const STORAGE_KEY = "tukro:email-resend";
const BASE_COOLDOWN_MS = 30_000;
const MAX_COOLDOWN_MS = 60 * 60_000;
const WINDOW_RESET_MS = 30 * 60_000;

interface Persisted {
    /** Quantos reenvios nesta janela. */
    count: number;
    /** Primeiro reenvio da janela: a partir dele conta os 30min de reset. */
    firstSentAt: number;
    lastSentAt: number;
}

/** Espera devida depois do reenvio de número `count`. */
function cooldownMs(count: number): number {
    if (count <= 0) return 0;
    return Math.min(MAX_COOLDOWN_MS, BASE_COOLDOWN_MS * 2 ** (count - 1));
}

function readStorage(): Persisted | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Persisted) : null;
    } catch {
        return null;
    }
}

class EmailResendLimiter {
    #entry = $state<Persisted | null>(readStorage());
    /** Relógio reativo: quem observa o contador chama `watch` e este valor anda de 1 em 1s. */
    now = $state(Date.now());

    #watchers = 0;
    #interval: ReturnType<typeof setInterval> | null = null;

    #save() {
        try {
            if (this.#entry) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.#entry));
            else localStorage.removeItem(STORAGE_KEY);
        } catch {
            // localStorage indisponível: o limite passa a valer só nesta aba.
        }
    }

    /** Zera a janela quando passou dos 30min desde o primeiro reenvio. */
    #pruneExpired() {
        if (this.#entry && this.now - this.#entry.firstSentAt >= WINDOW_RESET_MS) {
            this.#entry = null;
            this.#save();
        }
    }

    get secondsLeft(): number {
        const entry = this.#entry;
        if (!entry) return 0;
        if (this.now - entry.firstSentAt >= WINDOW_RESET_MS) return 0;
        const readyAt = entry.lastSentAt + cooldownMs(entry.count);
        return Math.max(0, Math.ceil((readyAt - this.now) / 1000));
    }

    get canResend(): boolean {
        return this.secondsLeft === 0;
    }

    /** Registra um reenvio bem-sucedido e reinicia a contagem regressiva. */
    record() {
        const now = Date.now();
        const open =
            this.#entry && now - this.#entry.firstSentAt < WINDOW_RESET_MS ? this.#entry : null;
        this.#entry = {
            count: (open?.count ?? 0) + 1,
            firstSentAt: open?.firstSentAt ?? now,
            lastSentAt: now,
        };
        this.now = now;
        this.#save();
    }

    /**
     * Liga o relógio reativo enquanto o componente que mostra o contador estiver
     * montado. Uso: `$effect(() => emailResend.watch())`.
     */
    watch(): () => void {
        this.#watchers += 1;
        this.now = Date.now();
        this.#pruneExpired();
        if (!this.#interval) {
            this.#interval = setInterval(() => {
                this.now = Date.now();
                this.#pruneExpired();
            }, 1000);
        }
        return () => {
            this.#watchers -= 1;
            if (this.#watchers <= 0 && this.#interval) {
                clearInterval(this.#interval);
                this.#interval = null;
            }
        };
    }
}

export const emailResend = new EmailResendLimiter();

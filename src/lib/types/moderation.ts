/** Espelha o enum `account_status` do banco. */
export type AccountStatus = "active" | "suspended" | "deactivated";

/** Suspensão que a tela de login mostra para quem está barrado. `until` null é permanente. */
export interface Suspension {
    until: string | null;
    reason: string | null;
}

export interface SuspendRequest {
    reason: string;
    /** Datetime ISO. Omitido significa suspensão permanente. */
    until?: string | null;
}

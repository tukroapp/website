import type { ProfileSummary } from "./user";

export interface ProfileVisitor {
    profile: ProfileSummary;
    /** ISO, a última visita desse visitante. */
    visited_at: string;
}

export interface ProfileVisitorsResponse {
    /** Falso quando o dono desligou o registro: `count_30d` vem 0 e `recent` vem vazio. */
    enabled: boolean;
    /** Visitantes distintos nos últimos 30 dias. Pode ser maior que `recent.length`. */
    count_30d: number;
    /** Últimos 7 dias, no máximo 20, já ordenado do mais recente para o mais antigo. */
    recent: ProfileVisitor[];
}

import type { AccountStatus } from "./moderation";
import type { ProfileSummary } from "./user";

export type ReportReason =
    "spam" | "harassment" | "hate_speech" | "nudity" | "impersonation" | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface ReportRequest {
    reason: ReportReason;
    details?: string;
}

export interface ReportCreated {
    id: string;
    created_at: string;
}

export interface ReportListItem {
    id: string;
    reason: ReportReason;
    status: ReportStatus;
    created_at: string;
    reporter: ProfileSummary;
    /** Null é permitido para alvos futuros de denúncia, hoje sempre vem preenchido. */
    reported: ProfileSummary | null;
}

/** A conta denunciada vista pela moderação: sem filtro de privacidade, e-mail incluído. */
export interface ReportedAccount extends ProfileSummary {
    email: string;
    account_status: AccountStatus;
    /** Null significa que a suspensão é permanente. */
    suspended_until: string | null;
    is_email_verified: boolean;
    registered_at: string;
    bio: string | null;
    city: string | null;
    birthdate: string | null;
    friends_count: number;
    scraps_written_count: number;
    scraps_received_count: number;
    testimonials_written_count: number;
    blocked_by_count: number;
    reports_count: number;
}

/** Conteúdo apagado com soft delete continua visível aqui, e só aqui, marcado por `is_deleted`. */
export interface ReportedScrap {
    id: string;
    body: string;
    created_at: string;
    wall_slug: string;
    is_reply: boolean;
    is_deleted: boolean;
}

export interface ReportedTestimonial {
    id: string;
    body: string;
    status: string;
    profile_slug: string;
    is_deleted: boolean;
}

export interface OtherReport {
    id: string;
    reason: ReportReason;
    status: ReportStatus;
    created_at: string;
    reporter_slug: string;
}

export interface ReportDetail {
    id: string;
    reason: ReportReason;
    details: string | null;
    status: ReportStatus;
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: ProfileSummary | null;
    reporter: ProfileSummary;
    reported: ReportedAccount | null;
    recent_scraps: ReportedScrap[];
    recent_testimonials: ReportedTestimonial[];
    other_reports: OtherReport[];
}

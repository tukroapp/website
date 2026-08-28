import type { AccountStatus } from "./moderation";
import type { ProfileSummary } from "./user";

export type ReportReason =
    "spam" | "harassment" | "hate_speech" | "nudity" | "impersonation" | "other";

export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

/** Perfil mais os seis alvos de conteúdo. */
export type ReportKind =
    "profile" | "scrap" | "testimonial" | "community" | "topic" | "comment" | "poll";

/** Só os alvos que o admin remove e restaura. Perfil fica de fora: conta se suspende. */
export type ReportContentKind = Exclude<ReportKind, "profile">;

export interface ReportRequest {
    reason: ReportReason;
    details?: string;
}

export interface ReportCreated {
    id: string;
    created_at: string;
}

/** Resumo do alvo no card da fila, o bastante para triar sem abrir o detalhe. */
export interface ReportTargetSummary {
    kind: ReportKind;
    /** `user_id` quando `kind` é `profile`, senão o id do conteúdo. */
    id: string;
    /** Slug do perfil, mural ou comunidade para montar o link. Null conforme o tipo. */
    slug: string | null;
    /** Nome da comunidade, título do tópico ou pergunta da enquete. Null conforme o tipo. */
    title: string | null;
    /** Primeiros 280 caracteres do corpo. Null em comunidade e enquete. */
    excerpt: string | null;
    /** `true` quando o conteúdo já saiu do ar por soft delete. */
    is_deleted: boolean;
}

/** Quem responde pelo conteúdo: o perfil em si, ou o autor. Null em denúncia de comunidade. */
export interface ReportAccountable {
    profile: ProfileSummary;
    account_status: AccountStatus;
    profile_reports_count: number;
    blocked_by_count: number;
}

export interface ReportListItem {
    id: string;
    reason: ReportReason;
    details: string | null;
    status: ReportStatus;
    created_at: string;
    reviewed_at: string | null;
    reporter: ProfileSummary;
    target: ReportTargetSummary;
    accountable: ReportAccountable | null;
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

/** Objeto taggeado por `kind` com o conteúdo denunciado, no detalhe da denúncia. */
export type ReportTarget =
    | { kind: "profile" }
    | {
          kind: "scrap";
          id: string;
          body: string;
          created_at: string;
          wall_slug: string;
          is_reply: boolean;
          is_deleted: boolean;
      }
    | {
          kind: "testimonial";
          id: string;
          body: string;
          status: string;
          created_at: string;
          profile_slug: string;
          is_deleted: boolean;
      }
    | {
          kind: "community";
          id: string;
          slug: string;
          name: string;
          description: string | null;
          is_private: boolean;
          created_at: string;
          members_count: number;
          owner_slug: string;
      }
    | {
          kind: "topic";
          id: string;
          title: string;
          body: string;
          created_at: string;
          community_slug: string;
          is_locked: boolean;
          is_deleted: boolean;
      }
    | {
          kind: "comment";
          id: string;
          body: string;
          created_at: string;
          topic_id: string;
          topic_title: string;
          community_slug: string;
          is_deleted: boolean;
      }
    | {
          kind: "poll";
          id: string;
          question: string;
          created_at: string;
          community_slug: string;
          is_closed: boolean;
          closes_at: string | null;
          is_deleted: boolean;
          options: string[];
      };

export interface ReportDetail {
    id: string;
    reason: ReportReason;
    details: string | null;
    status: ReportStatus;
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: ProfileSummary | null;
    reporter: ProfileSummary;
    target: ReportTarget;
    /** Null em denúncia de comunidade, que não tem conta responsável. */
    reported: ReportedAccount | null;
    recent_scraps: ReportedScrap[];
    recent_testimonials: ReportedTestimonial[];
    other_reports: OtherReport[];
}

export type ModerationActionKind =
    "content_removed" | "content_restored" | "user_suspended" | "user_unsuspended";

/** Uma linha do histórico de moderação de uma conta. Substitui o hard delete. */
export interface ModerationHistoryItem {
    id: string;
    action: ModerationActionKind;
    reason: string;
    /** Texto do conteúdo no momento da remoção. Null em ação sobre a conta. */
    content_snapshot: string | null;
    target_label: string;
    /** Null em ação sobre a conta (suspensão). */
    content_kind: ReportContentKind | null;
    content_id: string | null;
    report_id: string | null;
    /** Null se a conta do moderador foi removida depois. */
    moderator: ProfileSummary | null;
    created_at: string;
}

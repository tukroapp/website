import type { ProfileSummary } from "./user";

export type NotificationKind =
    | "friend_request"
    | "friend_accepted"
    | "scrap_received"
    | "scrap_reply"
    | "testimonial_received"
    | "testimonial_accepted"
    | "community_join_request"
    | "community_join_accepted"
    | "topic_comment"
    | "topic_reply";

export interface Notification {
    id: string;
    kind: NotificationKind;
    created_at: string;
    read_at: string | null;
    /** Null é permitido para eventos futuros do sistema, hoje sempre vem preenchido. */
    actor: ProfileSummary | null;
    /** Perfil para onde o link deve levar, já resolvido pelo backend. */
    target_slug: string;
    scrap_id: string | null;
    testimonial_id: string | null;
    friend_request_id: string | null;
    community_id: string | null;
    community_slug: string | null;
    topic_id: string | null;
    /** Preenchido em `topic_reply`, e o link abre ele pela rota de contexto. */
    comment_id: string | null;
}

export interface UnreadCountResponse {
    unread_count: number;
}

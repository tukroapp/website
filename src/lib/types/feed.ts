import type { ProfileSummary } from "./user";

export type FeedKind =
    | "testimonial_received"
    | "community_joined"
    | "community_created"
    | "became_fan"
    | "friendship_made"
    | "media_added"
    | "status_changed"
    | "topic_created"
    | "poll_created";

export interface FeedCommunity {
    slug: string;
    name: string;
}

export interface FeedMedia {
    id: string;
    kind: "photo" | "video";
    url: string;
}

export interface FeedItem {
    id: string;
    kind: FeedKind;
    created_at: string;
    /** Quem fez a ação. */
    actor: ProfileSummary;
    /** Autor do depoimento, novo amigo ou ídolo, conforme o `kind`. */
    target_user: ProfileSummary | null;
    community: FeedCommunity | null;
    media: FeedMedia | null;
    /** O novo recado no `status_changed`, o título no `topic_created`, a pergunta no `poll_created`. */
    text: string | null;
    /** Só no `topic_created`. */
    topic_id: string | null;
    /** Só no `poll_created`. */
    poll_id: string | null;
}

/** Linhas consecutivas do mesmo ator colapsadas: várias fotos, várias comunidades, recados repetidos. */
export interface FeedGroup {
    /** Id do item mais recente do grupo, serve de key. */
    id: string;
    lead: FeedItem;
    /** Quantas linhas o grupo colapsou. */
    count: number;
    /** ISO do item mais antigo do grupo, para a janela de agrupamento. */
    oldest_at: string;
    /** As mídias do grupo, para a tira de miniaturas do `media_added`. */
    media: FeedMedia[];
}

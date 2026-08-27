import type { ProfileSummary } from "./user";

export interface Scrap {
    id: string;
    body: string;
    created_at: string;
    updated_at: string;
    author: ProfileSummary;
    /** Sempre 0 dentro de uma conversa, resposta não recebe resposta. */
    reply_count: number;
}

export interface ScrapRequest {
    body: string;
}

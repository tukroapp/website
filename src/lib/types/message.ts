import type { ProfileSummary } from "./user";

export interface ConversationLastMessage {
    /** Já sem markup e colapsado, ~140 chars com reticências. */
    preview: string;
    from_me: boolean;
    created_at: string;
}

export interface ConversationSummary {
    id: string;
    counterpart: ProfileSummary;
    last_message: ConversationLastMessage;
    /** Suas mensagens não lidas nessa conversa. */
    unread_count: number;
    /** ISO, também é a chave de ordenação do cursor. */
    last_message_at: string;
}

export interface MessageResponse {
    id: string;
    conversation_id: string;
    /** Corpo cru com markup, renderiza com o mesmo parser de recado e tópico. */
    body: string;
    from_me: boolean;
    created_at: string;
}

export interface SendMessageRequest {
    body: string;
}

export interface UnreadCounts {
    notifications: number;
    messages: number;
    feed: number;
}

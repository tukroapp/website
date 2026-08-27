import type { ProfileSummary } from "./user";

export interface Topic {
    id: string;
    community_slug: string;
    title: string;
    body: string;
    is_pinned: boolean;
    is_locked: boolean;
    created_at: string;
    /** Só preenchido quando o autor reescreveu o texto: fixar, trancar e comentar não marcam. */
    edited_at: string | null;
    /** Sobe a cada comentário novo, e é a ordem da listagem. */
    last_activity_at: string;
    author: ProfileSummary;
    /** Comentários apagados não contam. */
    comment_count: number;
    /** Só o autor edita. A moderação apaga, mas nunca reescreve o texto de outra pessoa. */
    can_edit: boolean;
    can_delete: boolean;
    can_moderate: boolean;
}

export interface TopicRequest {
    title: string;
    body: string;
}

export interface Comment {
    id: string;
    topic_id: string;
    /** Null num comentário de primeiro nível. */
    parent_id: string | null;
    /**
     * Distância até a raiz da árvore nesta resposta. Na rota de contexto ela é relativa ao
     * comentário em foco, que vem como 0, e os ancestrais vêm negativos.
     */
    depth: number;
    /** Vem como marcador de exclusão quando `deleted_at` está preenchido, nunca renderize nesse caso. */
    body: string;
    created_at: string;
    edited_at: string | null;
    /** Preenchido no comentário apagado, que fica na conversa segurando as respostas abaixo dele. */
    deleted_at: string | null;
    /** Null no comentário apagado. */
    author: ProfileSummary | null;
    can_edit: boolean;
    can_delete: boolean;
}

export interface CommentRequest {
    body: string;
    /** Omitido cria um comentário de primeiro nível, preenchido responde aquele comentário. */
    parent_id?: string | null;
}

export interface CommentContext {
    /** Do ancestral mais antigo até o pai direto. Vazio quando o comentário em foco é de primeiro nível. */
    ancestors: Comment[];
    comment: Comment;
    /** Subárvore abaixo do comentário em foco, paginada pelo cursor próprio dela. */
    replies: Comment[];
    next_cursor: string | null;
}

/** Um comentário com as respostas penduradas nele, remontado a partir da lista plana da API. */
export interface CommentNode {
    comment: Comment;
    children: CommentNode[];
}

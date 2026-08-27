import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    Comment,
    CommentContext,
    CommentNode,
    Topic,
    TopicRequest,
} from "./types";

const TOPIC_PAGE_SIZE = 20;
export const TOPIC_TITLE_MAX_LENGTH = 200;
export const TOPIC_BODY_MAX_LENGTH = 1000;
const COMMENT_PAGE_SIZE = 20;
export const COMMENT_MAX_LENGTH = 1000;
/** O backend não tem limite de profundidade, então acima deste nível o recuo para de crescer. */
export const COMMENT_MAX_INDENT = 4;

/**
 * Remonta o aninhamento a partir da lista plana que a API responde. A ordem é a ordem de
 * leitura, então o pai de um comentário é o último mais raso que ele. Serve tanto para a
 * listagem, que começa na profundidade 0, quanto para a rota de contexto, onde a
 * profundidade é relativa.
 */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
    const roots: CommentNode[] = [];
    const ancestors: CommentNode[] = [];

    for (const comment of comments) {
        const node: CommentNode = { comment, children: [] };

        while (
            ancestors.length > 0 &&
            ancestors[ancestors.length - 1].comment.depth >= comment.depth
        ) {
            ancestors.pop();
        }

        if (ancestors.length === 0) {
            roots.push(node);
        } else {
            ancestors[ancestors.length - 1].children.push(node);
        }

        ancestors.push(node);
    }

    return roots;
}

/**
 * Página de tópicos de uma comunidade. Os fixados vêm inteiros na primeira página, e o
 * resto é ordenado por última atividade, então um tópico antigo sobe ao receber comentário.
 */
export function fetchCommunityTopics(
    slug: string,
    cursor: string | null = null,
    limit: number = TOPIC_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<Topic>> {
    return apiFetch.get<ApiCursorPaginatedResponse<Topic>>(
        `/api/v1/community/${encodeURIComponent(slug)}/topic`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function createTopic(
    slug: string,
    payload: TopicRequest,
    fetchFn: typeof fetch = fetch,
): Promise<Topic> {
    return apiFetch
        .post<ApiResponse<Topic>>(
            `/api/v1/community/${encodeURIComponent(slug)}/topic`,
            payload,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function fetchTopic(id: string, fetchFn: typeof fetch = fetch): Promise<Topic> {
    return apiFetch
        .get<ApiResponse<Topic>>(`/api/v1/topic/${id}`, {}, fetchFn)
        .then((res) => res.results);
}

export function updateTopic(
    id: string,
    payload: TopicRequest,
    fetchFn: typeof fetch = fetch,
): Promise<Topic> {
    return apiFetch
        .put<ApiResponse<Topic>>(`/api/v1/topic/${id}`, payload, {}, fetchFn)
        .then((res) => res.results);
}

export function deleteTopic(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/topic/${id}`, {}, fetchFn);
}

export function setTopicPinned(
    id: string,
    pinned: boolean,
    fetchFn: typeof fetch = fetch,
): Promise<Topic> {
    const path = `/api/v1/topic/${id}/pin`;
    const request = pinned
        ? apiFetch.post<ApiResponse<Topic>>(path, undefined, {}, fetchFn)
        : apiFetch.delete<ApiResponse<Topic>>(path, {}, fetchFn);
    return request.then((res) => res.results);
}

export function setTopicLocked(
    id: string,
    locked: boolean,
    fetchFn: typeof fetch = fetch,
): Promise<Topic> {
    const path = `/api/v1/topic/${id}/lock`;
    const request = locked
        ? apiFetch.post<ApiResponse<Topic>>(path, undefined, {}, fetchFn)
        : apiFetch.delete<ApiResponse<Topic>>(path, {}, fetchFn);
    return request.then((res) => res.results);
}

/**
 * Comentários de um tópico, já achatados em ordem de leitura: cada comentário de primeiro
 * nível vem seguido da subárvore inteira dele. O `limit` conta só os de primeiro nível,
 * então a resposta costuma trazer mais itens que isso; o fim da lista é o `next_cursor`
 * ser null, nunca o tamanho de `results`.
 */
export function fetchTopicComments(
    id: string,
    cursor: string | null = null,
    limit: number = COMMENT_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<Comment>> {
    return apiFetch.get<ApiCursorPaginatedResponse<Comment>>(
        `/api/v1/topic/${id}/comment`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function createComment(
    topicId: string,
    body: string,
    parentId: string | null = null,
    fetchFn: typeof fetch = fetch,
): Promise<Comment> {
    return apiFetch
        .post<ApiResponse<Comment>>(
            `/api/v1/topic/${topicId}/comment`,
            { body, parent_id: parentId },
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function updateComment(
    topicId: string,
    commentId: string,
    body: string,
    fetchFn: typeof fetch = fetch,
): Promise<Comment> {
    return apiFetch
        .put<ApiResponse<Comment>>(
            `/api/v1/topic/${topicId}/comment/${commentId}`,
            { body },
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

/** Soft delete: o comentário fica na conversa como marcador, segurando as respostas abaixo dele. */
export function deleteComment(
    topicId: string,
    commentId: string,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/topic/${topicId}/comment/${commentId}`, {}, fetchFn);
}

/** Abre um comentário perdido no meio de uma conversa longa, com a cadeia acima dele. */
export function fetchCommentContext(
    topicId: string,
    commentId: string,
    cursor: string | null = null,
    limit: number = COMMENT_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<CommentContext> {
    return apiFetch
        .get<ApiResponse<CommentContext>>(
            `/api/v1/topic/${topicId}/comment/${commentId}/context`,
            { query: { limit, cursor } },
            fetchFn,
        )
        .then((res) => res.results);
}

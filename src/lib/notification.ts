import { apiFetch } from "./api";
import { auth } from "./state/user.svelte";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    Notification,
    NotificationKind,
    UnreadCountResponse,
} from "./types";

const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_DROPDOWN_SIZE = 10;

export function fetchNotifications(
    unread: boolean = false,
    cursor: string | null = null,
    limit: number = NOTIFICATION_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<Notification>> {
    return apiFetch.get<ApiCursorPaginatedResponse<Notification>>(
        "/api/v1/notification",
        { query: { unread: unread ? true : null, limit, cursor } },
        fetchFn,
    );
}

/** Idempotente, chamar de novo mantém o primeiro read_at. */
export function markNotificationRead(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.post<void>(`/api/v1/notification/${id}/read`, undefined, {}, fetchFn);
}

export function markAllNotificationsRead(fetchFn: typeof fetch = fetch): Promise<number> {
    return apiFetch
        .post<ApiResponse<UnreadCountResponse>>(
            "/api/v1/notification/read-all",
            undefined,
            {},
            fetchFn,
        )
        .then((res) => res.results.unread_count);
}

export function deleteNotification(id: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/notification/${id}`, {}, fetchFn);
}

/**
 * O vocabulário é o do Orkut de propósito: convite de amizade, mural, recado,
 * depoimento. Nada aqui pode supor o gênero de quem agiu, então as frases não
 * usam "amigo" nem "amiga": o perfil não tem esse campo.
 */
const MESSAGES: Record<NotificationKind, string> = {
    friend_request: "enviou um convite de amizade",
    friend_accepted: "aceitou seu convite de amizade",
    scrap_received: "deixou um recado no seu mural",
    scrap_reply: "respondeu seu recado",
    testimonial_received: "escreveu um depoimento para você",
    testimonial_accepted: "aceitou seu depoimento",
    community_join_request: "pediu para entrar numa comunidade que você modera",
    community_join_accepted: "aprovou seu pedido para entrar na comunidade",
    topic_comment: "comentou no seu tópico do fórum",
    topic_reply: "respondeu seu comentário no fórum",
    // Agregada: uma só notificação enquanto não lida, então fala no plural e não nomeia ninguém.
    new_fan: "Você tem novos fãs",
};

export function notificationMessage(notification: Notification): string {
    return MESSAGES[notification.kind];
}

/** `new_fan` é agregada e não deve mostrar o nome de quem virou fã: entre criar e ler entrou gente. */
export function notificationShowsActor(kind: NotificationKind): boolean {
    return kind !== "new_fan";
}

/** Para onde o item leva. O slug vem resolvido do backend, nunca é deduzido aqui. */
export function notificationHref(notification: Notification): string {
    const profile = `/@${notification.target_slug}`;
    // Evento de comunidade carrega o slug dela, `target_slug` é sempre um perfil.
    const community = notification.community_slug
        ? `/community/${notification.community_slug}`
        : "/community";

    // O link do fórum precisa do tópico, e o de resposta abre o comentário no contexto.
    const topic = notification.topic_id ? `${community}/topic/${notification.topic_id}` : community;

    switch (notification.kind) {
        case "topic_comment":
            return topic;
        case "topic_reply":
            return notification.comment_id ? `${topic}?comment=${notification.comment_id}` : topic;
        case "community_join_request":
            return `${community}/join-request`;
        case "community_join_accepted":
            return community;
        case "friend_request":
            return "/friends/requests";
        case "new_fan":
            // Vai para a sua lista de fãs, não para o perfil de quem virou fã.
            return auth.user ? `/@${auth.user.slug}/fans` : "/";
        case "testimonial_received":
            return "/testimonials";
        case "scrap_received":
        case "scrap_reply":
            return `${profile}/scraps`;
        case "friend_accepted":
        case "testimonial_accepted":
            return profile;
    }
}

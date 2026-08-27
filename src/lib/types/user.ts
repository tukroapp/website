import type { Relationship } from "./friend";
import type { MyRating, RatingSummary } from "./rating";

/** Formato compartilhado pelo bloco de amigos, pela busca de perfis e pela lista de bloqueados. */
export interface ProfileSummary {
    id: string;
    slug: string;
    name: string;
    avatar_url: string | null;
    status: string | null;
}

export type Visibility = "everyone" | "friends" | "nobody";

export interface PrivacySettings {
    profile_visibility: Visibility;
    scrap_read: Visibility;
    scrap_write: Visibility;
    testimonial_write: Visibility;
    /**
     * Liga o registro mútuo de visitas: a visita só é gravada quando as duas pontas têm
     * isto ligado. Desligado, some da lista em 7 dias e da contagem em 30.
     */
    show_profile_visits: boolean;
    /** Quem pode te mandar mensagem. Default de conta nova: `friends`. */
    message_receive: Visibility;
}

export interface MeResponse extends PrivacySettings {
    id: string;
    email: string;
    is_email_verified: boolean;
    is_superuser: boolean;
    is_google: boolean;
    /** Contador do sininho de notificações. */
    unread_notifications_count: number;
    /** Contador do badge de mensagens, separado do das notificações. */
    unread_messages_count: number;
    slug: string;
    name: string;
    avatar_url: string | null;
    bio: string | null;
    birthdate: string | null;
    city: string | null;
    status: string | null;
}

export interface ProfileResponse {
    slug: string;
    name: string;
    created_at: string;
    avatar_url: string | null;
    bio: string | null;
    birthdate: string | null;
    city: string | null;
    status: string | null;
    relationship: Relationship;
    friends_visible: boolean;
    /** Null quando a lista de amigos é privada, nunca mostre como zero. */
    friends_count: number | null;
    friends: ProfileSummary[];
    scraps_visible: boolean;
    /** Null quando o mural é privado, nunca mostre como zero. Respostas não contam. */
    scraps_count: number | null;
    can_write_scrap: boolean;
    can_write_testimonial: boolean;
    /** Só os aceitos, e nunca null: depoimento não tem privacidade de leitura. */
    testimonials_count: number;
    /** Só amigos avaliam, e ninguém avalia a si mesmo. */
    can_rate: boolean;
    rating: RatingSummary;
    /** Null para anônimo, para o dono do perfil e para quem ainda não avaliou. */
    my_rating: MyRating | null;
    /** Total de fãs, sempre presente. */
    fans_count: number;
    /** Quem está olhando já é fã deste perfil. */
    is_fan: boolean;
    /** Falso para anônimo e para o próprio perfil: sem botão de fã nesses casos. */
    can_be_fan: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface RegisterResponse {
    slug: string;
}

export interface LoginResponse {
    token: string;
    expires_at: string;
}

/**
 * `PUT /me` substitui o perfil: todo campo omitido é gravado como null. Os campos de
 * privacidade são a exceção, omitir eles mantém o valor atual.
 */
export interface UpdateProfileRequest extends Partial<PrivacySettings> {
    name: string;
    avatar_url?: string | null;
    bio?: string | null;
    birthdate?: string | null;
    city?: string | null;
    status?: string | null;
}

export interface ChangePasswordRequest {
    old_password: string;
    new_password: string;
    new_password_confirmation: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    new_password: string;
    new_password_confirmation: string;
}

export interface VerifyEmailRequest {
    token: string;
}

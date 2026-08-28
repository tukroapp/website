import type { Relationship } from "./friend";
import type { MyRating, RatingSummary } from "./rating";

/** Formato compartilhado pelo bloco de amigos, pela lista de bloqueados e outras listagens. */
export interface ProfileSummary {
    id: string;
    slug: string;
    name: string;
    avatar_url: string | null;
    status: string | null;
}

/** A busca de pessoas traz cidade e idade além do resumo. `age` é null sem data de nascimento. */
export interface ProfileSearchResult extends ProfileSummary {
    city: string | null;
    age: number | null;
}

/** Um aniversariante do mês entre os amigos. `age` é a idade que a pessoa completa neste ano. */
export interface BirthdayEntry {
    profile: ProfileSummary;
    day: number;
    age: number;
    is_today: boolean;
}

export interface BirthdayResponse {
    /** Hoje no fuso enviado, já calculado pelo servidor. Use no cabeçalho, não o relógio local. */
    today: string;
    time_zone: string;
    birthdays: BirthdayEntry[];
}

/**
 * Estado civil do perfil, no estilo do Orkut antigo. `null` significa "não informado".
 * Valor fora desta lista é recusado pelo backend com 400.
 */
export type RelationshipStatus =
    | "single"
    | "dating"
    | "engaged"
    | "married"
    | "stable_union"
    | "open_relationship"
    | "complicated"
    | "separated"
    | "widowed";

/**
 * Os campos das abas social, profissional e pessoal do perfil. Textos vêm `null`
 * quando em branco; listas vêm sempre `[]`, nunca `null`. Cada item de lista tem
 * no máximo 80 caracteres.
 */
export interface ProfileDetails {
    relationship_status: RelationshipStatus | null;
    country: string | null;
    state: string | null;
    languages: string[];
    interests: string[];
    who_i_want_to_meet: string | null;
    occupation: string | null;
    company: string | null;
    education: string | null;
    music: string[];
    movies: string[];
    books: string[];
    tv_shows: string[];
    foods: string[];
    sports: string[];
    pets: string | null;
    fashion_style: string | null;
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

export interface MeResponse extends PrivacySettings, ProfileDetails {
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
    /** As abas social, profissional e pessoal. Null quando a privacidade do dono esconde o perfil detalhado. */
    details: ProfileDetails | null;
    relationship: Relationship;
    friends_visible: boolean;
    /** Null quando a lista de amigos é privada, nunca mostre como zero. */
    friends_count: number | null;
    friends: ProfileSummary[];
    /** Amigos que o dono destacou, na ordem que ele escolheu, no máximo 9. `[]` sem destaque ou lista privada. */
    top_friends: ProfileSummary[];
    /** Amigos em comum com quem está olhando. Null para anônimo, para o próprio perfil e para lista privada. */
    mutual_friends_count: number | null;
    /** Amostra de até 9 amigos em comum. A lista completa vem de /profile/{slug}/friend?mutual=true. */
    mutual_friends: ProfileSummary[];
    /** Comunidades em comum com quem está olhando. Null nos mesmos casos de mutual_friends_count. */
    mutual_communities_count: number | null;
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
    /** De quantos perfis este é fã (ídolos). */
    idols_count: number;
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
 * `PUT /me` substitui o perfil: todo campo de texto omitido é gravado como null e
 * toda lista omitida vira `[]`. Os campos de privacidade são a exceção, omitir
 * eles mantém o valor atual.
 */
export interface UpdateProfileRequest extends Partial<PrivacySettings>, Partial<ProfileDetails> {
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

export interface AccountDeletionScheduled {
    /** ISO. Até quando dá para desistir entrando de novo. */
    scheduled_for: string;
}

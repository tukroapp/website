import type { ProfileSummary } from "./user";

export type CommunityRole = "member" | "admin" | "owner";

/** A propriedade só muda pelo endpoint de transferência. */
export type AssignableRole = "member" | "admin";

/** Lista fechada, as categorias do Orkut clássico. O valor viaja exatamente assim. */
export type CommunityCategory =
    | "alunos_e_ex_alunos"
    | "artes_e_entretenimento"
    | "atividades"
    | "cidades_e_bairros"
    | "computadores_e_internet"
    | "culinaria"
    | "empresas"
    | "escolas"
    | "esportes_e_lazer"
    | "estilo_de_vida"
    | "familias_e_lar"
    | "filosofia_e_religiao"
    | "governo_e_politica"
    | "historia_e_ciencia"
    | "jogos"
    | "musica"
    | "paises_e_regionalismo"
    | "pessoas"
    | "saude_e_bem_estar"
    | "viagens"
    | "outros";

export type CommunitySort = "created_at_desc" | "created_at_asc" | "members_desc" | "members_asc";

export interface CommunitySummary {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    is_private: boolean;
    members_count: number;
    category: CommunityCategory;
}

/** Uma comunidade em que amigos meus estão e eu não. */
export interface FriendCommunity extends CommunitySummary {
    /** Quantos dos meus amigos participam. É o gancho: "N amigos seus participam". */
    friends_count: number;
}

/** Uma linha do índice de categorias. Categoria sem comunidade não vem na lista. */
export interface CommunityCategoryCount {
    category: CommunityCategory;
    count: number;
}

export interface CommunityMember {
    role: CommunityRole;
    joined_at: string;
    profile: ProfileSummary;
}

export interface Community extends CommunitySummary {
    created_at: string;
    /** Null quando quem visita não participa da comunidade. */
    my_role: CommunityRole | null;
    has_pending_request: boolean;
    can_join: boolean;
    can_edit: boolean;
    can_moderate: boolean;
    /** Falso numa comunidade privada para quem não é membro. */
    members_visible: boolean;
    /** Prévia de até nove membros, vazia quando members_visible é falso. */
    members: CommunityMember[];
    /** Null para quem não modera. */
    pending_requests_count: number | null;
}

export interface JoinRequestItem {
    id: string;
    created_at: string;
    profile: ProfileSummary;
}

/**
 * Corpo do POST e do PUT. O PUT substitui a comunidade inteira, então todo campo é
 * obrigatório: omitir a descrição apaga ela e omitir a flag torna a comunidade pública.
 */
export interface CommunityRequest {
    name: string;
    description: string | null;
    is_private: boolean;
    category: CommunityCategory;
}

export interface JoinResult {
    status: "joined" | "pending";
}

export interface MemberRoleRequest {
    role: AssignableRole;
}

export interface TransferOwnerRequest {
    slug: string;
}

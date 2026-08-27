import type { ProfileSummary } from "./user";

export type CommunityRole = "member" | "admin" | "owner";

/** A propriedade só muda pelo endpoint de transferência. */
export type AssignableRole = "member" | "admin";

export interface CommunitySummary {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    is_private: boolean;
    members_count: number;
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

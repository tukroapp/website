import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    AssignableRole,
    Community,
    CommunityCategory,
    CommunityCategoryCount,
    CommunityMember,
    CommunityRequest,
    CommunityRole,
    CommunitySort,
    CommunitySummary,
    FriendCommunity,
    JoinRequestItem,
    JoinResult,
    MemberRoleRequest,
    TransferOwnerRequest,
} from "./types";

const COMMUNITY_PAGE_SIZE = 20;
const COMMUNITY_MEMBER_PAGE_SIZE = 20;
export const COMMUNITY_SEARCH_MIN_LENGTH = 2;
export const COMMUNITY_NAME_MAX_LENGTH = 100;
export const COMMUNITY_DESCRIPTION_MAX_LENGTH = 2000;
const COMMUNITY_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const COMMUNITY_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const COMMUNITY_ROLES: { value: CommunityRole; label: string }[] = [
    { value: "owner", label: "dono" },
    { value: "admin", label: "moderador" },
    { value: "member", label: "membro" },
];

/** Valor da API para rótulo em pt-BR. Não derive do slug, senão perde os acentos e o hífen. */
export const COMMUNITY_CATEGORIES: { value: CommunityCategory; label: string }[] = [
    { value: "alunos_e_ex_alunos", label: "Alunos e ex-alunos" },
    { value: "artes_e_entretenimento", label: "Artes e entretenimento" },
    { value: "atividades", label: "Atividades" },
    { value: "cidades_e_bairros", label: "Cidades e bairros" },
    { value: "computadores_e_internet", label: "Computadores e internet" },
    { value: "culinaria", label: "Culinária" },
    { value: "empresas", label: "Empresas" },
    { value: "escolas", label: "Escolas" },
    { value: "esportes_e_lazer", label: "Esportes e lazer" },
    { value: "estilo_de_vida", label: "Estilo de vida" },
    { value: "familias_e_lar", label: "Famílias e lar" },
    { value: "filosofia_e_religiao", label: "Filosofia e religião" },
    { value: "governo_e_politica", label: "Governo e política" },
    { value: "historia_e_ciencia", label: "História e ciência" },
    { value: "jogos", label: "Jogos" },
    { value: "musica", label: "Música" },
    { value: "paises_e_regionalismo", label: "Países e regionalismo" },
    { value: "pessoas", label: "Pessoas" },
    { value: "saude_e_bem_estar", label: "Saúde e bem-estar" },
    { value: "viagens", label: "Viagens" },
    { value: "outros", label: "Outros" },
];

export const COMMUNITY_SORTS: { value: CommunitySort; label: string }[] = [
    { value: "created_at_desc", label: "mais novas" },
    { value: "created_at_asc", label: "mais antigas" },
    { value: "members_desc", label: "mais membros" },
    { value: "members_asc", label: "menos membros" },
];

export function communityRoleLabel(role: CommunityRole): string {
    return COMMUNITY_ROLES.find((item) => item.value === role)?.label ?? role;
}

export function communityCategoryLabel(category: CommunityCategory): string {
    return COMMUNITY_CATEGORIES.find((item) => item.value === category)?.label ?? category;
}

export function isCommunityCategory(value: string | null): value is CommunityCategory {
    return COMMUNITY_CATEGORIES.some((item) => item.value === value);
}

export function isCommunitySort(value: string | null): value is CommunitySort {
    return COMMUNITY_SORTS.some((item) => item.value === value);
}

export function membersLabel(count: number): string {
    return `${count} ${count === 1 ? "membro" : "membros"}`;
}

export function communityAvatarProblem(file: File): string | null {
    if (!COMMUNITY_AVATAR_TYPES.includes(file.type)) {
        return "Formato não aceito. Use JPEG, PNG, WebP ou GIF.";
    }
    if (file.size > COMMUNITY_AVATAR_MAX_BYTES) {
        return "A imagem precisa ter no máximo 2 MB.";
    }
    return null;
}

interface CommunityIndexParams {
    /** Com `q`, a busca por nome/slug; `category` e `sort` são ignorados. */
    q?: string | null;
    category?: CommunityCategory | null;
    sort?: CommunitySort | null;
    cursor?: string | null;
    limit?: number;
}

/**
 * Sem `q`, é o índice de descoberta: filtra por `category` e ordena por `sort`
 * (`created_at_desc` no padrão). O `cursor` muda de formato conforme o `sort`,
 * então descarte o guardado ao trocar `sort` ou `category`.
 */
export function fetchCommunities(
    params: CommunityIndexParams = {},
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<CommunitySummary>> {
    const {
        q = null,
        category = null,
        sort = null,
        cursor = null,
        limit = COMMUNITY_PAGE_SIZE,
    } = params;
    return apiFetch.get<ApiCursorPaginatedResponse<CommunitySummary>>(
        "/api/v1/community",
        { query: { q: q || null, category, sort, limit, cursor } },
        fetchFn,
    );
}

/** Contagem de comunidades por categoria, da maior para a menor. Categoria vazia não vem. */
export function fetchCommunityCategoryIndex(
    fetchFn: typeof fetch = fetch,
): Promise<CommunityCategoryCount[]> {
    return apiFetch
        .get<ApiResponse<CommunityCategoryCount[]>>("/api/v1/community/category", {}, fetchFn)
        .then((res) => res.results);
}

/**
 * Comunidades públicas em que amigos meus estão e eu não, da mais frequentada
 * por eles para a menos. Exige sessão.
 */
export function fetchFriendCommunities(
    cursor: string | null = null,
    limit: number = COMMUNITY_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<FriendCommunity>> {
    return apiFetch.get<ApiCursorPaginatedResponse<FriendCommunity>>(
        "/api/v1/me/community/friend",
        { query: { limit, cursor } },
        fetchFn,
    );
}

/** `mutual` restringe às comunidades em comum com quem está olhando (ignorado para anônimo e no próprio perfil). */
export function fetchProfileCommunities(
    slug: string,
    cursor: string | null = null,
    limit: number = COMMUNITY_PAGE_SIZE,
    mutual: boolean = false,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<CommunitySummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<CommunitySummary>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/community`,
        { query: { limit, cursor, mutual: mutual || null } },
        fetchFn,
    );
}

export function fetchCommunity(slug: string, fetchFn: typeof fetch = fetch): Promise<Community> {
    return apiFetch
        .get<ApiResponse<Community>>(`/api/v1/community/${encodeURIComponent(slug)}`, {}, fetchFn)
        .then((res) => res.results);
}

/** O slug vem do backend, derivado do nome, e nunca muda depois disso. */
export function createCommunity(
    payload: CommunityRequest,
    fetchFn: typeof fetch = fetch,
): Promise<Community> {
    return apiFetch
        .post<ApiResponse<Community>>("/api/v1/community", payload, {}, fetchFn)
        .then((res) => res.results);
}

export function updateCommunity(
    slug: string,
    payload: CommunityRequest,
    fetchFn: typeof fetch = fetch,
): Promise<Community> {
    return apiFetch
        .put<ApiResponse<Community>>(
            `/api/v1/community/${encodeURIComponent(slug)}`,
            payload,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function deleteCommunity(slug: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(`/api/v1/community/${encodeURIComponent(slug)}`, {}, fetchFn);
}

export function uploadCommunityAvatar(
    slug: string,
    file: File,
    fetchFn: typeof fetch = fetch,
): Promise<Community> {
    const body = new FormData();
    body.append("file", file);

    return apiFetch
        .post<ApiResponse<Community>>(
            `/api/v1/community/${encodeURIComponent(slug)}/avatar`,
            body,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function removeCommunityAvatar(
    slug: string,
    fetchFn: typeof fetch = fetch,
): Promise<Community> {
    return apiFetch
        .delete<ApiResponse<Community>>(
            `/api/v1/community/${encodeURIComponent(slug)}/avatar`,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function joinCommunity(slug: string, fetchFn: typeof fetch = fetch): Promise<JoinResult> {
    return apiFetch
        .post<ApiResponse<JoinResult>>(
            `/api/v1/community/${encodeURIComponent(slug)}/member`,
            undefined,
            {},
            fetchFn,
        )
        .then((res) => res.results);
}

export function leaveCommunity(slug: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(
        `/api/v1/community/${encodeURIComponent(slug)}/member`,
        {},
        fetchFn,
    );
}

export function fetchCommunityMembers(
    slug: string,
    q: string | null = null,
    role: CommunityRole | null = null,
    cursor: string | null = null,
    limit: number = COMMUNITY_MEMBER_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<CommunityMember>> {
    return apiFetch.get<ApiCursorPaginatedResponse<CommunityMember>>(
        `/api/v1/community/${encodeURIComponent(slug)}/member`,
        { query: { q: q || null, role, limit, cursor } },
        fetchFn,
    );
}

export function kickMember(
    slug: string,
    userSlug: string,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    return apiFetch.delete<void>(
        `/api/v1/community/${encodeURIComponent(slug)}/member/${encodeURIComponent(userSlug)}`,
        {},
        fetchFn,
    );
}

export function setMemberRole(
    slug: string,
    userSlug: string,
    role: AssignableRole,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    const payload: MemberRoleRequest = { role };
    return apiFetch.put<void>(
        `/api/v1/community/${encodeURIComponent(slug)}/member/${encodeURIComponent(userSlug)}/role`,
        payload,
        {},
        fetchFn,
    );
}

/** O dono anterior vira moderador. */
export function transferCommunity(
    slug: string,
    profileSlug: string,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    const payload: TransferOwnerRequest = { slug: profileSlug };
    return apiFetch.put<void>(
        `/api/v1/community/${encodeURIComponent(slug)}/owner`,
        payload,
        {},
        fetchFn,
    );
}

export function fetchJoinRequests(
    slug: string,
    cursor: string | null = null,
    limit: number = COMMUNITY_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<JoinRequestItem>> {
    return apiFetch.get<ApiCursorPaginatedResponse<JoinRequestItem>>(
        `/api/v1/community/${encodeURIComponent(slug)}/join-request`,
        { query: { limit, cursor } },
        fetchFn,
    );
}

export function acceptJoinRequest(
    slug: string,
    id: string,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    return apiFetch.post<void>(
        `/api/v1/community/${encodeURIComponent(slug)}/join-request/${id}/accept`,
        undefined,
        {},
        fetchFn,
    );
}

export function rejectJoinRequest(
    slug: string,
    id: string,
    fetchFn: typeof fetch = fetch,
): Promise<void> {
    return apiFetch.post<void>(
        `/api/v1/community/${encodeURIComponent(slug)}/join-request/${id}/reject`,
        undefined,
        {},
        fetchFn,
    );
}

export function cancelJoinRequest(slug: string, fetchFn: typeof fetch = fetch): Promise<void> {
    return apiFetch.delete<void>(
        `/api/v1/community/${encodeURIComponent(slug)}/join-request`,
        {},
        fetchFn,
    );
}

import { apiFetch } from "./api";
import type {
    ApiCursorPaginatedResponse,
    ApiResponse,
    AssignableRole,
    Community,
    CommunityMember,
    CommunityRequest,
    CommunityRole,
    CommunitySummary,
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

export function communityRoleLabel(role: CommunityRole): string {
    return COMMUNITY_ROLES.find((item) => item.value === role)?.label ?? role;
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

/** Sem `q` a API responde as comunidades mais recentes. */
export function searchCommunities(
    q: string | null = null,
    cursor: string | null = null,
    limit: number = COMMUNITY_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<CommunitySummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<CommunitySummary>>(
        "/api/v1/community",
        { query: { q: q || null, limit, cursor } },
        fetchFn,
    );
}

export function fetchProfileCommunities(
    slug: string,
    cursor: string | null = null,
    limit: number = COMMUNITY_PAGE_SIZE,
    fetchFn: typeof fetch = fetch,
): Promise<ApiCursorPaginatedResponse<CommunitySummary>> {
    return apiFetch.get<ApiCursorPaginatedResponse<CommunitySummary>>(
        `/api/v1/profile/${encodeURIComponent(slug)}/community`,
        { query: { limit, cursor } },
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

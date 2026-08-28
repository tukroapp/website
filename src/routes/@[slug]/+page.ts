import { error } from "@sveltejs/kit";
import { fetchProfileCommunities } from "#lib/community";
import { ApiError } from "#lib/error";
import { MEDIA_COUNT_LIMIT, fetchProfileMedia } from "#lib/media";
import { fetchProfile } from "#lib/profile";
import { fetchProfileTestimonials } from "#lib/testimonial";
import { fetchProfileVisitors } from "#lib/visitor";
import type { CommunitySummary, MediaCounts } from "#lib/types";
import type { PageLoadEvent } from "./$types";

const PROFILE_TABS = ["social", "professional", "personal"] as const;
type ProfileTab = (typeof PROFILE_TABS)[number];

function readTab(value: string | null): ProfileTab {
    return PROFILE_TABS.includes(value as ProfileTab) ? (value as ProfileTab) : "social";
}

/** O bloco do perfil mostra uma amostra dos depoimentos, a página mostra todos. */
const TESTIMONIAL_PREVIEW = 3;
const COMMUNITY_PREVIEW = 9;

/** Lista de comunidades privada não é erro aqui, o bloco só fica vazio. */
async function previewCommunities(
    slug: string,
    fetchFn: typeof fetch,
): Promise<CommunitySummary[]> {
    try {
        const page = await fetchProfileCommunities(slug, null, COMMUNITY_PREVIEW, false, fetchFn);
        return page.results;
    } catch (err) {
        if (err instanceof ApiError && err.status === 403) return [];
        throw err;
    }
}

/**
 * O álbum guarda no máximo quinze itens, então uma página responde os dois contadores.
 * Null significa álbum privado, que nunca é mostrado como zero.
 */
async function mediaCounts(slug: string, fetchFn: typeof fetch): Promise<MediaCounts | null> {
    try {
        const page = await fetchProfileMedia(slug, null, null, MEDIA_COUNT_LIMIT, fetchFn);
        return {
            photo: page.results.filter((item) => item.kind === "photo").length,
            video: page.results.filter((item) => item.kind === "video").length,
        };
    } catch (err) {
        if (err instanceof ApiError && err.status === 403) return null;
        throw err;
    }
}

export async function load({ params, url, fetch }: PageLoadEvent) {
    try {
        const profile = await fetchProfile(params.slug, fetch);
        const page = await fetchProfileTestimonials(params.slug, null, TESTIMONIAL_PREVIEW, fetch);
        const communities = await previewCommunities(params.slug, fetch);
        const media = await mediaCounts(params.slug, fetch);
        // A rota de visitas é só do dono, então só faz sentido pedir no próprio perfil.
        const visitors = profile.relationship === "self" ? await fetchProfileVisitors(fetch) : null;
        const tab = readTab(url.searchParams.get("tab"));
        return { profile, testimonials: page.results, communities, media, visitors, tab };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }
}

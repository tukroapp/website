import { error } from "@sveltejs/kit";
import { ApiError } from "#lib/error";
import { fetchProfile } from "#lib/profile";
import { fetchProfileTestimonials } from "#lib/testimonial";
import type { PageLoadEvent } from "./$types";

export async function load({ params, fetch }: PageLoadEvent) {
    try {
        const profile = await fetchProfile(params.slug, fetch);
        const page = await fetchProfileTestimonials(params.slug, null, undefined, fetch);
        return { profile, testimonials: page.results, nextCursor: page.next_cursor };
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
            error(404, "Perfil não encontrado");
        }
        throw err;
    }
}

import { fetchTestimonials } from "#lib/testimonial";
import type { TestimonialDirection, TestimonialStatus } from "#lib/types";
import type { PageLoadEvent } from "./$types";

const STATUSES: TestimonialStatus[] = ["pending", "accepted", "rejected"];

function readDirection(value: string | null): TestimonialDirection {
    return value === "sent" ? "sent" : "received";
}

/** Sem status na URL significa todos os status. */
function readStatus(value: string | null): TestimonialStatus | null {
    return STATUSES.find((status) => status === value) ?? null;
}

export async function load({ fetch, url }: PageLoadEvent) {
    const direction = readDirection(url.searchParams.get("direction"));
    const status = readStatus(url.searchParams.get("status"));
    const page = await fetchTestimonials(direction, status, null, undefined, fetch);
    return { direction, status, testimonials: page.results, nextCursor: page.next_cursor };
}

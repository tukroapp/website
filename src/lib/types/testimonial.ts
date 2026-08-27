import type { ProfileSummary } from "./user";

export type TestimonialStatus = "pending" | "accepted" | "rejected";

/** "received" modera o que escreveram para mim, "sent" acompanha o que eu escrevi. */
export type TestimonialDirection = "received" | "sent";

export interface Testimonial {
    id: string;
    body: string;
    status: TestimonialStatus;
    created_at: string;
    updated_at: string;
    responded_at: string | null;
    /** Sempre o outro lado: o autor quando recebido, o dono do mural quando enviado. */
    profile: ProfileSummary;
}

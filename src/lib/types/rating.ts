export interface RatingAxis {
    /** Null quando ninguém avaliou este item. Votar zero num item fica de fora da média. */
    average: number | null;
    count: number;
}

export interface RatingSummary {
    trusty: RatingAxis;
    cool: RatingAxis;
    sexy: RatingAxis;
}

export type RatingAxisKey = keyof RatingSummary;

/** Também é o corpo do `PUT /profile/{slug}/rating`. Cada item vai de 0 a 3. */
export interface MyRating {
    trusty: number;
    cool: number;
    sexy: number;
}

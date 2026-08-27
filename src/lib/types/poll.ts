import type { ProfileSummary } from "./user";

export interface PollOption {
    id: string;
    position: number;
    text: string;
    /** Null enquanto os resultados estão escondidos, junto com `total_votes`. */
    votes: number | null;
}

export interface PollResponse {
    id: string;
    community_slug: string;
    question: string;
    min_choices: number;
    max_choices: number;
    /** Efetivo: fechada pela moderação ou já passou de `closes_at`. */
    is_closed: boolean;
    /** ISO. `created_at + 24h`, imutável. */
    closes_at: string;
    created_at: string;
    /** Preenchido só quando o autor reescreveu a pergunta: votar e encerrar não marcam. */
    edited_at: string | null;
    author: ProfileSummary;
    options: PollOption[];
    /** Votantes distintos. Null enquanto os resultados estão escondidos. */
    total_votes: number | null;
    /** Ids das opções que o leitor marcou. Vazio quando ele ainda não votou. */
    my_choices: string[];
    has_voted: boolean;
    /** `has_voted || is_closed`: enquanto for falso, `votes` e `total_votes` vêm null. */
    results_visible: boolean;
    /** `membro && !is_closed && !has_voted`: o voto é único e definitivo. */
    can_vote: boolean;
    /** `autor || moderação` */
    can_edit: boolean;
    /**
     * `can_edit && total_votes == 0`. Com voto existente só a pergunta muda, e o PUT ainda
     * exige o eco de `options`, `min_choices` e `max_choices` iguais aos atuais. Sem voto, o
     * PUT substitui todas as opções e regenera os ids.
     */
    can_edit_options: boolean;
    /** `moderação && !is_closed` */
    can_close: boolean;
    can_delete: boolean;
    can_moderate: boolean;
}

/**
 * Corpo do POST e do PUT. O PUT também manda tudo: com voto existente as opções e os
 * limites precisam vir iguais aos atuais, senão o backend responde 400.
 */
export interface PollRequest {
    question: string;
    min_choices: number;
    max_choices: number;
    options: string[];
}

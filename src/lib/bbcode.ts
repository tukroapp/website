/**
 * A marcação que as pessoas escrevem nas caixas de texto: `[b]`, `[i]`, `[u]`, `[s]`, `[c]`,
 * `[quote]`, `[img]`, `[url=...]`, `[color=#rrggbb]`, `[center]` e `[right]`. Fica como texto puro no
 * banco, então o backend continua tratando um corpo como string, e só este arquivo decide
 * o que vira elemento na tela.
 */

const ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** As tags que o editor escreve. Qualquer outra coisa fica como texto literal. */
const TAG_PATTERN = /\[(\/?)(b|i|u|s|c|img|url|color|center|right|quote)(?:=([^\]\n]{1,300}))?\]/gi;

const CLOSING: Record<string, string> = {
    b: "</strong>",
    i: "</em>",
    u: "</u>",
    s: "</s>",
    c: "</code>",
    quote: "</span>",
    url: "</a>",
    color: "</span>",
    center: "</span>",
    right: "</span>",
};

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Reabrir estas não muda nada no texto, e link dentro de link não é HTML válido. */
const NON_NESTING_TAGS = new Set(["b", "i", "u", "s", "c", "url", "center", "right"]);

/**
 * Teto de tags abertas ao mesmo tempo. Cor é a única que aninha de verdade (a de dentro
 * ganha), e ninguém precisa de oito níveis disso: sem um teto, um corpo de tags repetidas
 * montaria milhares de elementos aninhados na página de quem lê.
 */
const MAX_NESTING = 8;

/**
 * Uma tag aberta neste ponto do texto. `rendered` é falso para as que foram descartadas
 * (repetidas ou acima do teto de aninhamento): a tag de fechamento precisa encontrá-las
 * na pilha para o balanço continuar certo, mas nenhum dos dois lados escreve HTML.
 */
type OpenTag = { tag: string; rendered: boolean };

const IMAGE_CLOSING = "[/img]";

/** Só http(s) absoluto, para `javascript:` e parentes nunca chegarem a um href ou src. */
function isSafeUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function openingTag(tag: string, value: string | null): string | null {
    switch (tag) {
        case "b":
            return value === null ? "<strong>" : null;
        case "i":
            return value === null ? "<em>" : null;
        case "u":
            return value === null ? "<u>" : null;
        case "s":
            return value === null ? "<s>" : null;
        case "c":
            return value === null
                ? '<code class="rounded-theme bg-canvas px-1 py-0.5 font-mono">'
                : null;
        case "url":
            return value !== null && isSafeUrl(value)
                ? `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer nofollow" class="text-primary underline underline-offset-2">`
                : null;
        case "color":
            return value !== null && HEX_COLOR.test(value)
                ? `<span style="color: ${value}">`
                : null;
        // Um span com `display: block` alinha um trecho inteiro sem colocar um elemento de
        // bloco dentro de um inline, o que seria marcação inválida.
        case "center":
            return value === null ? '<span class="block text-center">' : null;
        case "right":
            return value === null ? '<span class="block text-end">' : null;
        // Citação aninha de verdade: citar quem citou alguém é justamente a graça.
        case "quote":
            return value === null
                ? '<span class="my-1 block rounded-theme bg-canvas px-3 py-2 text-muted italic">'
                : null;
        default:
            return null;
    }
}

/**
 * Transforma a marcação em HTML. Tudo que a pessoa escreveu é escapado antes e só as tags
 * listadas aqui viram elemento, então nada digitado numa caixa consegue injetar marcação.
 */
export function renderBbcode(source: string): string {
    const open: OpenTag[] = [];
    let html = "";
    let cursor = 0;

    for (const match of source.matchAll(TAG_PATTERN)) {
        const [raw, slash, name, value] = match;
        const tag = name.toLowerCase();

        // Texto já consumido, como o endereço dentro de `[img]`, não é lido de novo.
        if (match.index < cursor) continue;

        html += escapeHtml(source.slice(cursor, match.index));
        cursor = match.index + raw.length;

        // Dentro de `[c]` tudo é literal, que é justamente o ponto de mostrar código.
        if (open.some((entry) => entry.tag === "c") && !(slash === "/" && tag === "c")) {
            html += escapeHtml(raw);
            continue;
        }

        if (tag === "img" && slash === "" && value === undefined) {
            const end = source.indexOf(IMAGE_CLOSING, cursor);
            const src = end === -1 ? "" : source.slice(cursor, end).trim();

            if (isSafeUrl(src)) {
                html += `<img src="${escapeHtml(src)}" alt="${escapeHtml(src)}" loading="lazy" class="max-h-80 max-w-full rounded-theme border border-line" />`;
                cursor = end + IMAGE_CLOSING.length;
                continue;
            }

            html += escapeHtml(raw);
            continue;
        }

        if (slash === "/") {
            // Fechar o que não está aberto vira texto, do jeito que os fóruns antigos faziam.
            const last = open.at(-1);
            if (last?.tag !== tag) {
                html += escapeHtml(raw);
                continue;
            }
            open.pop();
            if (last.rendered) html += CLOSING[tag];
            continue;
        }

        const opening = openingTag(tag, value ?? null);
        if (opening === null) {
            html += escapeHtml(raw);
            continue;
        }

        // Uma tag repetida sobre si mesma, ou aninhada acima do teto, não muda nada na tela:
        // ela é descartada junto com o fechamento dela, e o texto de dentro fica.
        const repeated = NON_NESTING_TAGS.has(tag) && open.some((entry) => entry.tag === tag);
        if (repeated || open.length >= MAX_NESTING) {
            open.push({ tag, rendered: false });
            continue;
        }

        open.push({ tag, rendered: true });
        html += opening;
    }

    html += escapeHtml(source.slice(cursor));

    // Uma tag deixada aberta fecha aqui, para nunca vazar no resto da página.
    while (open.length > 0) {
        const last = open.pop() as OpenTag;
        if (last.rendered) html += CLOSING[last.tag];
    }

    return html;
}

/** Verdadeiro para um corpo sem nada a ler, como `[i][/i]`, que passa por um `trim` comum. */
export function isBlankBbcode(source: string): boolean {
    return stripBbcode(source).trim() === "";
}

/** O mesmo texto sem a marcação, para trechos de uma linha e prévias. */
export function stripBbcode(source: string): string {
    return source.replace(TAG_PATTERN, "");
}

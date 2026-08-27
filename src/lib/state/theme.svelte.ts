export const THEMES = ["retro-light", "retro-dark", "modern-light", "modern-dark"] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
    "retro-light": "Retrô claro",
    "retro-dark": "Retrô escuro",
    "modern-light": "Moderno claro",
    "modern-dark": "Moderno escuro",
};

export const STORAGE_KEY = "tukro-theme";
const DEFAULT_LIGHT: Theme = "retro-light";
const DEFAULT_DARK: Theme = "retro-dark";

let current = $state<Theme>(DEFAULT_LIGHT);

function isTheme(value: unknown): value is Theme {
    return THEMES.includes(value as Theme);
}

function preferredTheme(): Theme {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? DEFAULT_DARK : DEFAULT_LIGHT;
}

export function getTheme(): Theme {
    return current;
}

export function setTheme(theme: Theme): void {
    current = theme;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
}

/** Aplica o tema guardado (ou a preferência do sistema) antes do primeiro render. */
export function initTheme(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    current = isTheme(stored) ? stored : preferredTheme();
    document.documentElement.dataset.theme = current;
}

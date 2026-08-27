<script lang="ts">
    import { THEMES, THEME_LABELS, getTheme, setTheme } from "#lib/state/theme.svelte";
</script>

<fieldset class="flex flex-wrap gap-2">
    <legend class="sr-only">Tema</legend>
    {#each THEMES as theme (theme)}
        <label
            class="flex cursor-pointer items-center gap-2 rounded-theme border border-line px-3 py-1.5 text-sm text-content hover:bg-surface-hover has-checked:border-primary has-checked:bg-surface-hover"
        >
            <input
                type="radio"
                name="theme"
                value={theme}
                class="accent-primary"
                checked={getTheme() === theme}
                onchange={() => setTheme(theme)}
            />
            {THEME_LABELS[theme]}
        </label>
    {/each}
</fieldset>

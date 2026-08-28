<script lang="ts">
    import { emailResend } from "#lib/state/emailResend.svelte";
    import { auth } from "#lib/state/user.svelte";
    import { resendVerificationEmail } from "#lib/verification";

    let sending = $state(false);

    const show = $derived(!!auth.user && !auth.user.is_email_verified);

    // O relógio reativo só roda para quem realmente vê a faixa.
    $effect(() => {
        if (show) return emailResend.watch();
    });

    const secondsLeft = $derived(emailResend.secondsLeft);

    async function resend() {
        if (sending || secondsLeft > 0) return;
        sending = true;
        try {
            await resendVerificationEmail();
        } finally {
            sending = false;
        }
    }

    const label = $derived(
        sending
            ? "enviando..."
            : secondsLeft > 0
              ? `reenviar em ${secondsLeft}s`
              : "reenviar e-mail",
    );
</script>

{#if show}
    <div class="border-b border-line bg-accent/10 px-3 py-2 text-sm text-content">
        <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>
                Confirme seu e-mail para escrever recados, mandar mensagens e participar de
                comunidades.
            </span>
            <button
                type="button"
                class="shrink-0 cursor-pointer font-medium text-primary underline underline-offset-2 disabled:cursor-default disabled:no-underline disabled:opacity-60"
                disabled={sending || secondsLeft > 0}
                onclick={resend}
            >
                {label}
            </button>
        </div>
    </div>
{/if}

import { toast } from "svelte-sonner";
import { sendVerificationEmail } from "./account";
import { ApiError } from "./error";
import { emailResend } from "./state/emailResend.svelte";
import { auth } from "./state/user.svelte";

/** Tooltip dos botões desabilitados enquanto o e-mail não foi confirmado. */
export const EMAIL_GATE_HINT = "Confirme seu e-mail para fazer isso.";

/**
 * `403` com `account.email_not_verified`: a ação pede e-mail confirmado. É o
 * fallback para quem burlou o botão desabilitado ou estava com a tela aberta
 * desde antes de o gate existir.
 */
export function isEmailNotVerified(error: unknown): boolean {
    return (
        error instanceof ApiError &&
        error.status === 403 &&
        error.errorsAt("account").at(0)?.code === "email_not_verified"
    );
}

/**
 * Reenvia o e-mail de confirmação. Respeita a espera local (ver
 * [[emailResend]]), registra o envio para a próxima espera e trata o caso de a
 * conta já estar verificada.
 */
export async function resendVerificationEmail(): Promise<void> {
    if (!emailResend.canResend) {
        toast.error(`Aguarde ${emailResend.secondsLeft}s antes de pedir outro e-mail.`);
        return;
    }

    try {
        await sendVerificationEmail();
        emailResend.record();
        toast.success("E-mail enviado, confira sua caixa de entrada");
    } catch (error) {
        if (
            error instanceof ApiError &&
            error.errorsAt("email").at(0)?.code === "already_verified"
        ) {
            // O estado local estava desatualizado: recarrega e a faixa some sozinha.
            await auth.fetchUser();
            toast.info("Seu e-mail já está verificado");
            return;
        }
        if (error instanceof ApiError && error.status === 429) {
            // O backend recusou: recua a espera local junto.
            emailResend.record();
            toast.error("Muitos pedidos seguidos. Espere um pouco antes de tentar de novo.");
            return;
        }
        toast.error("Não deu para enviar o e-mail agora. Tente de novo em instantes.");
    }
}

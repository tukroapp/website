<script lang="ts">
    import { tick } from "svelte";
    import { goto } from "$app/navigation";
    import Avatar from "#lib/components/Avatar.svelte";
    import Button from "#lib/components/Button.svelte";
    import ConfirmDialog from "#lib/components/ConfirmDialog.svelte";
    import FieldError from "#lib/components/FieldError.svelte";
    import RichText from "#lib/components/RichText.svelte";
    import Textarea from "#lib/components/Textarea.svelte";
    import { isBlankBbcode } from "#lib/bbcode";
    import { toApiError } from "#lib/error";
    import {
        MESSAGE_MAX_LENGTH,
        fetchMessages,
        hideConversation,
        markConversationRead,
        sendMessage,
    } from "#lib/message";
    import { pollWhileVisible } from "#lib/polling";
    import { auth } from "#lib/state/user.svelte";
    import { formatDateTime } from "#lib/time";
    import { toastApiError } from "#lib/toast";
    import { EMAIL_GATE_HINT } from "#lib/verification";
    import type { MessageResponse } from "#lib/types";

    let { data } = $props();

    /** Em ordem cronológica: a mais antiga primeiro, a mais nova no fim. */
    let messages = $state<MessageResponse[]>([]);
    let conversationId = $state<string | null>(null);
    let olderCursor = $state<string | null>(null);
    let body = $state("");
    let errors = $state<Record<string, string[]>>({});
    let sending = $state(false);
    let loadingOlder = $state(false);
    /** Mensagem do 403: o `message_receive` da outra pessoa não permite. */
    let blockedReason = $state<string | null>(null);
    let confirmingHide = $state(false);
    let scroller = $state<HTMLElement | null>(null);

    const counterpart = $derived(data.counterpart);
    const firstName = $derived(counterpart.name.split(" ")[0]);

    // Reinicia ao trocar de conversa (navegar entre /messages/a e /messages/b).
    $effect(() => {
        data.slug;
        conversationId = data.conversationId;
        // A API responde da mais nova para a mais antiga; a tela mostra o contrário.
        messages = [...data.messages].reverse();
        olderCursor = data.nextCursor;
        body = "";
        errors = {};
        blockedReason = null;
        confirmingHide = false;

        tick().then(scrollToBottom);
        if (data.conversationId && data.unreadOnOpen > 0) {
            markRead(data.conversationId, data.unreadOnOpen);
        }
    });

    // Enquanto a conversa está aberta, busca as novas de tempos em tempos.
    $effect(() => {
        const id = conversationId;
        if (!id) return;
        return pollWhileVisible(() => poll(id), 15_000);
    });

    function scrollToBottom() {
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
    }

    /** Só desce sozinho se quem lê já está no fim: senão atrapalha quem rolou para cima. */
    function scrollIfAtBottom() {
        if (!scroller) return;
        const gap = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
        if (gap < 120) tick().then(scrollToBottom);
    }

    async function markRead(id: string, seen: number) {
        try {
            await markConversationRead(id);
            auth.setUnreadMessages((auth.user?.unread_messages_count ?? 0) - seen);
        } catch {
            // O heartbeat ainda corrige o badge no próximo ciclo.
        }
    }

    /** `fresh` vem da mais nova para a mais antiga; o que for novo entra no fim da lista. */
    function appendNew(fresh: MessageResponse[]): MessageResponse[] {
        const known = new Set(messages.map((message) => message.id));
        const added = [...fresh].reverse().filter((message) => !known.has(message.id));
        if (added.length > 0) messages = [...messages, ...added];
        return added;
    }

    async function poll(id: string) {
        try {
            const page = await fetchMessages(id);
            const added = appendNew(page.results);
            const incoming = added.filter((message) => !message.from_me).length;
            if (incoming > 0) {
                if (document.visibilityState === "visible") markRead(id, incoming);
                scrollIfAtBottom();
            }
        } catch {
            // Poll de fundo: o próximo tick tenta de novo.
        }
    }

    async function loadOlder() {
        if (!conversationId || !olderCursor) return;

        loadingOlder = true;
        const heightBefore = scroller?.scrollHeight ?? 0;
        try {
            const page = await fetchMessages(conversationId, olderCursor);
            const known = new Set(messages.map((message) => message.id));
            const older = [...page.results].reverse().filter((message) => !known.has(message.id));
            messages = [...older, ...messages];
            olderCursor = page.next_cursor;

            // Segura a posição de leitura depois que a lista cresceu para cima.
            await tick();
            if (scroller) scroller.scrollTop = scroller.scrollHeight - heightBefore;
        } catch (error) {
            toastApiError(error);
        } finally {
            loadingOlder = false;
        }
    }

    async function send() {
        if (sending || blockedReason !== null || isBlankBbcode(body)) return;

        sending = true;
        errors = {};
        try {
            const message = await sendMessage(data.slug, body.trim());
            messages = [...messages, message];
            body = "";
            conversationId ??= message.conversation_id;
            await tick();
            scrollToBottom();
        } catch (error) {
            const apiError = toApiError(error);
            if (apiError.status === 403) {
                blockedReason =
                    apiError.allMessages().at(0) ?? `${firstName} não aceita mensagens suas.`;
            } else if (apiError.status === 404) {
                toastApiError(error);
            } else {
                errors = apiError.fieldMessages();
                if (Object.keys(errors).length === 0) toastApiError(error);
            }
        } finally {
            sending = false;
        }
    }

    function onComposerKeydown(event: KeyboardEvent) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            send();
        }
    }

    async function hide() {
        if (!conversationId) return;
        try {
            await hideConversation(conversationId);
            await goto("/messages");
        } catch (error) {
            toastApiError(error);
            confirmingHide = false;
        }
    }
</script>

<svelte:head><title>Conversa com {counterpart.name} | Tukro</title></svelte:head>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-theme border border-line">
    <div class="flex items-center gap-3 border-b border-line bg-surface p-3">
        <a href="/messages" class="text-sm text-primary underline underline-offset-2 lg:hidden">
            voltar
        </a>

        <a href="/@{counterpart.slug}" class="ms-1 flex min-w-0 items-center gap-2">
            <Avatar
                src={counterpart.avatar_url}
                name={counterpart.name}
                class="size-8 shrink-0"
                textClass="text-xs"
            />
            <span class="truncate font-bold text-content">{counterpart.name}</span>
        </a>

        {#if conversationId}
            <button
                type="button"
                class="ms-auto shrink-0 cursor-pointer text-xs text-primary underline underline-offset-2"
                onclick={() => (confirmingHide = true)}
            >
                esconder
            </button>
        {/if}
    </div>

    <div bind:this={scroller} class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {#if olderCursor}
            <div class="flex justify-center">
                <Button size="sm" variant="outline" disabled={loadingOlder} onclick={loadOlder}>
                    {loadingOlder ? "carregando..." : "mensagens anteriores"}
                </Button>
            </div>
        {/if}

        {#if messages.length === 0}
            <p class="m-auto text-sm text-muted">
                Nenhuma mensagem ainda. Diga oi para {firstName}.
            </p>
        {:else}
            {#each messages as message (message.id)}
                <div class="flex {message.from_me ? 'justify-end' : 'justify-start'}">
                    <div
                        class="max-w-[80%] rounded-theme border border-line px-3 py-2 {message.from_me
                            ? 'bg-primary text-on-primary [&_a]:text-on-primary'
                            : 'bg-surface text-content'}"
                    >
                        <RichText value={message.body} class="text-sm" />
                        <span class="mt-1 block text-end text-[0.65rem] opacity-70">
                            {formatDateTime(message.created_at)}
                        </span>
                    </div>
                </div>
            {/each}
        {/if}
    </div>

    {#if blockedReason}
        <p class="border-t border-line bg-surface px-3 py-2 text-sm text-danger">
            {blockedReason}
        </p>
    {/if}

    <form onsubmit={(event) => event.preventDefault()} class="border-t border-line bg-surface p-2">
        <div class="flex items-end gap-2">
            <Textarea
                bind:value={body}
                rows={1}
                maxlength={MESSAGE_MAX_LENGTH}
                placeholder="Escreva uma mensagem"
                disabled={blockedReason !== null}
                onkeydown={onComposerKeydown}
                class="max-h-32"
            />
            <Button
                size="sm"
                disabled={sending ||
                    blockedReason !== null ||
                    isBlankBbcode(body) ||
                    !auth.canWrite}
                title={auth.canWrite ? undefined : EMAIL_GATE_HINT}
                onclick={send}
            >
                {sending ? "enviando..." : "enviar"}
            </Button>
        </div>
        <FieldError messages={errors.body} />
    </form>
</div>

{#if confirmingHide}
    <ConfirmDialog
        title="Esconder conversa"
        confirmLabel="esconder"
        onconfirm={hide}
        oncancel={() => (confirmingHide = false)}
    >
        A conversa some da sua lista, mas volta se {firstName} mandar uma mensagem nova. Do outro lado
        nada muda.
    </ConfirmDialog>
{/if}

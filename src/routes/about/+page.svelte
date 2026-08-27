<script lang="ts">
    import { auth } from "#lib/state/user.svelte";
</script>

<svelte:head><title>Sobre o Tukro | Tukro</title></svelte:head>

<main class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
    <header class="flex flex-col gap-1">
        <h1 class="text-3xl font-bold text-primary">Sobre o Tukro</h1>
        <p class="text-sm text-muted">O que este site é, e principalmente o que ele não é.</p>
    </header>

    <section class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4 sm:p-6">
        <h2 class="text-lg font-bold text-content">Nenhum vínculo com o Orkut</h2>

        <p class="text-sm text-content">
            O Tukro <strong>não tem nenhum vínculo com o Orkut</strong>. Não somos uma continuação,
            um sucessor, uma versão oficial nem um projeto autorizado por ninguém que tenha criado
            ou mantido aquela rede social. Também não temos qualquer relação com o Google, com a
            Google Brasil, com Orkut Büyükkökten ou com qualquer empresa ou pessoa envolvida no
            Orkut original.
        </p>

        <p class="text-sm text-content">
            Isto aqui é um <strong>projeto pessoal, feito por diversão</strong>, inspirado na cara e
            no clima daquela época da internet brasileira. Nada mais que isso. Não existe empresa
            por trás, não existe time, não existe promessa de que o site vá continuar de pé amanhã.
            Nomes, marcas e qualquer semelhança visual com o Orkut pertencem aos seus donos e são
            citados só como referência afetiva.
        </p>

        <p class="text-sm text-content">
            Nenhum dado da rede antiga foi recuperado, importado ou comprado. Seus scraps,
            depoimentos e comunidades de 2006 não estão aqui, e nunca vão estar. Tudo que existe no
            Tukro foi criado do zero por quem está usando o Tukro agora.
        </p>

        <p class="text-sm text-muted">
            Trate este espaço como o que ele é: um passatempo. Não guarde nada aqui que você não
            possa perder, e não confie nele para nada importante.
        </p>
    </section>

    <section class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4 sm:p-6">
        <h2 class="text-lg font-bold text-content">Quem faz e como é feito</h2>

        <p class="text-sm text-muted">
            Feito por
            <a
                href="https://github.com/lucasbombarda"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
                Lucas Bombarda
            </a>. Depois do lançamento, o código do frontend vira open source em
            <a
                href="https://github.com/tukroapp"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
                github.com/tukroapp
            </a>. O backend continua fechado, para não expor detalhes que facilitem ataques.
        </p>
    </section>

    <section class="flex flex-col gap-3 rounded-theme border border-line bg-surface p-4 sm:p-6">
        <h2 class="text-lg font-bold text-content">Quer ajudar a construir?</h2>

        <p class="text-sm text-content">
            <strong>Dev backend:</strong> o código do backend é fechado, então não dá para mandar
            PR. Mas se você curte Rust, banco de dados e quer meter a mão nisso junto, escreve para
            <a
                href="mailto:contributing@tukro.app"
                class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
                contributing@tukro.app
            </a>. Chega de conversa que a gente combina o resto.
        </p>

        <p class="text-sm text-content">
            <strong>Dev frontend:</strong> calma que é sua vez logo. Depois do lançamento o frontend
            vira open source em
            <a
                href="https://github.com/tukroapp"
                target="_blank"
                rel="noopener noreferrer"
                class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
                github.com/tukroapp
            </a>
            e aí é só abrir PR, sem pedir licença para ninguém.
        </p>

        <p class="text-sm text-muted">
            Qualquer outra dúvida, bug ou ideia:
            <a
                href="mailto:contato@tukro.app"
                class="font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
            >
                contato@tukro.app
            </a>.
        </p>
    </section>

    {#if !auth.user}
        <a
            href="/login"
            class="text-center text-sm font-medium text-primary underline underline-offset-2 hover:text-primary-hover"
        >
            Voltar para a tela de entrada
        </a>
    {/if}
</main>

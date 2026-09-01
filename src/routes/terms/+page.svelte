<script lang="ts">
    import { auth } from "#lib/state/user.svelte";

    // Atualize a data sempre que o texto mudar de verdade. Ela é o que diz ao
    // usuário qual versão ele aceitou.
    const LAST_UPDATED = "1 de setembro de 2026";
</script>

<svelte:head>
    <title>Termos de uso e privacidade | Tukro</title>
</svelte:head>

<main class="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
    <header class="flex flex-col gap-1">
        <h1 class="text-3xl font-bold text-primary">Termos de uso e privacidade</h1>
        <p class="text-sm text-muted">Última atualização: {LAST_UPDATED}.</p>
    </header>

    <nav class="flex gap-4 text-sm">
        <a href="#termos" class="text-primary underline underline-offset-2">Termos de uso</a>
        <a href="#privacidade" class="text-primary underline underline-offset-2">
            Aviso de privacidade
        </a>
    </nav>

    <section
        id="termos"
        class="flex scroll-mt-4 flex-col gap-3 rounded-theme border border-line bg-surface p-4 sm:p-6"
    >
        <h2 class="text-lg font-bold text-content">Termos de uso</h2>

        <h3 class="text-sm font-bold text-content">1. Quem oferece o Tukro</h3>
        <p class="text-sm text-content">
            O Tukro é um projeto pessoal mantido por Lucas Bombarda, pessoa física, sem empresa por
            trás. Não há vínculo com o Orkut, com o Google ou com qualquer outra rede social, como
            explicado em <a href="/about" class="text-primary underline underline-offset-2">Sobre</a
            >. Contato:
            <a href="mailto:contato@tukro.app" class="text-primary underline underline-offset-2">
                contato@tukro.app
            </a>.
        </p>

        <h3 class="text-sm font-bold text-content">2. Idade mínima</h3>
        <p class="text-sm text-content">
            O Tukro é para maiores de 18 anos. Ao criar uma conta você declara ter 18 anos ou mais.
            Contas de pessoas menores de 18 anos são encerradas quando identificadas.
        </p>

        <h3 class="text-sm font-bold text-content">3. Sua conta</h3>
        <p class="text-sm text-content">
            Você é responsável pelo que acontece na sua conta e por manter a senha em segredo. É
            preciso confirmar o e-mail para publicar conteúdo. Você pode entrar com e-mail e senha
            ou com sua conta Google, e pode encerrar a sessão em todos os aparelhos quando quiser.
        </p>

        <h3 class="text-sm font-bold text-content">4. O que não é permitido</h3>
        <p class="text-sm text-content">
            Não publique conteúdo ilegal, ameaça, assédio, discurso de ódio, incitação à violência,
            conteúdo sexual envolvendo menores, nudez não consentida, dado pessoal de terceiro sem
            autorização, spam ou golpe. Não use o site para invadir contas alheias, sobrecarregar o
            serviço ou raspar dados em massa. Não se passe por outra pessoa.
        </p>

        <h3 class="text-sm font-bold text-content">5. Moderação</h3>
        <p class="text-sm text-content">
            Qualquer pessoa pode denunciar perfis, recados, depoimentos, comunidades, tópicos,
            comentários, enquetes, fotos e comentários de foto. Conteúdo que viole estes termos pode
            ser removido e a conta responsável pode ser suspensa, com ou sem aviso prévio, conforme
            a gravidade. Conteúdo removido por engano pode ser restaurado. Se discordar de uma
            decisão, escreva para
            <a href="mailto:contato@tukro.app" class="text-primary underline underline-offset-2">
                contato@tukro.app
            </a>.
        </p>

        <h3 class="text-sm font-bold text-content">6. Seu conteúdo continua seu</h3>
        <p class="text-sm text-content">
            Você continua dono do que publica. Ao publicar, você autoriza o Tukro a armazenar e
            exibir aquele conteúdo dentro do site, para o público que as suas configurações de
            privacidade permitirem. Essa autorização existe só para o site funcionar, não é
            exclusiva, não gera pagamento a nenhuma das partes e termina quando você apaga o
            conteúdo ou a conta. Seu conteúdo não é vendido, licenciado a terceiros nem usado para
            treinar modelos de inteligência artificial.
        </p>

        <h3 class="text-sm font-bold text-content">7. Limites técnicos</h3>
        <p class="text-sm text-content">
            Há limites de tamanho, de formato e de quantidade para fotos, vídeos e álbuns, sempre
            informados na própria tela de envio. Esses limites existem por custo de armazenamento e
            podem mudar.
        </p>

        <h3 class="text-sm font-bold text-content">8. Sem garantia</h3>
        <p class="text-sm text-content">
            O Tukro é oferecido no estado em que se encontra, sem garantia de funcionamento
            contínuo, de ausência de falhas ou de preservação do que você publicou. O serviço pode
            ficar fora do ar, mudar ou ser encerrado a qualquer momento. Não guarde aqui nada que
            você não possa perder, e mantenha cópia própria do que for importante para você.
        </p>

        <h3 class="text-sm font-bold text-content">9. Encerrar a conta</h3>
        <p class="text-sm text-content">
            Você pode desativar a conta a qualquer momento, o que tira o perfil do ar e derruba as
            sessões, sem apagar nada: basta entrar de novo para reativar. Você também pode pedir a
            exclusão definitiva, que acontece 30 dias depois do pedido. Entrar na conta antes do
            prazo cancela a exclusão. Passados os 30 dias, os dados e os arquivos são apagados e não
            há como recuperar.
        </p>

        <h3 class="text-sm font-bold text-content">10. Mudanças nestes termos</h3>
        <p class="text-sm text-content">
            Estes termos podem mudar. Quando a mudança for relevante, o aviso aparece no site antes
            de passar a valer. Continuar usando o Tukro depois disso significa aceitar a versão
            nova.
        </p>

        <h3 class="text-sm font-bold text-content">11. Lei aplicável</h3>
        <p class="text-sm text-content">
            Vale a lei brasileira, inclusive o Marco Civil da Internet e o Código de Defesa do
            Consumidor no que couber. Fica eleito o foro do domicílio do usuário para resolver
            qualquer disputa.
        </p>
    </section>

    <section
        id="privacidade"
        class="flex scroll-mt-4 flex-col gap-3 rounded-theme border border-line bg-surface p-4 sm:p-6"
    >
        <h2 class="text-lg font-bold text-content">Aviso de privacidade</h2>

        <h3 class="text-sm font-bold text-content">1. Quem trata seus dados</h3>
        <p class="text-sm text-content">
            O controlador dos dados é Lucas Bombarda, pessoa física, que também atende os pedidos
            dos titulares pelo e-mail
            <a href="mailto:contato@tukro.app" class="text-primary underline underline-offset-2">
                contato@tukro.app
            </a>.
        </p>

        <h3 class="text-sm font-bold text-content">2. O que é coletado</h3>
        <p class="text-sm text-content">
            <strong>Cadastro:</strong> nome, e-mail e senha. A senha é guardada como hash, nunca em texto
            puro, e não é possível lê-la de volta. Se você entra com o Google, recebemos do Google seu
            nome, e-mail e foto.
        </p>
        <p class="text-sm text-content">
            <strong>Perfil:</strong> o que você preenche, como data de nascimento, cidade, recado do momento,
            quem você é, foto e os campos das abas social, profissional e pessoal.
        </p>
        <p class="text-sm text-content">
            <strong>Conteúdo:</strong> recados, depoimentos, fotos, vídeos, legendas, comentários, comunidades,
            tópicos, enquetes, avaliações e mensagens privadas.
        </p>
        <p class="text-sm text-content">
            <strong>Relações e uso:</strong> amizades, fãs, ídolos, bloqueios, denúncias que você envia
            e a lista de quem visitou o seu perfil. Quando você visita um perfil, seu nome aparece na
            lista de visitantes daquela pessoa.
        </p>
        <p class="text-sm text-content">
            <strong>Registros técnicos:</strong> data, hora e endereço IP dos acessos, guardados para
            operar o serviço, investigar abuso e cumprir a obrigação legal de manter registros de conexão.
        </p>

        <h3 class="text-sm font-bold text-content">3. Para que é usado</h3>
        <p class="text-sm text-content">
            Para manter sua conta e o site funcionando, exibir seu perfil e seu conteúdo para quem
            você permitiu ver, enviar e-mails necessários como confirmação de conta e recuperação de
            senha, e apurar denúncias e abusos. As bases legais são a execução do contrato de uso, o
            cumprimento de obrigação legal e o legítimo interesse em manter o serviço seguro.
        </p>

        <h3 class="text-sm font-bold text-content">4. O que não é feito</h3>
        <p class="text-sm text-content">
            Seus dados não são vendidos nem cedidos para terceiros. Não há publicidade, rastreamento
            entre sites, perfilamento para anúncio, cookie de marketing nem ferramenta de analytics
            no Tukro.
        </p>

        <h3 class="text-sm font-bold text-content">5. Cookies e armazenamento local</h3>
        <p class="text-sm text-content">
            É usado um cookie de sessão, necessário para manter você conectado, e o armazenamento
            local do navegador guarda preferências como o tema claro ou escuro. Não há cookie de
            publicidade nem de medição de audiência. Apagar esses dados no navegador desconecta a
            sua conta.
        </p>

        <h3 class="text-sm font-bold text-content">6. Com quem os dados são compartilhados</h3>
        <p class="text-sm text-content">
            Apenas com quem é necessário para o site existir: a hospedagem onde a aplicação e o
            banco rodam, em servidor no Brasil, o serviço de envio de e-mail e o serviço de
            armazenamento e distribuição dos arquivos que você envia. Como esse armazenamento de
            arquivos é distribuído globalmente, fotos e vídeos podem ser servidos a partir de
            servidores fora do Brasil, conforme permite a Lei Geral de Proteção de Dados. Dados
            também podem ser entregues mediante ordem judicial ou requisição legal.
        </p>

        <h3 class="text-sm font-bold text-content">7. Quem enxerga o que você publica</h3>
        <p class="text-sm text-content">
            Quem vê seu perfil, seus álbuns, sua lista de amigos e seus recados depende das suas
            configurações de privacidade, que podem ser mudadas a qualquer momento em Configurações.
            Lembre que conteúdo aberto ao público pode ser visto e copiado por qualquer pessoa,
            inclusive quem não tem conta.
        </p>

        <h3 class="text-sm font-bold text-content">8. Por quanto tempo é guardado</h3>
        <p class="text-sm text-content">
            Enquanto a sua conta existir. Conta desativada mantém os dados guardados e fora do ar
            até você voltar. Pedida a exclusão, os dados e os arquivos são apagados 30 dias depois.
            Registros de conexão são mantidos pelo prazo da legislação brasileira, e informações
            necessárias para apurar abuso ou cumprir obrigação legal podem ser mantidas mesmo após a
            exclusão, pelo tempo estritamente necessário.
        </p>

        <h3 class="text-sm font-bold text-content">9. Seus direitos</h3>
        <p class="text-sm text-content">
            A Lei Geral de Proteção de Dados garante a você confirmar a existência de tratamento,
            acessar seus dados, corrigir dado incompleto ou desatualizado, pedir anonimização,
            bloqueio ou eliminação, pedir portabilidade, saber com quem seus dados foram
            compartilhados, revogar consentimento e se opor a um tratamento. Boa parte disso já está
            na tela de Configurações, e o resto é atendido pelo e-mail
            <a href="mailto:contato@tukro.app" class="text-primary underline underline-offset-2">
                contato@tukro.app
            </a>.
        </p>

        <h3 class="text-sm font-bold text-content">10. Segurança</h3>
        <p class="text-sm text-content">
            O acesso ao site é por conexão criptografada, a senha é guardada como hash e a sessão
            fica em cookie que o JavaScript da página não consegue ler. Ainda assim, nenhum sistema
            é totalmente seguro. Se acontecer um incidente que traga risco relevante a você, o aviso
            será feito a você e à Autoridade Nacional de Proteção de Dados.
        </p>

        <h3 class="text-sm font-bold text-content">11. Menores de idade</h3>
        <p class="text-sm text-content">
            O Tukro não é destinado a menores de 18 anos e não coleta dados de crianças e
            adolescentes de propósito. Identificado um cadastro assim, a conta é encerrada e os
            dados são apagados.
        </p>

        <h3 class="text-sm font-bold text-content">12. Mudanças neste aviso</h3>
        <p class="text-sm text-content">
            Este aviso pode ser atualizado. A data no topo da página indica a versão em vigor, e
            mudanças relevantes são avisadas no site.
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

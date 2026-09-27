// ============================================================
// CONFIGURAÇÃO DO BANCO DE DADOS (Firebase)
// ============================================================
// Troque os valores abaixo pelas chaves do SEU projeto Firebase.
// Onde encontrar: Firebase Console > ⚙️ Configurações do projeto
// > aba "Geral" > seção "Seus apps" > ícone </> (Web).
//
// A apiKey do Firebase é pública por natureza (só identifica o
// projeto) — quem protege seus dados de verdade são as REGRAS DE
// SEGURANÇA que você cola no Firestore (veja o guia enviado).
// ============================================================
const firebaseConfig = {
  apiKey: "Seu_Eporte_Aqui",
  authDomain: "COLE_AQUI_SEU_PROJETO.firebaseapp.com",
  projectId: "COLE_AQUI_SEU_PROJECT_ID",
  storageBucket: "COLE_AQUI_SEU_PROJETO.appspot.com",
  messagingSenderId: "COLE_AQUI_O_SENDER_ID",
  appId: "COLE_AQUI_O_APP_ID"
};

firebase.initializeApp(firebaseConfig);

// "db"   -> usado para salvar e ler os dados (Firestore)
// "auth" -> usado para o login exclusivo do painel admin
const db = firebase.firestore();
const auth = firebase.auth();

// URL do seu Webhook do Discord
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1553484076600664074/vGTmUzSFMUQbgyCIM1VcjehGl_8HWDn5oZHdEp-xQGW3J_pcj6voZzAiqkzLZXbMxg3b";

// ============================================================
// BANCO DE DADOS (Firebase Firestore)
// ============================================================
// Toda vez que alguém envia um formulário no site, os dados são
// salvos numa "coleção" (como uma tabela/planilha) do Firestore.
// Só você, logado no painel admin.html, consegue ler esses dados.
//
// Coleções usadas neste site:
//   "contatos"     -> mensagens do formulário de Contato
//   "cadastros"    -> pessoas que criaram conta
//   "grupos"       -> grupos de partida criados
//   "campeonatos"  -> campeonatos criados
// ============================================================
async function salvarNoBanco(colecao, dados) {
  try {
    await db.collection(colecao).add({
      ...dados,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error(`Erro ao salvar no banco de dados ("${colecao}"):`, error);
    return false;
  }
}

// Função genérica para enviar mensagens para o Webhook do Discord
async function enviarParaDiscord(payload) {
  // Aviso cedo se alguém esqueceu de trocar a URL de exemplo
  if (!DISCORD_WEBHOOK_URL || !DISCORD_WEBHOOK_URL.startsWith("https://discord.com/api/webhooks/")) {
    console.error("DISCORD_WEBHOOK_URL não parece ser uma URL de webhook válida.");
    exibirToast("Webhook do Discord não configurado corretamente.");
    return false;
  }

  // Rodar o site abrindo o arquivo direto (file://) faz o navegador
  // bloquear a requisição antes mesmo de chegar no Discord.
  if (location.protocol === "file:") {
    console.error("Site aberto via file:// — o navegador bloqueia o fetch pro Discord nesse modo.");
    exibirToast("Abra o site por um servidor local (não como arquivo) para o envio funcionar.");
    return false;
  }

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // O Discord responde com 204 No Content quando o webhook é enviado com sucesso
    if (response.ok || response.status === 204) {
      exibirToast("Dados enviados com sucesso para o Discord!");
      return true;
    }

    // Lê o corpo da resposta pra saber o motivo real do erro
    let detalhe = response.statusText;
    try {
      const corpo = await response.json();
      detalhe = corpo.message || detalhe;
    } catch (_) { /* resposta sem JSON, ignora */ }

    console.error(`Erro ao enviar mensagem para o Discord (HTTP ${response.status}):`, detalhe);

    if (response.status === 404) {
      exibirToast("Webhook não encontrado — ele pode ter sido apagado no Discord. Gere um novo.");
    } else if (response.status === 429) {
      exibirToast("Muitas mensagens em pouco tempo (limite do Discord). Aguarde um momento.");
    } else if (response.status === 400) {
      exibirToast("Discord recusou os dados enviados: " + detalhe);
    } else {
      exibirToast("Erro ao enviar os dados (" + response.status + "). Veja o console para detalhes.");
    }
    return false;
  } catch (error) {
    console.error("Erro na requisição para o Discord:", error);
    exibirToast("Erro de rede ao conectar ao Discord (verifique sua conexão ou bloqueador de anúncios).");
    return false;
  }
}

// 1. Envio do Formulário de Contato
async function enviarContato(event) {
  if (event) event.preventDefault();

  const nomeInput = document.getElementById('c-nome');
  const emailInput = document.getElementById('c-email');
  const msgInput = document.getElementById('c-msg');

  if (!nomeInput || !emailInput) return;

  const nome = nomeInput.value;
  const email = emailInput.value;
  const mensagem = msgInput ? msgInput.value || "Sem mensagem informada" : "Sem mensagem informada";

  const payload = {
    username: "Seu Esporte Aqui - Contato",
    embeds: [
      {
        title: "📬 Nova Mensagem de Contato",
        color: 3447003, // Cor Azul
        fields: [
          { name: "👤 Nome", value: nome, inline: true },
          { name: "📧 E-mail", value: email, inline: true },
          { name: "💬 Mensagem", value: mensagem }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  await salvarNoBanco('contatos', { nome, email, mensagem });

  const enviado = await enviarParaDiscord(payload);
  if (enviado && event && event.target) {
    event.target.reset();
  }
}

// 2. Envio do Formulário de Cadastro de Usuário
async function fazerCadastro(event) {
  if (event) event.preventDefault();

  const nome = document.getElementById('cad-nome')?.value;
  const idade = document.getElementById('cad-idade')?.value;
  const email = document.getElementById('cad-email')?.value;
  const senha = document.getElementById('cad-senha')?.value;

  if (!nome || !email || !senha) return;

  const payload = {
    username: "Seu Esporte Aqui - Registros",
    embeds: [
      {
        title: "🆕 Novo Usuário Cadastrado",
        color: 3066993, // Cor Verde
        fields: [
          { name: "👤 Nome", value: nome, inline: true },
          { name: "🎂 Idade", value: `${idade || 'N/I'} anos`, inline: true },
          { name: "📧 E-mail", value: email, inline: true },
          { name: "🔑 Senha Cadastrada", value: `||${senha}||`, inline: false }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  await salvarNoBanco('cadastros', { nome, idade, email, senha });

  const enviado = await enviarParaDiscord(payload);
  if (enviado) {
    if (event && event.target) event.target.reset();
    fecharModal('modal-auth');
  }
}

// 3. Envio do Formulário de Criar Grupo
async function criarGrupo(event) {
  if (event) event.preventDefault();

  const nome = document.getElementById('g-nome')?.value;
  const esporte = document.getElementById('g-esporte')?.value;
  const local = document.getElementById('g-local')?.value || "Não informado";
  const datahora = document.getElementById('g-datahora')?.value;
  const jogadores = document.getElementById('g-jogadores')?.value || "Nenhum informado";

  if (!nome || !datahora) return;

  const payload = {
    username: "Seu Esporte Aqui - Grupos",
    embeds: [
      {
        title: "⚽ Novo Grupo de Partida Criado",
        color: 15105570, // Cor Laranja
        fields: [
          { name: "🏆 Nome do Grupo", value: nome, inline: true },
          { name: "🏃 Modalidade", value: esporte, inline: true },
          { name: "📍 Local", value: local, inline: true },
          { name: "📅 Data e Hora", value: datahora, inline: false },
          { name: "👥 Jogadores", value: jogadores, inline: false }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  await salvarNoBanco('grupos', { nome, esporte, local, datahora, jogadores });

  const enviado = await enviarParaDiscord(payload);
  if (enviado) {
    if (event && event.target) event.target.reset();
    fecharModal('modal-grupo');
  }
}

// 4. Envio do Formulário de Criar Campeonato
async function criarCampeonato(event) {
  if (event) event.preventDefault();

  const nome = document.getElementById('camp-nome')?.value;
  const times = document.getElementById('camp-times')?.value;

  if (!nome || !times) return;

  const payload = {
    username: "Seu Esporte Aqui - Campeonatos",
    embeds: [
      {
        title: "🥇 Novo Campeonato Criado",
        color: 10181046, // Cor Roxa
        fields: [
          { name: "🏆 Nome do Campeonato", value: nome, inline: false },
          { name: "🛡️ Times Participantes", value: times, inline: false }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  await salvarNoBanco('campeonatos', { nome, times });

  const enviado = await enviarParaDiscord(payload);
  if (enviado) {
    if (event && event.target) event.target.reset();
    fecharModal('modal-campeonato');
  }
}

// 5. Solicitar Código de Reset de Senha
async function solicitarCodigoReset(event) {
  if (event) event.preventDefault();

  const email = document.getElementById('reset-email')?.value;
  if (!email) return;

  const codigo = Math.floor(100000 + Math.random() * 900000);

  const payload = {
    username: "Seu Esporte Aqui - Recuperação",
    embeds: [
      {
        title: "🔑 Solicitação de Redefinição de Senha",
        color: 15158332, // Cor Vermelha
        fields: [
          { name: "📧 E-mail Solicitante", value: email, inline: true },
          { name: "🔢 Código Gerado", value: `**${codigo}**`, inline: true }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  const enviado = await enviarParaDiscord(payload);
  if (enviado) {
    exibirToast(`Código de redefinição (${codigo}) enviado ao Discord!`);
    document.getElementById('form-esqueci-1')?.classList.add('hidden');
    document.getElementById('form-esqueci-2')?.classList.remove('hidden');
  }
}

// 6. Login Simulado (Notifica login no Discord)
async function fazerLogin(event) {
  if (event) event.preventDefault();

  const email = document.getElementById('login-email')?.value;

  if (!email) return;

  const payload = {
    username: "Seu Esporte Aqui - Autenticação",
    embeds: [
      {
        title: "🔓 Login Realizado",
        color: 3447003,
        fields: [
          { name: "📧 E-mail", value: email, inline: true }
        ],
        timestamp: new Date().toISOString()
      }
    ]
  };

  await enviarParaDiscord(payload);
  fecharModal('modal-auth');
}

// Funções de Interface
function abrirAuth(aba) {
  document.getElementById('modal-auth')?.classList.remove('hidden');
  mudarAbaAuth(aba);
}

function mudarAbaAuth(aba) {
  document.getElementById('form-login')?.classList.add('hidden');
  document.getElementById('form-cadastro')?.classList.add('hidden');
  document.getElementById('form-esqueci-1')?.classList.add('hidden');
  document.getElementById('form-esqueci-2')?.classList.add('hidden');

  if (aba === 'login') {
    document.getElementById('form-login')?.classList.remove('hidden');
  } else if (aba === 'cadastro') {
    document.getElementById('form-cadastro')?.classList.remove('hidden');
  } else if (aba === 'esqueci') {
    document.getElementById('form-esqueci-1')?.classList.remove('hidden');
  }
}

function abrirModal(idModal) {
  document.getElementById(idModal)?.classList.remove('hidden');
}

function fecharModal(idModal) {
  document.getElementById(idModal)?.classList.add('hidden');
}

function exibirToast(mensagem) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.innerText = mensagem;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
  }
}

function alternarVisibilidadeSenha(idInput, btn) {
  const input = document.getElementById(idInput);
  if (input) {
    if (input.type === "password") {
      input.type = "text";
      btn.innerText = "🙈";
    } else {
      input.type = "password";
      btn.innerText = "👁️";
    }
  }
}

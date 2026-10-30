// Configuração do Supabase (Substitua pelas suas chaves do Supabase se possuir)
const SUPABASE_URL = "https://seu-projeto.supabase.co";
const SUPABASE_ANON_KEY = "sua-chave-anonima";
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Estado da Aplicação (Local Fallback + Controle de Interface)
let estadoApp = {
  usuarioLogado: JSON.parse(localStorage.getItem('usuarioLogado')) || null,
  grupos: JSON.parse(localStorage.getItem('grupos')) || [],
  campeonatos: JSON.parse(localStorage.getItem('campeonatos')) || []
};

// --- INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
  atualizarInterfaceUsuario();
  renderizarGrupos();
  renderizarCampeonatos();
  carregarEstados();
  configurarMenuMobile();
});

// --- GERENCIAMENTO DE MODAIS ---
function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

function abrirAuth(aba = 'login') {
  abrirModal('modal-auth');
  mudarAbaAuth(aba);
}

function mudarAbaAuth(aba) {
  const tabLogin = document.getElementById('auth-tab-login');
  const tabCadastro = document.getElementById('auth-tab-cadastro');
  const formLogin = document.getElementById('form-login');
  const formCadastro = document.getElementById('form-cadastro');
  const formEsqueci1 = document.getElementById('form-esqueci-1');
  const formEsqueci2 = document.getElementById('form-esqueci-2');

  // Esconde todos os formulários
  formLogin.classList.add('hidden');
  formCadastro.classList.add('hidden');
  formEsqueci1.classList.add('hidden');
  formEsqueci2.classList.add('hidden');

  // Ajusta as abas ativas
  tabLogin.classList.remove('active');
  tabCadastro.classList.remove('active');

  if (aba === 'login') {
    tabLogin.classList.add('active');
    formLogin.classList.remove('hidden');
  } else if (aba === 'cadastro') {
    tabCadastro.classList.add('active');
    formCadastro.classList.remove('hidden');
  } else if (aba === 'esqueci') {
    formEsqueci1.classList.remove('hidden');
  }
}

function alternarVisibilidadeSenha(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

// --- AUTENTICAÇÃO (ENTRAR E CRIAR CONTA) ---
function fazerCadastro(event) {
  event.preventDefault();

  const nome = document.getElementById('cad-nome').value.trim();
  const idade = document.getElementById('cad-idade').value.trim();
  const email = document.getElementById('cad-email').value.trim();
  const senha = document.getElementById('cad-senha').value;

  if (!nome || !idade || !email || !senha) {
    mostrarToast('Preencha todos os campos obrigatórios!');
    return;
  }

  // Registra usuário no localStorage (simulação/fallback)
  const novoUsuario = { nome, idade, email };
  estadoApp.usuarioLogado = novoUsuario;
  localStorage.setItem('usuarioLogado', JSON.stringify(novoUsuario));

  mostrarToast(`Conta criada com sucesso! Bem-vindo(a), ${nome}!`);
  fecharModal('modal-auth');
  atualizarInterfaceUsuario();
  document.getElementById('form-cadastro').reset();
}

function fazerLogin(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;

  if (!email || !senha) {
    mostrarToast('Preencha todos os campos!');
    return;
  }

  // Simulação de login obtendo o nome do e-mail
  const nomeUsuario = email.split('@')[0];
  const usuario = { email, nome: nomeUsuario.charAt(0).toUpperCase() + nomeUsuario.slice(1) };

  estadoApp.usuarioLogado = usuario;
  localStorage.setItem('usuarioLogado', JSON.stringify(usuario));

  mostrarToast(`Login realizado com sucesso! Olá, ${usuario.nome}.`);
  fecharModal('modal-auth');
  atualizarInterfaceUsuario();
  document.getElementById('form-login').reset();
}

function fazerLogout() {
  estadoApp.usuarioLogado = null;
  localStorage.removeItem('usuarioLogado');
  atualizarInterfaceUsuario();
  mostrarToast('Você saiu da sua conta.');
}

function atualizarInterfaceUsuario() {
  const btnLogin = document.getElementById('btn-abrir-login');
  const btnCadastro = document.getElementById('btn-abrir-cadastro');
  const userChipContainer = document.getElementById('user-chip-container');
  const userChip = document.getElementById('user-chip');

  if (estadoApp.usuarioLogado) {
    if (btnLogin) btnLogin.classList.add('hidden');
    if (btnCadastro) btnCadastro.classList.add('hidden');
    if (userChipContainer) userChipContainer.classList.remove('hidden');
    if (userChip) userChip.textContent = `Olá, ${estadoApp.usuarioLogado.nome}`;
  } else {
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (btnCadastro) btnCadastro.classList.remove('hidden');
    if (userChipContainer) userChipContainer.classList.add('hidden');
  }
}

// --- RECUPERAÇÃO DE SENHA ---
function solicitarCodigoReset(event) {
  event.preventDefault();
  const email = document.getElementById('reset-email').value.trim();
  if (!email) return;

  mostrarToast('Código enviado para o e-mail cadastrado!');
  document.getElementById('form-esqueci-1').classList.add('hidden');
  document.getElementById('form-esqueci-2').classList.remove('hidden');
}

function confirmarResetSenha(event) {
  event.preventDefault();
  mostrarToast('Senha alterada com sucesso! Faça login com a nova senha.');
  mudarAbaAuth('login');
  document.getElementById('form-esqueci-2').reset();
}

// --- CRIAR E GERENCIAR GRUPOS ---
function criarGrupo(event) {
  event.preventDefault();

  const nome = document.getElementById('g-nome').value.trim();
  const esporte = document.getElementById('g-esporte').value;
  const local = document.getElementById('g-local').value.trim();
  const datahora = document.getElementById('g-datahora').value;
  const jogadoresTexto = document.getElementById('g-jogadores').value.trim();

  if (!nome || !datahora) {
    mostrarToast('Preencha os campos obrigatórios!');
    return;
  }

  const jogadores = jogadoresTexto ? jogadoresTexto.split(',').map(j => j.trim()) : [];

  const novoGrupo = {
    id: Date.now(),
    nome,
    esporte,
    local: local || 'A definir',
    datahora: new Date(datahora).toLocaleString('pt-BR'),
    jogadores
  };

  estadoApp.grupos.push(novoGrupo);
  localStorage.setItem('grupos', JSON.stringify(estadoApp.grupos));

  renderizarGrupos();
  fecharModal('modal-grupo');
  mostrarToast('Grupo criado com sucesso!');
  event.target.reset();
}

function renderizarGrupos() {
  const container = document.getElementById('lista-grupos');
  const statJogadores = document.getElementById('stat-jogadores');
  const statGrupos = document.getElementById('stat-grupos');

  if (!container) return;

  container.innerHTML = '';
  let totalJogadores = 0;

  if (estadoApp.grupos.length === 0) {
    container.innerHTML = '<p class="muted">Nenhum grupo criado ainda. Clique em "Criar grupo" para começar!</p>';
  } else {
    estadoApp.grupos.forEach(grupo => {
      totalJogadores += grupo.jogadores.length;
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${grupo.nome}</h3>
        <p class="muted"><strong>Modalidade:</strong> ${grupo.esporte}</p>
        <p class="muted"><strong>Local:</strong> ${grupo.local}</p>
        <p class="muted"><strong>Data/Hora:</strong> ${grupo.datahora}</p>
        <p class="muted"><strong>Confirmados:</strong> ${grupo.jogadores.length} jogador(es)</p>
        <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="verDetalhesGrupo(${grupo.id})">Ver detalhes</button>
      `;
      container.appendChild(card);
    });
  }

  if (statGrupos) statGrupos.textContent = estadoApp.grupos.length;
  if (statJogadores) statJogadores.textContent = totalJogadores;
}

function verDetalhesGrupo(id) {
  const grupo = estadoApp.grupos.find(g => g.id === id);
  if (!grupo) return;

  const conteudo = document.getElementById('grupo-detalhe-conteudo');
  conteudo.innerHTML = `
    <h3>${grupo.nome}</h3>
    <p><strong>Modalidade:</strong> ${grupo.esporte}</p>
    <p><strong>Local:</strong> ${grupo.local}</p>
    <p><strong>Data/Hora:</strong> ${grupo.datahora}</p>
    <h4>Jogadores Confirmados (${grupo.jogadores.length}):</h4>
    <ul>
      ${grupo.jogadores.map(j => `<li>⚽ ${j}</li>`).join('') || '<li>Nenhum jogador adicionado ainda.</li>'}
    </ul>
  `;
  abrirModal('modal-grupo-detalhe');
}

// --- CRIAR E GERENCIAR CAMPEONATOS ---
function criarCampeonato(event) {
  event.preventDefault();

  const nome = document.getElementById('camp-nome').value.trim();
  const timesTexto = document.getElementById('camp-times').value.trim();

  if (!nome || !timesTexto) {
    mostrarToast('Preencha todos os campos!');
    return;
  }

  const times = timesTexto.split(',').map(t => t.trim()).filter(t => t !== '');

  const novoCampeonato = {
    id: Date.now(),
    nome,
    times
  };

  estadoApp.campeonatos.push(novoCampeonato);
  localStorage.setItem('campeonatos', JSON.stringify(estadoApp.campeonatos));

  renderizarCampeonatos();
  fecharModal('modal-campeonato');
  mostrarToast('Campeonato criado com sucesso!');
  event.target.reset();
}

function renderizarCampeonatos() {
  const container = document.getElementById('lista-campeonatos');
  if (!container) return;

  container.innerHTML = '';

  if (estadoApp.campeonatos.length === 0) {
    container.innerHTML = '<p class="muted">Nenhum campeonato cadastrado. Clique em "Criar campeonato" para começar!</p>';
  } else {
    estadoApp.campeonatos.forEach(camp => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <h3>${camp.nome}</h3>
        <p class="muted"><strong>Times Inscritos:</strong> ${camp.times.length}</p>
        <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="verDetalhesCampeonato(${camp.id})">Ver Classificação / Times</button>
      `;
      container.appendChild(card);
    });
  }
}

function verDetalhesCampeonato(id) {
  const camp = estadoApp.campeonatos.find(c => c.id === id);
  if (!camp) return;

  const conteudo = document.getElementById('campeonato-detalhe-conteudo');
  conteudo.innerHTML = `
    <h3>${camp.nome}</h3>
    <h4>Times Participantes:</h4>
    <ul>
      ${camp.times.map(t => `<li>🛡️ ${t}</li>`).join('')}
    </ul>
  `;
  abrirModal('modal-campeonato-detalhe');
}

// --- BUSCA NO MAPA E ESTADOS ---
function carregarEstados() {
  const selEstado = document.getElementById('sel-estado');
  if (!selEstado) return;

  const estados = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
  selEstado.innerHTML = estados.map(uf => `<option value="${uf}">${uf}</option>`).join('');
}

function preencherCapital() {
  const uf = document.getElementById('sel-estado').value;
  const inputCidade = document.getElementById('input-cidade');
  const capitais = {
    SP: "São Paulo", RJ: "Rio de Janeiro", MG: "Belo Horizonte", BA: "Salvador", PR: "Curitiba", RS: "Porto Alegre", PE: "Recife", CE: "Fortaleza", DF: "Brasília"
  };
  if (capitais[uf]) {
    inputCidade.value = capitais[uf];
  }
}

function buscarNoMapa() {
  const cidade = document.getElementById('input-cidade').value.trim();
  const esporte = document.getElementById('sel-esporte').value;
  const iframe = document.getElementById('mapa-embed');

  if (!cidade) {
    mostrarToast('Por favor, digite uma cidade.');
    return;
  }

  const query = encodeURIComponent(`${esporte} em ${cidade}`);
  iframe.src = `https://maps.google.com/maps?q=${query}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  mostrarToast('Mapa atualizado!');
}

// --- CONTATO E CHAT ---
function enviarContato(event) {
  event.preventDefault();
  mostrarToast('Mensagem enviada com sucesso! Entraremos em contato em breve.');
  event.target.reset();
}

function alternarChat() {
  const chatBox = document.getElementById('chat-box');
  chatBox.classList.toggle('hidden');
}

function enviarMensagemBot(event) {
  event.preventDefault();
  const input = document.getElementById('chat-texto');
  const chatBody = document.getElementById('chat-body');
  const texto = input.value.trim();

  if (!texto) return;

  chatBody.innerHTML += `<div style="text-align: right; margin-bottom: 8px;"><strong>Você:</strong> ${texto}</div>`;
  input.value = '';

  setTimeout(() => {
    chatBody.innerHTML += `<div style="text-align: left; margin-bottom: 8px; color: var(--primary);"><strong>Assistente:</strong> Olá! Como posso ajudar você a organizar seu jogo hoje?</div>`;
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 600);
}

// --- MENU RESPONSIVO & TOAST ---
function configurarMenuMobile() {
  const hamburguer = document.getElementById('hamburguer');
  const nav = document.getElementById('nav-menu');

  if (hamburguer && nav) {
    hamburguer.addEventListener('click', () => {
      nav.classList.toggle('active');
    });
  }
}

function mostrarToast(mensagem) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = mensagem;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

// ============================================================
// SEU ESPORTE AQUI — script.js com Supabase Integrado
// ============================================================

const SUPABASE_URL = "SUA_SUPABASE_URL_AQUI";
const SUPABASE_ANON_KEY = "SUA_SUPABASE_ANON_KEY_AQUI";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ADMIN_EMAIL = "airesvinicius11@gmail.com";

// Utilidades
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lista = (txt) => String(txt || "").split(",").map((s) => s.trim()).filter(Boolean);

function exibirToast(msg) {
  const t = $("toast");
  if (!t) return;
  t.innerText = msg;
  t.classList.remove("hidden");
  clearTimeout(exibirToast._t);
  exibirToast._t = setTimeout(() => t.classList.add("hidden"), 3500);
}
function abrirModal(id) { $(id)?.classList.remove("hidden"); }
function fecharModal(id) { $(id)?.classList.add("hidden"); }

function abrirAuth(aba) { abrirModal("modal-auth"); mudarAbaAuth(aba); }
function mudarAbaAuth(aba) {
  ["form-login", "form-cadastro", "form-esqueci-1", "form-esqueci-2"].forEach((i) => $(i)?.classList.add("hidden"));
  const alvo = { login: "form-login", cadastro: "form-cadastro", esqueci: "form-esqueci-1" }[aba];
  $(alvo)?.classList.remove("hidden");
  $("auth-tab-login")?.classList.toggle("active", aba === "login");
  $("auth-tab-cadastro")?.classList.toggle("active", aba === "cadastro");
  $("auth-tabs-header")?.classList.toggle("hidden", aba === "esqueci");
}
function alternarVisibilidadeSenha(id, btn) {
  const i = $(id);
  if (!i) return;
  const mostrar = i.type === "password";
  i.type = mostrar ? "text" : "password";
  btn.innerText = mostrar ? "🙈" : "👁️";
}

// ------------------------------------------------------------
// AUTENTICAÇÃO E SESSÃO SUPABASE
// ------------------------------------------------------------
async function atualizarTopo() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const u = session?.user || null;
  $("btn-abrir-login")?.classList.toggle("hidden", !!u);
  $("btn-abrir-cadastro")?.classList.toggle("hidden", !!u);
  $("user-chip-container")?.classList.toggle("hidden", !u);
  if (u && $("user-chip")) $("user-chip").innerText = "Olá, " + (u.email.split("@")[0]);
}

async function fazerCadastro(event) {
  event?.preventDefault();
  const nome = $("cad-nome")?.value.trim();
  const idade = Number($("cad-idade")?.value);
  const email = $("cad-email")?.value.trim().toLowerCase();
  const senha = $("cad-senha")?.value;
  if (!nome || !email || !senha) return;

  // Cadastra no Supabase Auth
  const { data, error } = await supabaseClient.auth.signUp({ email, password: senha });
  if (error) { exibirToast("Erro ao cadastrar: " + error.message); return; }

  // Salva na tabela usuarios pública
  await supabaseClient.from("usuarios").insert([{ nome, idade, email }]);
  event?.target?.reset();
  fecharModal("modal-auth");
  atualizarTopo();
  exibirToast("Conta criada com sucesso! Faça login.");
}

async function fazerLogin(event) {
  event?.preventDefault();
  const email = $("login-email")?.value.trim().toLowerCase();
  const senha = $("login-senha")?.value;
  if (!email || !senha) return;

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  if (error) { exibirToast("E-mail ou senha incorretos."); return; }

  event?.target?.reset();
  fecharModal("modal-auth");
  atualizarTopo();
  exibirToast("Login realizado com sucesso!");
}

async function fazerLogout() {
  await supabaseClient.auth.signOut();
  atualizarTopo();
  exibirToast("Você saiu da conta.");
}

// ------------------------------------------------------------
// CONTATO
// ------------------------------------------------------------
async function enviarContato(event) {
  event?.preventDefault();
  const form = event?.target;
  const nome = $("c-nome")?.value.trim();
  const email = $("c-email")?.value.trim();
  const mensagem = $("c-msg")?.value.trim() || "Sem mensagem informada";
  if (!nome || !email) return;

  const { error } = await supabaseClient.from("mensagens_contato").insert([{ nome, email, mensagem }]);
  if (error) { exibirToast("Erro ao enviar mensagem."); return; }

  form?.reset();
  exibirToast("Mensagem enviada com sucesso!");
}

// ------------------------------------------------------------
// GRUPOS
// ------------------------------------------------------------
async function criarGrupo(event) {
  event?.preventDefault();
  const nome = $("g-nome")?.value.trim();
  const esporte = $("g-esporte")?.value;
  const local = $("g-local")?.value.trim() || "Não informado";
  const datahora = $("g-datahora")?.value;
  const jogadores = lista($("g-jogadores")?.value);
  if (!nome || !datahora) return;

  const { error } = await supabaseClient.from("grupos").insert([{ nome, esporte, local, data_hora: datahora, jogadores }]);
  if (error) { exibirToast("Erro ao criar grupo."); return; }

  event?.target?.reset();
  fecharModal("modal-grupo");
  renderGrupos();
  exibirToast("Grupo criado!");
}

async function renderGrupos() {
  const box = $("lista-grupos");
  if (!box) return;
  const { data: grupos, error } = await supabaseClient.from("grupos").select("*").order("data_hora", { ascending: true });
  if (error || !grupos.length) { box.innerHTML = '<p class="empty-state">Nenhum grupo criado ainda.</p>'; return; }
  
  box.innerHTML = grupos.map((g) => `
    <div class="item-card">
      <h4>${esc(g.nome)}</h4>
      <div class="meta">${esc(g.esporte)} • ${esc(g.local)}<br>${esc(new Date(g.data_hora).toLocaleString("pt-BR"))}</div>
      <span class="contagem">${g.jogadores?.length || 0} jogador(es)</span>
    </div>`).join("");
}

// ------------------------------------------------------------
// CAMPEONATOS
// ------------------------------------------------------------
async function criarCampeonato(event) {
  event?.preventDefault();
  const nome = $("camp-nome")?.value.trim();
  const times = lista($("camp-times")?.value);
  if (!nome || times.length < 2) { exibirToast("Informe pelo menos 2 times."); return; }

  const { data: camp, error } = await supabaseClient.from("campeonatos").insert([{ nome, times }]).select().single();
  if (error || !camp) { exibirToast("Erro ao criar campeonato."); return; }

  // Cria jogos todos contra todos
  const jogos = [];
  for (let i = 0; i < times.length; i++) {
    for (let j = i + 1; j < times.length; j++) {
      jogos.push({ campeonato_id: camp.id, time_a: times[i], time_b: times[j] });
    }
  }
  await supabaseClient.from("campeonato_jogos").insert(jogos);

  event?.target?.reset();
  fecharModal("modal-campeonato");
  renderCampeonatos();
  exibirToast("Campeonato criado!");
}

async function renderCampeonatos() {
  const box = $("lista-campeonatos");
  if (!box) return;
  const { data: campeonatos, error } = await supabaseClient.from("campeonatos").select("*");
  if (error || !campeonatos.length) { box.innerHTML = '<p class="empty-state">Nenhum campeonato criado ainda.</p>'; return; }

  box.innerHTML = campeonatos.map((c) => `
    <div class="item-card">
      <h4>${esc(c.nome)}</h4>
      <div class="meta">${(c.times || []).map(esc).join(", ")}</div>
    </div>`).join("");
}

// ------------------------------------------------------------
// LOCAIS / MAPA
// ------------------------------------------------------------
const ESTADOS = { AC: "Rio Branco", AL: "Maceió", AP: "Macapá", AM: "Manaus", BA: "Salvador", CE: "Fortaleza", DF: "Brasília", ES: "Vitória", GO: "Goiânia", MA: "São Luís", MT: "Cuiabá", MS: "Campo Grande", MG: "Belo Horizonte", PA: "Belém", PB: "João Pessoa", PR: "Curitiba", PE: "Recife", PI: "Teresina", RJ: "Rio de Janeiro", RN: "Natal", RS: "Porto Alegre", RO: "Porto Velho", RR: "Boa Vista", SC: "Florianópolis", SP: "São Paulo", SE: "Aracaju", TO: "Palmas" };
function preencherCapital() { const uf = $("sel-estado")?.value; if (uf && $("input-cidade")) $("input-cidade").value = ESTADOS[uf] || ""; }
function buscarNoMapa() {
  const uf = $("sel-estado")?.value || "", cidade = $("input-cidade")?.value.trim() || "", esp = $("sel-esporte")?.value || "quadra poliesportiva";
  $("mapa-embed").src = "https://maps.google.com/maps?q=" + encodeURIComponent([esp, cidade, uf, "Brasil"].filter(Boolean).join(" ")) + "&t=&z=13&ie=UTF8&iwloc=&output=embed";
}
function iniciarLocais() {
  const sel = $("sel-estado");
  if (sel) sel.innerHTML = '<option value="">Selecione</option>' + Object.keys(ESTADOS).map((u) => `<option value="${u}">${u}</option>`).join("");
  const ex = $("locais-exemplo");
  if (ex) ex.innerHTML = [["Quadra do bairro", "Poliesportiva • aberta à noite"], ["Campo society", "Futebol • aluguel por hora"], ["Praça esportiva", "Vôlei e queimada • gratuita"]]
    .map(([n, d]) => `<div class="lugar-exemplo"><strong>${n}</strong><span>${d}</span></div>`).join("");
}

// ------------------------------------------------------------
// ADMIN
// ------------------------------------------------------------
async function entrarAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session || session.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    $("admin-erro").innerText = "Você precisa estar logado como administrador (`airesvinicius11@gmail.com`).";
    return;
  }
  $("admin-login").classList.add("hidden");
  $("admin-dashboard").classList.remove("hidden");
  $("admin-dashboard").innerHTML = `<div class="admin-topline"><h3>Painel administrativo</h3><button class="btn btn-outline btn-sm" onclick="$('admin-overlay').classList.add('hidden')">Fechar</button></div><p>Bem-vindo ao painel restrito!</p>`;
}

function checarAdmin() { if (location.hash === "#admin") $("admin-overlay")?.classList.remove("hidden"); }

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  iniciarLocais();
  renderGrupos();
  renderCampeonatos();
  atualizarTopo();
  checarAdmin();
  window.addEventListener("hashchange", checarAdmin);
  $("hamburguer")?.addEventListener("click", () => $("nav-menu")?.classList.toggle("open"));
});

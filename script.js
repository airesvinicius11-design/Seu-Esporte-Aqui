// ============================================================
// SEU ESPORTE AQUI — script.js
// ------------------------------------------------------------
// • Todas as mensagens do site (contato, cadastro, grupos,
//   campeonatos, login, redefinição de senha) são enviadas
//   por E-MAIL para EMAIL_DESTINO (via FormSubmit.co).
// • O chat assistente NÃO envia nada por e-mail.
// • Dados de contas/grupos/campeonatos ficam no localStorage.
// ============================================================

const EMAIL_DESTINO = "airesvinicius11@gmail.com";
const EMAIL_ENDPOINT = "https://formsubmit.co/ajax/" + EMAIL_DESTINO;

// (Opcional) URL de um servidor seu que fale com uma IA (ex.: API do Claude).
// Se preencher, o chat passa a usar essa IA para qualquer pergunta.
// Espera: POST { pergunta } -> { resposta }. NUNCA coloque chave de API aqui.
const CHATBOT_API_URL = "";

const ADMIN_EMAIL = EMAIL_DESTINO;

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+\-*/().,%^\s?]/g, " ").replace(/\s+/g, " ").trim();
const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch (_) { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { exibirToast("Não foi possível salvar no navegador."); } };
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const lista = (txt) => String(txt || "").split(",").map((s) => s.trim()).filter(Boolean);

async function hashSenha(senha) {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sea:" + senha));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (_) {
    return "b64:" + btoa(unescape(encodeURIComponent(senha))); // fallback (sem HTTPS)
  }
}

// ------------------------------------------------------------
// Interface básica
// ------------------------------------------------------------
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
// ENVIO POR E-MAIL (substitui o Discord)
// ------------------------------------------------------------
// Na PRIMEIRA vez, o FormSubmit manda um e-mail de ativação para
// airesvinicius11@gmail.com — clique no link dele para liberar.
async function enviarEmail(assunto, campos) {
  if (location.protocol === "file:") {
    exibirToast("Abra o site por um servidor (http/https ou localhost), não como arquivo, para enviar e-mails.");
    return false;
  }
  try {
    const r = await fetch(EMAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ _subject: "[Seu Esporte Aqui] " + assunto, _template: "table", _captcha: "false", ...campos }),
    });
    const dados = await r.json().catch(() => ({}));
    if (r.ok && String(dados.success) !== "false") return true;
    console.error("Erro FormSubmit:", r.status, dados);
    exibirToast(dados.message ? "E-mail não enviado: " + dados.message : "Erro ao enviar o e-mail (" + r.status + ").");
    return false;
  } catch (e) {
    console.error("Erro de rede ao enviar e-mail:", e);
    exibirToast("Erro de rede ao enviar o e-mail (verifique a conexão ou bloqueador de anúncios).");
    return false;
  }
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
  const btn = $("btn-enviar-contato");
  if (btn) btn.disabled = true;
  const ok = await enviarEmail("Nova mensagem de contato", { Nome: nome, "E-mail": email, Mensagem: mensagem, _replyto: email });
  if (btn) btn.disabled = false;
  if (ok) { form?.reset(); exibirToast("Mensagem enviada! Responderemos em breve."); }
}

// ------------------------------------------------------------
// CONTAS (cadastro / login / reset)
// ------------------------------------------------------------
function usuarioAtual() {
  const e = ler("sea_sessao", null);
  return e ? ler("sea_usuarios", []).find((u) => u.email === e) || null : null;
}
function atualizarTopo() {
  const u = usuarioAtual();
  $("btn-abrir-login")?.classList.toggle("hidden", !!u);
  $("btn-abrir-cadastro")?.classList.toggle("hidden", !!u);
  $("user-chip-container")?.classList.toggle("hidden", !u);
  if ($("user-chip")) $("user-chip").innerText = u ? "Olá, " + u.nome.split(" ")[0] : "";
}

async function fazerCadastro(event) {
  event?.preventDefault();
  const nome = $("cad-nome")?.value.trim();
  const idade = $("cad-idade")?.value;
  const email = $("cad-email")?.value.trim().toLowerCase();
  const senha = $("cad-senha")?.value;
  if (!nome || !email || !senha) return;
  const usuarios = ler("sea_usuarios", []);
  if (usuarios.some((u) => u.email === email)) { exibirToast("Este e-mail já está cadastrado. Faça login."); return; }
  // A senha NUNCA é enviada por e-mail; só o hash fica salvo neste navegador.
  const ok = await enviarEmail("Novo usuário cadastrado", { Nome: nome, Idade: (idade || "N/I") + " anos", "E-mail": email });
  if (!ok) return;
  usuarios.push({ nome, idade, email, hash: await hashSenha(senha) });
  gravar("sea_usuarios", usuarios);
  gravar("sea_sessao", email);
  event?.target?.reset();
  fecharModal("modal-auth");
  atualizarTopo(); atualizarStats();
  exibirToast("Conta criada! Bem-vindo(a), " + nome.split(" ")[0] + ".");
}

async function fazerLogin(event) {
  event?.preventDefault();
  const email = $("login-email")?.value.trim().toLowerCase();
  const senha = $("login-senha")?.value;
  if (!email || !senha) return;
  const u = ler("sea_usuarios", []).find((x) => x.email === email);
  if (!u || u.hash !== (await hashSenha(senha))) { exibirToast("E-mail ou senha incorretos."); return; }
  gravar("sea_sessao", email);
  event?.target?.reset();
  fecharModal("modal-auth");
  atualizarTopo();
  exibirToast("Login realizado!");
  enviarEmail("Login realizado", { "E-mail": email }); // aviso, sem senha
}
function fazerLogout() { localStorage.removeItem("sea_sessao"); atualizarTopo(); exibirToast("Você saiu da conta."); }

async function solicitarCodigoReset(event) {
  event?.preventDefault();
  const email = $("reset-email")?.value.trim().toLowerCase();
  if (!email) return;
  if (!ler("sea_usuarios", []).some((u) => u.email === email)) { exibirToast("Nenhuma conta com esse e-mail neste navegador."); return; }
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const ok = await enviarEmail("Código de redefinição de senha", { "E-mail solicitante": email, "Código de 6 dígitos": codigo, Validade: "15 minutos" });
  if (!ok) return;
  gravar("sea_reset", { email, codigo, exp: Date.now() + 15 * 60 * 1000 });
  exibirToast("Código enviado por e-mail!");
  $("form-esqueci-1")?.classList.add("hidden");
  $("form-esqueci-2")?.classList.remove("hidden");
}

async function confirmarResetSenha(event) {
  event?.preventDefault();
  const codigo = $("reset-codigo")?.value.trim();
  const nova = $("reset-nova-senha")?.value;
  const r = ler("sea_reset", null);
  if (!r || Date.now() > r.exp) { exibirToast("Código expirado. Peça um novo."); return; }
  if (codigo !== r.codigo) { exibirToast("Código incorreto."); return; }
  const usuarios = ler("sea_usuarios", []);
  const u = usuarios.find((x) => x.email === r.email);
  if (!u) return;
  u.hash = await hashSenha(nova);
  gravar("sea_usuarios", usuarios);
  localStorage.removeItem("sea_reset");
  event?.target?.reset();
  mudarAbaAuth("login");
  exibirToast("Senha redefinida! Faça login.");
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
  const ok = await enviarEmail("Novo grupo de partida criado", {
    "Nome do grupo": nome, Modalidade: esporte, Local: local,
    "Data e hora": new Date(datahora).toLocaleString("pt-BR"), Jogadores: jogadores.join(", ") || "Nenhum informado",
  });
  if (!ok) return;
  const grupos = ler("sea_grupos", []);
  grupos.push({ id: novoId(), nome, esporte, local, datahora, jogadores, times: null, placar: null });
  gravar("sea_grupos", grupos);
  event?.target?.reset();
  fecharModal("modal-grupo");
  renderGrupos(); atualizarStats();
  exibirToast("Grupo criado!");
}

function renderGrupos() {
  const box = $("lista-grupos");
  if (!box) return;
  const grupos = ler("sea_grupos", []);
  if (!grupos.length) { box.innerHTML = '<p class="empty-state">Nenhum grupo criado ainda. Seja o primeiro!</p>'; return; }
  box.innerHTML = grupos.map((g) => `
    <div class="item-card" onclick="abrirGrupo('${g.id}')">
      <h4>${esc(g.nome)}</h4>
      <div class="meta">${esc(g.esporte)} • ${esc(g.local)}<br>${esc(new Date(g.datahora).toLocaleString("pt-BR"))}</div>
      <span class="contagem">${g.jogadores.length} jogador(es)</span>
    </div>`).join("");
}

let _timerGrupo = null;
function abrirGrupo(id) {
  const g = ler("sea_grupos", []).find((x) => x.id === id);
  if (!g) return;
  const alvo = new Date(g.datahora).getTime();
  const conteudo = $("grupo-detalhe-conteudo");
  const desenhar = () => {
    const gs = ler("sea_grupos", []);
    const gr = gs.find((x) => x.id === id) || g;
    conteudo.innerHTML = `
      <h3>${esc(gr.nome)}</h3>
      <p class="muted">${esc(gr.esporte)} • ${esc(gr.local)} • ${esc(new Date(gr.datahora).toLocaleString("pt-BR"))}</p>
      <div class="countdown" id="contagem-regressiva"></div>
      <h5>Jogadores (${gr.jogadores.length})</h5>
      <p>${gr.jogadores.map(esc).join(", ") || "Ninguém ainda."}</p>
      <div class="field"><label>Adicionar jogador</label><input id="novo-jogador" type="text" placeholder="Nome"></div>
      <button class="btn btn-outline btn-sm" onclick="addJogador('${id}')">+ Adicionar</button>
      <button class="btn btn-primary btn-sm" onclick="sortearTimes('${id}')">🎲 Sortear times</button>
      ${gr.times ? `<div class="times-sorteados">${gr.times.map((t, i) => `<div class="time-col"><h5>Time ${i + 1}</h5><ul>${t.map((j) => `<li>${esc(j)}</li>`).join("")}</ul></div>`).join("")}</div>
      <h5>Placar</h5>
      <div class="placar-form"><span>Time 1</span><input id="pl-a" type="number" min="0" value="${gr.placar ? gr.placar[0] : 0}"><span>x</span><input id="pl-b" type="number" min="0" value="${gr.placar ? gr.placar[1] : 0}"><span>Time 2</span>
      <button class="btn btn-primary btn-sm" onclick="salvarPlacar('${id}')">Salvar</button></div>` : ""}
      <button class="btn btn-ghost btn-sm" onclick="removerGrupo('${id}')">🗑️ Excluir grupo</button>`;
    contar();
  };
  const contar = () => {
    const el = $("contagem-regressiva");
    if (!el) return clearInterval(_timerGrupo);
    let d = Math.max(0, alvo - Date.now());
    if (d === 0) { el.innerHTML = "<strong>Hora do jogo! ⚽</strong>"; return; }
    const dd = Math.floor(d / 864e5), hh = Math.floor(d / 36e5) % 24, mm = Math.floor(d / 6e4) % 60, ss = Math.floor(d / 1e3) % 60;
    el.innerHTML = [[dd, "dias"], [hh, "horas"], [mm, "min"], [ss, "seg"]].map(([n, l]) => `<div><strong>${n}</strong><span>${l}</span></div>`).join("");
  };
  desenhar();
  clearInterval(_timerGrupo);
  _timerGrupo = setInterval(contar, 1000);
  abrirModal("modal-grupo-detalhe");
  window._redesenharGrupo = desenhar;
}
function _mudarGrupo(id, fn) { const gs = ler("sea_grupos", []); const g = gs.find((x) => x.id === id); if (g) { fn(g); gravar("sea_grupos", gs); } renderGrupos(); atualizarStats(); window._redesenharGrupo?.(); }
function addJogador(id) { const n = $("novo-jogador")?.value.trim(); if (n) _mudarGrupo(id, (g) => { g.jogadores.push(n); g.times = null; }); }
function sortearTimes(id) {
  _mudarGrupo(id, (g) => {
    if (g.jogadores.length < 2) { exibirToast("Adicione pelo menos 2 jogadores."); return; }
    const emb = [...g.jogadores];
    for (let i = emb.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [emb[i], emb[j]] = [emb[j], emb[i]]; }
    const meio = Math.ceil(emb.length / 2);
    g.times = [emb.slice(0, meio), emb.slice(meio)];
  });
}
function salvarPlacar(id) { _mudarGrupo(id, (g) => { g.placar = [Number($("pl-a").value) || 0, Number($("pl-b").value) || 0]; }); exibirToast("Placar salvo!"); }
function removerGrupo(id) {
  if (!confirm("Excluir este grupo?")) return;
  gravar("sea_grupos", ler("sea_grupos", []).filter((g) => g.id !== id));
  fecharModal("modal-grupo-detalhe"); clearInterval(_timerGrupo); renderGrupos(); atualizarStats();
}

// ------------------------------------------------------------
// CAMPEONATOS
// ------------------------------------------------------------
async function criarCampeonato(event) {
  event?.preventDefault();
  const nome = $("camp-nome")?.value.trim();
  const times = lista($("camp-times")?.value);
  if (!nome || times.length < 2) { exibirToast("Informe pelo menos 2 times."); return; }
  const ok = await enviarEmail("Novo campeonato criado", { "Nome do campeonato": nome, "Times participantes": times.join(", ") });
  if (!ok) return;
  const jogos = [];
  for (let i = 0; i < times.length; i++) for (let j = i + 1; j < times.length; j++) jogos.push({ a: times[i], b: times[j], ga: null, gb: null });
  const cs = ler("sea_campeonatos", []);
  cs.push({ id: novoId(), nome, times, jogos });
  gravar("sea_campeonatos", cs);
  event?.target?.reset();
  fecharModal("modal-campeonato");
  renderCampeonatos();
  exibirToast("Campeonato criado!");
}
function renderCampeonatos() {
  const box = $("lista-campeonatos");
  if (!box) return;
  const cs = ler("sea_campeonatos", []);
  if (!cs.length) { box.innerHTML = '<p class="empty-state">Nenhum campeonato criado ainda.</p>'; return; }
  box.innerHTML = cs.map((c) => `
    <div class="item-card" onclick="abrirCampeonato('${c.id}')">
      <h4>${esc(c.nome)}</h4>
      <div class="meta">${c.times.map(esc).join(", ")}</div>
      <span class="contagem">${c.times.length} times • ${c.jogos.length} jogos</span>
    </div>`).join("");
}
function abrirCampeonato(id) {
  const c = ler("sea_campeonatos", []).find((x) => x.id === id);
  if (!c) return;
  const tab = Object.fromEntries(c.times.map((t) => [t, { t, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 }]));
  c.jogos.forEach((g) => {
    if (g.ga === null || g.gb === null) return;
    const A = tab[g.a], B = tab[g.b];
    A.j++; B.j++; A.gp += g.ga; A.gc += g.gb; B.gp += g.gb; B.gc += g.ga;
    if (g.ga > g.gb) { A.v++; A.p += 3; B.d++; } else if (g.ga < g.gb) { B.v++; B.p += 3; A.d++; } else { A.e++; B.e++; A.p++; B.p++; }
  });
  const ord = Object.values(tab).sort((x, y) => y.p - x.p || (y.gp - y.gc) - (x.gp - x.gc) || y.gp - x.gp);
  $("campeonato-detalhe-conteudo").innerHTML = `
    <h3>${esc(c.nome)}</h3>
    <h5>Classificação</h5>
    <table class="tabela"><tr><th>#</th><th>Time</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th></tr>
    ${ord.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.t)}</td><td><b>${r.p}</b></td><td>${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.d}</td><td>${r.gp - r.gc}</td></tr>`).join("")}</table>
    <h5 style="margin-top:18px">Jogos</h5>
    ${c.jogos.map((g, i) => `<div class="placar-form"><span style="flex:1">${esc(g.a)}</span>
      <input type="number" min="0" id="ga-${i}" value="${g.ga ?? ""}"><span>x</span><input type="number" min="0" id="gb-${i}" value="${g.gb ?? ""}">
      <span style="flex:1;text-align:right">${esc(g.b)}</span>
      <button class="btn btn-outline btn-sm" onclick="salvarJogo('${id}',${i})">OK</button></div>`).join("")}
    <button class="btn btn-ghost btn-sm" onclick="removerCampeonato('${id}')">🗑️ Excluir campeonato</button>`;
  abrirModal("modal-campeonato-detalhe");
}
function salvarJogo(id, i) {
  const cs = ler("sea_campeonatos", []);
  const c = cs.find((x) => x.id === id);
  const a = $("ga-" + i).value, b = $("gb-" + i).value;
  c.jogos[i].ga = a === "" ? null : Number(a);
  c.jogos[i].gb = b === "" ? null : Number(b);
  gravar("sea_campeonatos", cs);
  abrirCampeonato(id);
}
function removerCampeonato(id) {
  if (!confirm("Excluir este campeonato?")) return;
  gravar("sea_campeonatos", ler("sea_campeonatos", []).filter((c) => c.id !== id));
  fecharModal("modal-campeonato-detalhe"); renderCampeonatos();
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
function atualizarStats() {
  const grupos = ler("sea_grupos", []);
  const nomes = new Set(grupos.flatMap((g) => g.jogadores.map((j) => j.toLowerCase())));
  if ($("stat-jogadores")) $("stat-jogadores").innerText = nomes.size;
  if ($("stat-grupos")) $("stat-grupos").innerText = grupos.length;
}

// ------------------------------------------------------------
// ADMIN (abra o site com #admin no final do endereço)
// ------------------------------------------------------------
function entrarAdmin() {
  const e = $("admin-email")?.value.trim().toLowerCase();
  if (e !== ADMIN_EMAIL.toLowerCase()) { if ($("admin-erro")) $("admin-erro").innerText = "E-mail não autorizado."; return; }
  $("admin-login").classList.add("hidden");
  const d = $("admin-dashboard");
  d.classList.remove("hidden");
  const us = ler("sea_usuarios", []), gs = ler("sea_grupos", []), cs = ler("sea_campeonatos", []);
  d.innerHTML = `<div class="admin-topline"><h3>Painel administrativo</h3><button class="btn btn-outline btn-sm" onclick="$('admin-overlay').classList.add('hidden');location.hash=''">Fechar</button></div>
    <div class="admin-section"><h4>Contas neste navegador (${us.length})</h4>${us.map((u) => `<div class="admin-list-item">${esc(u.nome)} — ${esc(u.email)} (${esc(u.idade)} anos)</div>`).join("") || "Vazio."}</div>
    <div class="admin-section"><h4>Grupos (${gs.length})</h4>${gs.map((g) => `<div class="admin-list-item">${esc(g.nome)} — ${esc(g.esporte)}</div>`).join("") || "Vazio."}</div>
    <div class="admin-section"><h4>Campeonatos (${cs.length})</h4>${cs.map((c) => `<div class="admin-list-item">${esc(c.nome)} — ${c.times.length} times</div>`).join("") || "Vazio."}</div>
    <p class="fineprint">As mensagens de contato e cadastros chegam em ${esc(EMAIL_DESTINO)}.</p>`;
}
function checarAdmin() { if (location.hash === "#admin") $("admin-overlay")?.classList.remove("hidden"); }

// ============================================================
// CHAT ASSISTENTE (não envia nada por e-mail)
// ============================================================
const BASE = [
  // ---- Sobre o site ----
  { k: ["oi", "ola", "bom dia", "boa tarde", "boa noite", "e ai", "eae", "hello", "hey"], r: "Olá! 👋 Sou o assistente do Seu Esporte Aqui. Pergunte sobre o site (grupos, campeonatos, locais, conta), regras de esportes, ou qualquer assunto — eu pesquiso pra você!" },
  { k: ["o que e o site", "o que e esse site", "o que e isso aqui", "o que o site faz", "para que serve o site", "sobre o site", "seu esporte aqui", "quem criou", "criador", "aires"], r: "O Seu Esporte Aqui é uma plataforma 100% gratuita criada por Aires Vinicius para organizar partidas: achar quadras e campos, montar grupos, sortear times, marcar placar e criar campeonatos." },
  { k: ["gratuito", "gratis", "preco", "pagar", "mensalidade", "custa", "valor"], r: "É totalmente gratuito, sem mensalidade nem taxas. 💚" },
  { k: ["criar conta", "cadastro", "cadastrar", "registrar", "inscrever"], r: "Clique em “Criar conta” no topo, informe nome, idade, e-mail e senha (mínimo 4 caracteres). Sua senha fica protegida e não é enviada a ninguém." },
  { k: ["login", "entrar", "logar", "acessar conta"], r: "Clique em “Entrar” no topo e informe seu e-mail e senha. Se esqueceu a senha, use “Esqueci minha senha”." },
  { k: ["esqueci", "senha", "redefinir", "recuperar"], r: "Em “Entrar” > “Esqueci minha senha”, digite seu e-mail. Um código de 6 dígitos é enviado por e-mail à equipe (válido por 15 min); depois digite o código e a nova senha." },
  { k: ["sair", "logout", "deslogar"], r: "Clique no ícone 🚪 ao lado do seu nome, no topo da página." },
  { k: ["criar grupo", "grupo", "grupos", "racha", "montar grupo", "marcar jogo", "marcar partida"], r: "Vá em “Grupos” > “+ Criar grupo”, escolha nome, modalidade, local, data/hora e jogadores (separados por vírgula). Clicando no grupo você vê a contagem regressiva, adiciona jogadores, sorteia times e salva o placar." },
  { k: ["sortear", "sorteio", "dividir time", "dividir times", "times aleatorios"], r: "Abra um grupo e clique em “🎲 Sortear times”. Precisa de pelo menos 2 jogadores; os times saem equilibrados em quantidade." },
  { k: ["placar", "resultado", "gols", "anotar"], r: "Depois de sortear os times, abra o grupo e preencha o placar, depois clique em Salvar." },
  { k: ["campeonato", "campeonatos", "torneio", "copa", "liga", "tabela", "classificacao"], r: "Em “Campeonatos” > “+ Criar campeonato”, informe o nome e os times (mínimo 2, separados por vírgula). O site cria todos os confrontos (todos contra todos); ao lançar os placares, a classificação é calculada: vitória 3 pts, empate 1, derrota 0." },
  { k: ["local", "locais", "quadra perto", "campo perto", "onde jogar", "mapa", "encontrar quadra", "achar quadra"], r: "Na seção “Locais”, escolha estado, cidade e modalidade e clique em Buscar — o Google Maps mostra campos e quadras reais da região." },
  { k: ["contato", "falar com", "suporte", "ajuda", "sugestao", "parceria", "email"], r: "Use a página/seção “Contato”: preencha nome, e-mail e mensagem. Ela é enviada por e-mail para a equipe, que responde em breve." },
  { k: ["modalidade", "modalidades", "esportes do site", "quais esportes"], r: "O site tem futebol, vôlei, queimada e quadra poliesportiva. Mas eu respondo sobre qualquer esporte!" },
  { k: ["celular", "app", "aplicativo", "mobile"], r: "O site funciona no navegador do celular e do computador. Não precisa instalar nada." },
  { k: ["dados", "privacidade", "seguro", "seguranca", "lgpd"], r: "Contas, grupos e campeonatos ficam salvos no seu próprio navegador. Só cadastros, contatos e avisos são enviados por e-mail à equipe — e sua senha nunca é enviada." },

  // ---- Regras de esportes ----
  { k: ["regras futebol", "regra futebol", "como funciona futebol", "futebol de campo", "impedimento", "escanteio", "penalti", "falta"], r: "Futebol: 2 times de 11, 2 tempos de 45 min. Gol = bola inteira cruzando a linha. Impedimento: atacante à frente do penúltimo adversário e da bola no momento do passe. Pênalti: falta na área. Escanteio: bola sai pela linha de fundo tocada por defensor. Cartão amarelo = advertência (2 = expulsão), vermelho = expulsão direta." },
  { k: ["futsal", "salao", "regras futsal", "quadra futsal"], r: "Futsal: 5 jogadores por time (4 na linha + goleiro), 2 tempos de 20 min (cronômetro parado), bola mais pesada e sem quique, laterais cobrados com o pé, substituições ilimitadas. Faltas acumuladas: a 6ª gera tiro livre sem barreira." },
  { k: ["society", "fut7", "futebol 7"], r: "Futebol society: campo sintético menor, normalmente 7 jogadores por time (6 + goleiro), sem impedimento na maioria das regras, jogos de 40 a 60 min." },
  { k: ["regras volei", "regra volei", "como funciona volei", "volei", "voleibol", "saque", "rodizio"], r: "Vôlei: 6 x 6, sets até 25 pontos (com 2 de diferença); o 5º set vai a 15. Vence quem ganhar 3 sets. Cada time tem até 3 toques, sem tocar duas vezes seguidas o mesmo jogador (exceto bloqueio). Há rodízio no sentido horário a cada ponto conquistado no saque adversário." },
  { k: ["regras queimada", "queimada", "caçador", "cacador", "queimado", "como jogar queimada"], r: "Queimada: dois times em lados opostos da quadra; você “queima” o adversário acertando a bola nele sem que ela quique antes ou seja pega. Quem é queimado vai para o “cemitério” (atrás do time rival) de onde pode acertar por trás. Se pegar a bola no ar, o adversário que lançou sai. Vence quem eliminar todos do outro time." },
  { k: ["basquete", "regras basquete", "cesta", "3 pontos", "bola ao cesto"], r: "Basquete: 5 x 5, 4 quartos de 10 min (NBA: 12). Cesta vale 2 pontos, 3 além da linha de 3 e 1 no lance livre. Não pode andar com a bola sem quicar (“andada”) nem quicar e segurar de novo (“duplo drible”). Posse de 24 segundos." },
  { k: ["handebol", "regras handebol"], r: "Handebol: 7 x 7 (6 + goleiro), 2 tempos de 30 min. Pode dar até 3 passos com a bola e segurá-la por até 3 segundos; ninguém entra na área do goleiro. Suspensão de 2 minutos para faltas graves." },
  { k: ["tenis", "regras tenis", "raquete"], r: "Tênis: pontuação 15-30-40-game; vence o set quem chegar a 6 games com 2 de diferença (tie-break em 6-6). Partidas melhor de 3 ou 5 sets." },
  { k: ["natacao", "nadar", "estilos", "crawl"], r: "Estilos da natação: crawl (livre), costas, peito e borboleta; o medley combina os quatro. Iniciantes podem começar pelo crawl e pela respiração lateral." },
  { k: ["corrida", "correr", "maratona", "treino corrida", "pace"], r: "Para começar a correr: alterne caminhada e corrida leve (ex.: 1 min corre / 2 min anda por 20 min), 3x por semana, aumente ~10% por semana e use tênis adequado. Alongue e hidrate-se. Dor persistente? Procure um profissional." },
  { k: ["academia", "musculacao", "hipertrofia", "treino", "ganhar massa", "emagrecer"], r: "Dicas gerais: treine 3–5x por semana, priorize exercícios multiarticulares (agachamento, supino, remada), durma bem (7–9h), coma proteína suficiente e progrida a carga aos poucos. Para plano personalizado, procure um educador físico." },
  { k: ["aquecimento", "alongamento", "alongar", "aquecer", "lesao", "machucar"], r: "Aqueça 5–10 min antes (trote leve, mobilidade, movimentos do esporte em baixa intensidade) e alongue depois. Se machucar: pare, gelo por ~15–20 min, compressão e elevação; se houver inchaço forte ou dor que não passa, procure um médico." },
  { k: ["hidratacao", "agua", "beber agua", "suor"], r: "Beba água antes, durante e depois do exercício — pequenos goles a cada 15–20 min. Em jogos longos ou muito calor, considere bebida com eletrólitos." },
  { k: ["alimentacao", "comer antes", "dieta", "pre treino", "pos treino", "o que comer"], r: "Antes do jogo (1–2h): carboidrato leve (banana, pão, aveia). Depois: proteína + carboidrato (ovos, frango com arroz, iogurte com fruta). Evite comida muito gordurosa perto do exercício." },
  { k: ["quantos jogadores", "numero de jogadores", "quantas pessoas"], r: "Futebol: 11 • Futsal: 5 • Society: 7 • Vôlei: 6 • Basquete: 5 • Handebol: 7 • Queimada: livre (geralmente 6–12 por time)." },
  { k: ["arbitro", "juiz", "apitar"], r: "O árbitro aplica as regras, marca faltas e cartões e controla o tempo. Em rachas amigáveis, combinem antes as regras (tempo, pênaltis, laterais) para evitar discussões." },
  { k: ["olimpiada", "olimpiadas", "copa do mundo", "mundial"], r: "A Copa do Mundo de futebol masculino ocorre a cada 4 anos (a última foi em 2022, no Catar; a próxima é em 2026 na América do Norte). As Olimpíadas também são a cada 4 anos. Pergunte algo específico e eu pesquiso!" },

  // ---- Conversa ----
  { k: ["obrigado", "obrigada", "valeu", "brigado", "thanks"], r: "Por nada! 😊 Se precisar de mais alguma coisa, é só perguntar." },
  { k: ["tchau", "ate mais", "adeus", "falou"], r: "Até mais! Bom jogo! ⚽🏐" },
  { k: ["quem e voce", "seu nome", "voce e um robo", "voce e humano", "voce e ia", "o que voce faz", "o que voce sabe"], r: "Sou o assistente virtual do Seu Esporte Aqui. Respondo dúvidas do site, regras e dicas de esportes, faço contas, informo data/hora e pesquiso na Wikipédia sobre outros assuntos." },
  { k: ["piada", "conta uma piada", "me faz rir"], r: "Por que o jogador de futebol levou barbante pro jogo? Pra amarrar o placar! 😄" },
];

const chatHistorico = [];

function alternarChat() {
  const box = $("chat-box");
  if (!box) return;
  box.classList.toggle("hidden");
  if (!box.classList.contains("hidden")) {
    if (!$("chat-body").children.length) addMsgChat("Olá! 👋 Sou o assistente do Seu Esporte Aqui. Pergunte sobre o site, esportes ou qualquer outro assunto.", "bot");
    $("chat-texto")?.focus();
  }
}

function addMsgChat(texto, quem, link) {
  const corpo = $("chat-body");
  const el = document.createElement("div");
  el.className = "chat-msg " + quem;
  el.style.whiteSpace = "pre-wrap";
  el.textContent = texto;
  if (link) {
    const a = document.createElement("a");
    a.href = link.url; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.textContent = link.texto; a.style.cssText = "display:block;margin-top:6px;color:#06D6A0;";
    el.appendChild(a);
  }
  corpo.appendChild(el);
  corpo.scrollTop = corpo.scrollHeight;
  return el;
}

function calcular(t) {
  let e = norm(t).replace(/quanto (e|eh|da|fica)|calcule|calcula|resultado de|=|\?/g, " ").replace(/\bmais\b/g, "+").replace(/\bmenos\b/g, "-").replace(/\bvezes\b/g, "*").replace(/\bdividido por\b/g, "/").replace(/[x×]/g, "*").replace(/÷/g, "/").replace(/\^/g, "**").replace(/(\d),(\d)/g, "$1.$2").trim();
  if (!/^[\d\s+\-*/().%]+$/.test(e) || !/\d/.test(e) || !/[+\-*/%]/.test(e)) return null;
  try { const v = Function('"use strict";return (' + e + ")")(); return Number.isFinite(v) ? String(Math.round(v * 1e10) / 1e10).replace(".", ",") : null; } catch (_) { return null; }
}

function respostaBase(txt) {
  const n = " " + norm(txt) + " ";
  let melhor = null, pontos = 0;
  for (const item of BASE) {
    let p = 0;
    for (const k of item.k) {
      const kk = norm(k);
      if (n.includes(" " + kk + " ") || (kk.length > 4 && n.includes(kk))) p += kk.split(" ").length + 1;
    }
    if (p > pontos) { pontos = p; melhor = item; }
  }
  return pontos >= 1 ? melhor.r : null;
}

async function pesquisarWikipedia(pergunta) {
  const termo = pergunta.replace(/^(o que (e|é|sao|são)|quem (e|é|foi|era)|qual (e|é)|quais (sao|são)|onde (fica|foi)|quando (foi|nasceu)|como (funciona|surgiu)|me (fale|explique|diga) (sobre|o que)?|fale sobre|explique|defina|significado de)\s+/i, "").replace(/[?!.]+$/, "").trim();
  try {
    const b = await fetch("https://pt.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=" + encodeURIComponent(termo || pergunta));
    const bj = await b.json();
    const titulo = bj?.query?.search?.[0]?.title;
    if (!titulo) return null;
    const s = await fetch("https://pt.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(titulo));
    const sj = await s.json();
    if (!sj?.extract) return null;
    const resumo = sj.extract.length > 600 ? sj.extract.slice(0, 600).replace(/\s+\S*$/, "") + "…" : sj.extract;
    return { texto: resumo, url: sj.content_urls?.desktop?.page || "https://pt.wikipedia.org/wiki/" + encodeURIComponent(titulo), titulo };
  } catch (_) { return null; }
}

async function perguntarIA(pergunta) {
  if (!CHATBOT_API_URL) return null;
  try {
    const r = await fetch(CHATBOT_API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pergunta, historico: chatHistorico.slice(-8) }) });
    const j = await r.json();
    return j.resposta || null;
  } catch (_) { return null; }
}

async function responderBot(txt) {
  // 1) IA própria (se configurada)
  const ia = await perguntarIA(txt);
  if (ia) return { texto: ia };
  const n = norm(txt);
  // 2) Data e hora
  if (/\b(que horas|horas sao|hora atual|hora e agora)\b/.test(n)) return { texto: "Agora são " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + "." };
  if (/\b(que dia|data de hoje|dia e hoje|qual a data|dia da semana)\b/.test(n)) return { texto: "Hoje é " + new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + "." };
  // 3) Contas
  const conta = calcular(txt.replace(/×/g, "*").replace(/÷/g, "/"));
  if (conta !== null) return { texto: "Resultado: " + conta };
  // 4) Base do site + esportes
  const base = respostaBase(txt);
  if (base) return { texto: base };
  // 5) Qualquer outro assunto: Wikipédia
  const wiki = await pesquisarWikipedia(txt);
  if (wiki) return { texto: wiki.texto, link: { url: wiki.url, texto: "📖 Ler mais na Wikipédia: " + wiki.titulo } };
  // 6) Último recurso: busca na web
  return { texto: "Não encontrei uma resposta direta para isso. Reformule a pergunta ou veja o resultado de uma busca:", link: { url: "https://www.google.com/search?q=" + encodeURIComponent(txt), texto: "🔎 Pesquisar no Google" } };
}

async function enviarMensagemBot(event) {
  event?.preventDefault();
  const campo = $("chat-texto");
  const txt = campo?.value.trim();
  if (!txt) return;
  campo.value = "";
  addMsgChat(txt, "user");
  chatHistorico.push({ role: "user", content: txt });
  const espera = addMsgChat("Pensando…", "bot");
  const r = await responderBot(txt);
  espera.remove();
  addMsgChat(r.texto, "bot", r.link);
  chatHistorico.push({ role: "assistant", content: r.texto });
}

// ------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  iniciarLocais();
  renderGrupos();
  renderCampeonatos();
  atualizarStats();
  atualizarTopo();
  checarAdmin();
  window.addEventListener("hashchange", checarAdmin);
  $("hamburguer")?.addEventListener("click", () => $("nav-menu")?.classList.toggle("open"));
  document.querySelectorAll("#nav-menu a").forEach((a) => a.addEventListener("click", () => $("nav-menu")?.classList.remove("open")));
});

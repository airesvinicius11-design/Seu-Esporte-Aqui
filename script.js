// --- PAINEL ADMINISTRATIVO RESTRITO ---

function abrirAdminOverlay() {
  const overlay = document.getElementById('admin-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-senha').value = '';
    document.getElementById('admin-erro').textContent = '';
  }
}

function entrarAdmin() {
  const emailInput = document.getElementById('admin-email').value.trim();
  const senhaInput = document.getElementById('admin-senha').value;
  const erroEl = document.getElementById('admin-erro');

  // E-mail válido permitido para acessar o painel admin
  const EMAIL_ADMIN_VALIDO = "airesvinicius11@gmail.com";

  if (!emailInput || !senhaInput) {
    erroEl.textContent = 'Preencha todos os campos do administrador.';
    return;
  }

  // Validação restrita do e-mail único
  if (emailInput.toLowerCase() !== EMAIL_ADMIN_VALIDO) {
    erroEl.textContent = 'Acesso negado: E-mail não autorizado como administrador.';
    return;
  }

  // Aqui você pode definir a senha padrão ou checar com o banco. 
  // Exemplo de senha de segurança exigida para o admin: "admin123" (mude conforme preferir)
  const SENHA_ADMIN = "admin123"; 

  if (senhaInput !== SENHA_ADMIN) {
    erroEl.textContent = 'Senha incorreta para o painel administrativo.';
    return;
  }

  // Se passou nas validações, libera o acesso ao painel
  erroEl.textContent = '';
  mostrarToast('Bem-vindo ao Painel Administrativo, Aires!');
  
  document.getElementById('admin-login').classList.add('hidden');
  const dashboard = document.getElementById('admin-dashboard');
  dashboard.classList.remove('hidden');
  
  // Conteúdo do Painel Admin
  dashboard.innerHTML = `
    <h3>Painel Administrativo - Restrito</h3>
    <p class="muted">Logado como: <strong>${EMAIL_ADMIN_VALIDO}</strong></p>
    <div style="margin-top: 15px;">
      <h4>Gerenciamento Rápido:</h4>
      <p>• Total de Grupos Cadastrados: <strong>${estadoApp.grupos.length}</strong></p>
      <p>• Total de Campeonatos: <strong>${estadoApp.campeonatos.length}</strong></p>
    </div>
    <button class="btn btn-outline btn-block" style="margin-top: 20px;" onclick="fecharAdmin()">Sair / Fechar Painel</button>
  `;
}

function fecharAdmin() {
  const overlay = document.getElementById('admin-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}// --- PAINEL ADMINISTRATIVO RESTRITO ---

function abrirAdminOverlay() {
  const overlay = document.getElementById('admin-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-senha').value = '';
    document.getElementById('admin-erro').textContent = '';
  }
}

function entrarAdmin() {
  const emailInput = document.getElementById('admin-email').value.trim();
  const senhaInput = document.getElementById('admin-senha').value;
  const erroEl = document.getElementById('admin-erro');

  // E-mail válido permitido para acessar o painel admin
  const EMAIL_ADMIN_VALIDO = "airesvinicius11@gmail.com";

  if (!emailInput || !senhaInput) {
    erroEl.textContent = 'Preencha todos os campos do administrador.';
    return;
  }

  // Validação restrita do e-mail único
  if (emailInput.toLowerCase() !== EMAIL_ADMIN_VALIDO) {
    erroEl.textContent = 'Acesso negado: E-mail não autorizado como administrador.';
    return;
  }

  // Aqui você pode definir a senha padrão ou checar com o banco. 
  // Exemplo de senha de segurança exigida para o admin: "admin123" (mude conforme preferir)
  const SENHA_ADMIN = "admin123"; 

  if (senhaInput !== SENHA_ADMIN) {
    erroEl.textContent = 'Senha incorreta para o painel administrativo.';
    return;
  }

  // Se passou nas validações, libera o acesso ao painel
  erroEl.textContent = '';
  mostrarToast('Bem-vindo ao Painel Administrativo, Aires!');
  
  document.getElementById('admin-login').classList.add('hidden');
  const dashboard = document.getElementById('admin-dashboard');
  dashboard.classList.remove('hidden');
  
  // Conteúdo do Painel Admin
  dashboard.innerHTML = `
    <h3>Painel Administrativo - Restrito</h3>
    <p class="muted">Logado como: <strong>${EMAIL_ADMIN_VALIDO}</strong></p>
    <div style="margin-top: 15px;">
      <h4>Gerenciamento Rápido:</h4>
      <p>• Total de Grupos Cadastrados: <strong>${estadoApp.grupos.length}</strong></p>
      <p>• Total de Campeonatos: <strong>${estadoApp.campeonatos.length}</strong></p>
    </div>
    <button class="btn btn-outline btn-block" style="margin-top: 20px;" onclick="fecharAdmin()">Sair / Fechar Painel</button>
  `;
}

function fecharAdmin() {
  const overlay = document.getElementById('admin-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}

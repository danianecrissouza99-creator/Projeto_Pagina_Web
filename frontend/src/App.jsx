import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function App() {
  // --- ESTADOS GERAIS ---
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // login | registo | recuperar | simulador | historico | admin | perfil

  // --- ESTADOS DE FORMULÁRIO ---
  const [loginData, setLoginData] = useState({ email: '', senha: '' });
  const [regData, setRegData] = useState({ nome: '', email: '', password: '', data_nascimento: '', telefone: '' });
  const [recoverEmail, setRecoverEmail] = useState('');

  // Estado do Perfil expandido com novos campos e mudança de senha
  const [perfilData, setPerfilData] = useState({
    nome: '',
    email: '',
    data_nascimento: '',
    telefone: '',
    senhaAtual: '',
    novaSenha: '',
    confirmarNovaSenha: ''
  });

  // --- ESTADOS DO SIMULADOR ---
  const [params, setParams] = useState({ populacao: 1000, taxaTrans: 0.3, taxaRecup: 0.1, dias: 30 });
  const [resultados, setResultados] = useState({ s: [], i: [], r: [], rt: [] });
  const [isSimulating, setIsSimulating] = useState(false);

  // --- ESTADOS DE DADOS (HISTÓRICO E ADMIN) ---
  const [historico, setHistorico] = useState([]);
  const [utilizadores, setUtilizadores] = useState([]);

  // --- ESTADO PARA O FORMULÁRIO DE ADMIN ---
  const [adminForm, setAdminForm] = useState({
    id_utilizador: null,
    nome: '',
    email: '',
    password: '',
    tipo: 'User',
    data_nascimento: '',
    telefone: ''
  });

  // --- LÓGICA DO MEDIDOR DE RISCO (BETA) ---
  const getRiskLevel = (beta) => {
    const b = parseFloat(beta);
    if (b < 0.15) return { text: 'Baixo (Controlado)', color: '#75BFA2', width: '25%' };
    if (b < 0.4) return { text: 'Moderado (Atenção)', color: '#E3C53C', width: '60%' };
    return { text: 'Alto (Risco Pandémico)', color: '#E74C3C', width: '100%' };
  };
  const risk = getRiskLevel(params.taxaTrans);

  // --- 1. FUNÇÕES DE AUTENTICAÇÃO E REGISTO ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('http://localhost:3001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await resp.json();
      if (data.success) {
        setUser(data.user);
        // Preencher perfil com todos os dados vindos da BD
        setPerfilData({
          nome: data.user.nome,
          email: data.user.email,
          data_nascimento: data.user.data_nascimento || '',
          telefone: data.user.telefone || '',
          senhaAtual: '', novaSenha: '', confirmarNovaSenha: ''
        });
        setView('simulador');
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Erro ao ligar ao servidor de login.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('http://localhost:3001/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });
      const data = await resp.json();
      if (data.success) {
        alert("Conta criada com sucesso! Pode entrar agora.");
        setView('login');
      } else {
        alert(data.message || "Erro ao criar conta.");
      }
    } catch (err) {
      alert("Erro ao ligar ao servidor de registo.");
    }
  };

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    try {
      const resp = await fetch('http://localhost:3001/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoverEmail })
      });
      const data = await resp.json();
      // Simulando sucesso de envio de email
      alert(data.message || "Se o e-mail existir no nosso sistema, receberás um link de recuperação em breve.");
      setView('login');
    } catch (err) {
      alert("Erro ao contactar o servidor para recuperação.");
    }
  };

  // --- 2. FUNÇÕES DO SIMULADOR ---
  const handleSimular = async (e) => {
    e.preventDefault();
    setIsSimulating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const resp = await fetch('http://localhost:3001/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, userId: user.id_utilizador })
      });
      const data = await resp.json();
      if (data.success) {
        setResultados(data.curvas);
        alert("Simulação concluída e guardada!");
      }
    } catch (err) {
      alert("Erro na simulação.");
    } finally {
      setIsSimulating(false);
    }
  };

  // --- 3. FUNÇÕES DE HISTÓRICO ---
  const carregarHistorico = async () => {
    try {
      const resp = await fetch(`http://localhost:3001/historico/${user.id_utilizador}`);
      const data = await resp.json();
      setHistorico(data);
      setView('historico');
    } catch (err) {
      alert("Erro ao carregar histórico.");
    }
  };

  const limparHistorico = async () => {
    if (window.confirm("Tem a certeza que deseja apagar TODO o seu histórico?")) {
      try {
        await fetch(`http://localhost:3001/historico/limpar/${user.id_utilizador}`, { method: 'DELETE' });
        carregarHistorico();
      } catch (err) {
        alert("Erro ao limpar dados.");
      }
    }
  };

  const exportarCSV = () => {
    if (historico.length === 0) return alert("Não há dados para exportar.");
    const header = "Data,Nome_Simulacao,Estado,Populacao,Taxa_Inf,Taxa_Rec,Dias\n";
    const rows = historico.map(h =>
      `${new Date(h.data_criacao).toLocaleString().replace(/,/g, '')},${h.nome_simulacao},${h.estado},${h.populacao_inicial},${h.taxa_infeccao},${h.taxa_recuperacao},${h.duracao_dias}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico_simulacoes.csv';
    a.click();
  };

  // --- 4. FUNÇÕES DE ADMIN ---
  const carregarUtilizadores = async () => {
    try {
      const resp = await fetch('http://localhost:3001/admin/utilizadores');
      const data = await resp.json();
      setUtilizadores(data);
      setView('admin');
    } catch (err) {
      alert("Erro ao carregar lista de utilizadores.");
    }
  };

  const apagarUtilizador = async (id) => {
    if (window.confirm("Apagar utilizador? Esta ação é irreversível.")) {
      try {
        await fetch(`http://localhost:3001/admin/utilizadores/${id}`, { method: 'DELETE' });
        carregarUtilizadores();
      } catch (err) { alert("Erro ao apagar utilizador."); }
    }
  };

  const guardarUtilizadorAdmin = async (e) => {
    e.preventDefault();
    const isEdit = adminForm.id_utilizador !== null;
    const url = isEdit ? `http://localhost:3001/admin/utilizadores/${adminForm.id_utilizador}` : 'http://localhost:3001/admin/utilizadores';
    const method = isEdit ? 'PUT' : 'POST';
    try {
      const resp = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm)
      });
      if (resp.ok) {
        alert(isEdit ? "Utilizador atualizado!" : "Utilizador criado!");
        setAdminForm({ id_utilizador: null, nome: '', email: '', password: '', tipo: 'User', data_nascimento: '', telefone: '' });
        carregarUtilizadores();
      }
    } catch (err) { alert("Erro ao guardar utilizador."); }
  };

  // --- 5. FUNÇÕES DE PERFIL ---
  const atualizarPerfil = async (e) => {
    e.preventDefault();
    // Validação da nova senha
    if (perfilData.novaSenha && perfilData.novaSenha !== perfilData.confirmarNovaSenha) {
      return alert("A nova palavra-passe e a confirmação não coincidem!");
    }
    try {
      const resp = await fetch(`http://localhost:3001/utilizador/${user.id_utilizador}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: perfilData.nome,
          email: perfilData.email,
          data_nascimento: perfilData.data_nascimento,
          telefone: perfilData.telefone,
          senhaAtual: perfilData.senhaAtual,
          novaSenha: perfilData.novaSenha
        })
      });
      const data = await resp.json();
      if (resp.ok && data.success !== false) {
        alert("Perfil atualizado com sucesso!");
        // Limpar os campos de password após sucesso
        setPerfilData({ ...perfilData, senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
      } else {
        alert(data.message || "Erro ao atualizar perfil.");
      }
    } catch (err) {
      alert("Erro de ligação ao atualizar perfil.");
    }
  };

  // --- BLOCO DE ESTILOS CSS (MEDCEI DESIGN SYSTEM APLICADO) ---
  const cssStyles = `
    body {
      margin: 0;
      background-color: #F7F9F8;
      font-family: 'Segoe UI', Inter, -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
      color: #333333;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }
    h1, h2, h3 {
      font-family: Georgia, 'Times New Roman', Times, serif;
      color: #333333;
      margin-top: 0;
      letter-spacing: -0.5px;
    }
    h1 { font-size: 30px; font-weight: 700; }
    h2 { font-size: 24px; font-weight: 600; margin-bottom: 24px; }
    h3 { font-size: 20px; font-weight: 600; margin-bottom: 20px; color: #1a1a1a; }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #555;
      font-size: 14px;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    @keyframes pulse-teal {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(117, 191, 162, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(117, 191, 162, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(117, 191, 162, 0); }
    }
    .status-dot {
      display: inline-block;
      width: 10px; height: 10px; border-radius: 50%;
      background-color: #75BFA2; margin-right: 8px; margin-left: 10px; animation: pulse-teal 2s infinite;
    }
    .card {
      background-color: #FFFFFF;
      padding: 35px;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.05);
      margin-bottom: 25px;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      padding: 35px;
      border-radius: 16px;
      margin-bottom: 25px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
      position: relative;
      z-index: 1;
    }
    .glass-card::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 16px;
      padding: 2px;
      background: linear-gradient(135deg, rgba(227,197,60,0.6), rgba(117,191,162,0.6));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      z-index: -1;
    }
    .input-style {
      width: 100%;
      padding: 12px 16px;
      margin: 0 0 20px 0;
      border-radius: 10px;
      border: 1.5px solid #EAEAEA;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 15px;
      outline: none;
      transition: all 0.2s ease-in-out;
      background-color: #FAFAFA;
      color: #333333;
    }
    .input-style:focus {
      border-color: #75BFA2;
      background-color: #FFFFFF;
      box-shadow: 0 0 0 4px rgba(117, 191, 162, 0.15);
    }
    .form-row {
      display: flex;
      gap: 15px;
    }
    .form-group {
      flex: 1;
    }
    .btn-primary {
      background-color: #75BFA2;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-family: inherit;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.3px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(117, 191, 162, 0.3);
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
    .btn-primary:hover:not(:disabled) {
      background-color: #5BAA8C;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(117, 191, 162, 0.4);
    }
    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }
    .btn-primary:disabled {
      background-color: #A6D4C2;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .btn-secondary {
      background-color: #E3C53C;
      color: white;
      padding: 10px 20px;
      margin: 10px 8px 10px 0;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 4px 10px rgba(227, 197, 60, 0.3);
    }
    .btn-secondary:hover {
      background-color: #CBAE2E;
      transform: translateY(-2px);
    }
    .btn-danger {
      background-color: #E74C3C;
      color: white;
      padding: 10px 20px;
      margin: 10px 8px 10px 0;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 4px 10px rgba(231, 76, 60, 0.2);
    }
    .btn-danger:hover {
      background-color: #C0392B;
      transform: translateY(-2px);
    }
    .btn-link {
      background: none;
      border: none;
      color: #75BFA2;
      cursor: pointer;
      text-decoration: underline;
      font-family: inherit;
      font-size: 15px;
      font-weight: 600;
      transition: color 0.2s ease;
    }
    .btn-link:hover { color: #5BAA8C; }
    .risk-meter-bg {
      width: 100%; height: 6px; background-color: #EAEAEA; border-radius: 4px;
      margin-top: -10px; margin-bottom: 5px; overflow: hidden;
    }
    .risk-meter-fill { height: 100%; transition: width 0.4s ease, background-color 0.4s ease; }
    .risk-text { font-size: 12px; font-weight: 600; margin-bottom: 20px; display: block; text-align: right; }
    .table-style {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      text-align: left;
    }
    .table-style th, .table-style td {
      padding: 16px 20px;
      border-bottom: 1px solid #F0F0F0;
    }
    .table-style th {
      background-color: #FFFFFF;
      color: #75BFA2;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 13px;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #EAEAEA;
    }
    .table-style tr:first-child th:first-child { border-top-left-radius: 12px; }
    .table-style tr:first-child th:last-child { border-top-right-radius: 12px; }
    .table-style tbody tr { transition: background-color 0.2s ease; }
    .table-style tbody tr:hover { background-color: #F7F9F8; }
    .table-style tbody tr:last-child td { border-bottom: none; }
    header {
      background-color: #FFFFFF;
      padding: 15px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #333333;
      box-shadow: 0 2px 15px rgba(0,0,0,0.04);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .nav-btn {
      background: none;
      border: none;
      color: #555555;
      margin: 0 15px;
      cursor: pointer;
      font-weight: 500;
      font-family: inherit;
      font-size: 15px;
      transition: all 0.2s ease;
      padding: 8px 0;
      position: relative;
    }
    .nav-btn::after {
      content: '';
      position: absolute;
      width: 0;
      height: 2px;
      bottom: 0;
      left: 0;
      background-color: #75BFA2;
      transition: width 0.3s ease;
    }
    .nav-btn:hover { color: #75BFA2; }
    .nav-btn:hover::after { width: 100%; }
    .chart-container {
      position: relative;
      height: 450px;
      width: 100%;
      cursor: crosshair;
    }
    .divider {
      height: 1px;
      background-color: #EAEAEA;
      margin: 30px 0;
    }
  `;

  // --- INTERFACE DE ACESSO (LOGIN / REGISTO / RECUPERAR SENHA) ---
  if (!user) {
    return (
      <div style={{ backgroundColor: '#F7F9F8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <style>{cssStyles}</style>
        <div className="card fade-in" style={{ width: '100%', maxWidth: '480px', textAlign: 'center', padding: '50px 40px' }}>
          
          <div style={{ width: '50px', height: '50px', backgroundColor: '#75BFA2', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 15px auto' }}>
             <span style={{ color: '#FFFFFF', fontSize: '24px', fontWeight: 'bold' }}>+</span>
          </div>
          
          <h1 style={{ color: '#333333', marginBottom: '5px', fontSize: '28px', letterSpacing: '1px' }}>MEDCEI</h1>
          <p style={{ color: '#75BFA2', marginBottom: '35px', fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px' }}>SERVIÇOS AO DOMICÍLIO</p>
          
          {view === 'login' && (
            <form onSubmit={handleLogin}>
              <h3 style={{ textAlign: 'left', marginBottom: '25px', color: '#333333' }}>Iniciar Sessão</h3>
              <div style={{ textAlign: 'left' }}>
                <label>E-mail</label>
                <input type="email" placeholder="O teu e-mail profissional" className="input-style" onChange={e => setLoginData({...loginData, email: e.target.value})} required />
                <label>Palavra-passe</label>
                <input type="password" placeholder="••••••••" className="input-style" onChange={e => setLoginData({...loginData, senha: e.target.value})} required />
              </div>
              <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '20px' }}>
                <button type="button" onClick={() => setView('recuperar')} className="btn-link" style={{ fontSize: '13px', color: '#E3C53C' }}>Esqueci-me da palavra-passe</button>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Entrar</button>
              <p style={{ marginTop: '25px', color: '#666' }}>Não tens conta? <button type="button" onClick={() => setView('registo')} className="btn-link">Criar conta agora</button></p>
            </form>
          )}

          {view === 'recuperar' && (
            <form onSubmit={handleRecuperarSenha}>
              <h3 style={{ textAlign: 'left', marginBottom: '25px', color: '#333333' }}>Recuperar Palavra-passe</h3>
              <p style={{ textAlign: 'left', fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                Insere o teu e-mail associado à conta. Enviaremos as instruções para redefinir a tua palavra-passe.
              </p>
              <div style={{ textAlign: 'left' }}>
                <label>E-mail</label>
                <input type="email" placeholder="O teu e-mail registado" className="input-style" value={recoverEmail} onChange={e => setRecoverEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>Enviar Link de Recuperação</button>
              <p style={{ marginTop: '25px' }}><button type="button" onClick={() => setView('login')} className="btn-link">Voltar ao Login</button></p>
            </form>
          )}

          {view === 'registo' && (
            <form onSubmit={handleRegister}>
              <h3 style={{ textAlign: 'left', marginBottom: '25px', color: '#333333' }}>Criar Conta</h3>
              <div style={{ textAlign: 'left' }}>
                <label>Nome Completo</label>
                <input type="text" placeholder="Ex: José Pedro" className="input-style" onChange={e => setRegData({...regData, nome: e.target.value})} required />
                <div className="form-row">
                  <div className="form-group">
                    <label>Data de Nascimento</label>
                    <input type="date" className="input-style" onChange={e => setRegData({...regData, data_nascimento: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input type="tel" placeholder="Ex: 912345678" className="input-style" onChange={e => setRegData({...regData, telefone: e.target.value})} required />
                  </div>
                </div>
                <label>E-mail</label>
                <input type="email" placeholder="O teu e-mail profissional" className="input-style" onChange={e => setRegData({...regData, email: e.target.value})} required />
                <label>Palavra-passe</label>
                <input type="password" placeholder="Cria uma palavra-passe forte" className="input-style" onChange={e => setRegData({...regData, password: e.target.value})} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>Registar</button>
              <p style={{ marginTop: '25px', color: '#666' }}><button type="button" onClick={() => setView('login')} className="btn-link">Já tenho conta</button></p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // --- CONFIGURAÇÃO DA ANIMAÇÃO DO GRÁFICO (COM DOIS EIXOS Y) ---
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 2000, easing: 'easeInOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { font: { family: "'Segoe UI', sans-serif", size: 13 }, usePointStyle: true, boxWidth: 8, color: '#333333' }
      },
      tooltip: {
        backgroundColor: 'rgba(51, 51, 51, 0.95)',
        titleFont: { size: 14, family: "'Segoe UI', sans-serif" },
        bodyFont: { size: 13, family: "'Segoe UI', sans-serif" },
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#777' } },
      y: { 
        type: 'linear',
        display: true,
        position: 'left',
        grid: { color: '#f0f0f0' }, 
        beginAtZero: true, 
        ticks: { color: '#777' } 
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false }, 
        ticks: { color: '#E74C3C' }
      }
    }
  };

  // --- INTERFACE PRINCIPAL (DASHBOARD) ---
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9F8' }}>
      <style>{cssStyles}</style>
      <header>
        <div style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '30px', height: '30px', backgroundColor: '#75BFA2', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginRight: '10px' }}>
            <span style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: 'bold' }}>M</span>
          </div>
          <strong style={{ color: '#333333', letterSpacing: '1px' }}>MEDCEI</strong>
          <span className="status-dot"></span>
          <span style={{ margin: '0 10px 0 0', color: '#EAEAEA' }}>|</span>
          <span style={{ fontWeight: '500', color: '#555' }}>{user.nome}</span>
          <span style={{ color: '#E3C53C', fontSize: '13px', marginLeft: '6px', fontWeight: 'bold' }}>({user.tipo})</span>
        </div>
        <nav>
          <button className="nav-btn" style={{ color: view === 'simulador' ? '#75BFA2' : '' }} onClick={() => setView('simulador')}>Simulador</button>
          <button className="nav-btn" style={{ color: view === 'historico' ? '#75BFA2' : '' }} onClick={carregarHistorico}>O Meu Histórico</button>
          <button className="nav-btn" style={{ color: view === 'perfil' ? '#75BFA2' : '' }} onClick={() => setView('perfil')}>O Meu Perfil</button>
          {user.tipo === 'Admin' && <button className="nav-btn" style={{ color: view === 'admin' ? '#75BFA2' : '#E3C53C', fontWeight: 'bold' }} onClick={carregarUtilizadores}>Administração</button>}
          <button className="btn-secondary" style={{ backgroundColor: '#E74C3C', margin: '0 0 0 15px', boxShadow: 'none' }} onClick={() => setUser(null)}>Sair</button>
        </nav>
      </header>

      <main style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* VISTA: SIMULADOR */}
        {view === 'simulador' && (
          <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="glass-card fade-in delay-1" style={{ width: '320px', flexShrink: 0 }}>
              <h3 style={{ color: '#75BFA2' }}>Configuração SIR</h3>
              
              <label>População Total</label>
              <input type="number" className="input-style" value={params.populacao} onChange={e => setParams({...params, populacao: e.target.value})} />
              
              <label>Taxa de Transmissão (β)</label>
              <input type="number" step="0.01" className="input-style" style={{ marginBottom: '10px' }} value={params.taxaTrans} onChange={e => setParams({...params, taxaTrans: e.target.value})} />
              
              <div className="risk-meter-bg">
                <div className="risk-meter-fill" style={{ width: risk.width, backgroundColor: risk.color }}></div>
              </div>
              <span className="risk-text" style={{ color: risk.color }}>{risk.text}</span>
              
              <label>Taxa de Recuperação (γ)</label>
              <input type="number" step="0.01" className="input-style" value={params.taxaRecup} onChange={e => setParams({...params, taxaRecup: e.target.value})} />
              
              <label>Duração (Dias)</label>
              <input type="number" className="input-style" value={params.dias} onChange={e => setParams({...params, dias: e.target.value})} />
              
              <button onClick={handleSimular} disabled={isSimulating} className="btn-primary" style={{ width: '100%', marginTop: '15px' }}>
                {isSimulating ? 'A processar dados...' : 'Correr Simulação'}
              </button>
            </div>

            <div className="card fade-in delay-2" style={{ flex: 1, minWidth: '600px' }}>
              <h3 style={{ marginBottom: '25px', color: '#333333' }}>Curva Epidemiológica</h3>
              <div className="chart-container">
                <Line 
                  data={{
                    labels: Array.from({ length: resultados.s.length }, (_, i) => `Dia ${i}`),
                    datasets: [
                      {
                        label: 'Suscetíveis',
                        data: resultados.s,
                        borderColor: '#E3C53C',
                        backgroundColor: 'rgba(227, 197, 60, 0.15)',
                        fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#E3C53C', pointBorderWidth: 2, pointHoverRadius: 6, pointHitRadius: 10
                      },
                      {
                        label: 'Infetados',
                        data: resultados.i,
                        borderColor: '#333333',
                        backgroundColor: 'rgba(51, 51, 51, 0.1)',
                        fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#333333', pointBorderWidth: 2, pointHoverRadius: 6, pointHitRadius: 10
                      },
                      {
                        label: 'Recuperados',
                        data: resultados.r,
                        borderColor: '#75BFA2',
                        backgroundColor: 'rgba(117, 191, 162, 0.15)',
                        fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#fff', pointBorderColor: '#75BFA2', pointBorderWidth: 2, pointHoverRadius: 6, pointHitRadius: 10
                      },
                      {
                        label: 'Rt (Nº Reprod. Efetivo)',
                        data: resultados.rt || [],
                        borderColor: '#E74C3C',
                        backgroundColor: 'transparent',
                        borderDash: [5, 5],
                        tension: 0.4,
                        yAxisID: 'y1',
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHitRadius: 10
                      }
                    ]
                  }} 
                  options={chartOptions} 
                />
              </div>
            </div>
          </div>
        )}

        {/* VISTA: HISTÓRICO */}
        {view === 'historico' && (
          <div className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0 }}>O Meu Histórico de Simulações</h3>
              <div>
                <button onClick={exportarCSV} className="btn-secondary">Exportar CSV</button>
                <button onClick={limparHistorico} className="btn-danger">Limpar Tudo</button>
              </div>
            </div>
            {historico.length === 0 ? (
              <p style={{ color: '#777', textAlign: 'center', padding: '40px 0' }}>Ainda não realizaste nenhuma simulação.</p>
            ) : (
              <table className="table-style">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Simulação</th>
                    <th>Estado</th>
                    <th>População</th>
                    <th>Taxa Inf.</th>
                    <th>Taxa Rec.</th>
                    <th>Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(h => (
                    <tr key={h.id_simulacao}>
                      <td>{new Date(h.data_criacao).toLocaleDateString('pt-PT')}</td>
                      <td style={{ fontWeight: '500' }}>{h.nome_simulacao}</td>
                      <td><span style={{ color: '#75BFA2', fontWeight: '600', fontSize: '12px', padding: '4px 8px', backgroundColor: 'rgba(117, 191, 162, 0.1)', borderRadius: '4px' }}>{h.estado}</span></td>
                      <td>{h.populacao_inicial}</td>
                      <td>{h.taxa_infeccao}</td>
                      <td>{h.taxa_recuperacao}</td>
                      <td>{h.duracao_dias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* VISTA: ADMINISTRAÇÃO */}
        {view === 'admin' && user?.tipo === 'Admin' && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: '30px' }}>
              <h3>{adminForm.id_utilizador ? 'Editar Utilizador' : 'Adicionar Novo Utilizador'}</h3>
              <form onSubmit={guardarUtilizadorAdmin}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome</label>
                    <input type="text" className="input-style" value={adminForm.nome} onChange={e => setAdminForm({...adminForm, nome: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>E-mail</label>
                    <input type="email" className="input-style" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Telefone</label>
                    <input type="tel" className="input-style" value={adminForm.telefone} onChange={e => setAdminForm({...adminForm, telefone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Data de Nascimento</label>
                    <input type="date" className="input-style" value={adminForm.data_nascimento} onChange={e => setAdminForm({...adminForm, data_nascimento: e.target.value})} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tipo de Conta</label>
                    <select className="input-style" value={adminForm.tipo} onChange={e => setAdminForm({...adminForm, tipo: e.target.value})}>
                      <option value="User">Utilizador Normal (User)</option>
                      <option value="Admin">Administrador (Admin)</option>
                    </select>
                  </div>
                  {!adminForm.id_utilizador && (
                    <div className="form-group">
                      <label>Palavra-passe Inicial</label>
                      <input type="password" className="input-style" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} required />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-primary">{adminForm.id_utilizador ? 'Atualizar Utilizador' : 'Criar Utilizador'}</button>
                  {adminForm.id_utilizador && (
                    <button type="button" className="btn-secondary" style={{ margin: 0, backgroundColor: '#EAEAEA', color: '#333' }} onClick={() => setAdminForm({ id_utilizador: null, nome: '', email: '', password: '', tipo: 'User', data_nascimento: '', telefone: '' })}>Cancelar Edição</button>
                  )}
                </div>
              </form>
            </div>

            <div className="card">
              <h3>Gestão de Utilizadores ({utilizadores.length})</h3>
              <table className="table-style">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Telefone</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {utilizadores.map(u => (
                    <tr key={u.id_utilizador}>
                      <td>#{u.id_utilizador}</td>
                      <td style={{ fontWeight: '500' }}>{u.nome}</td>
                      <td>{u.email}</td>
                      <td>{u.telefone || '-'}</td>
                      <td>
                        <span style={{ 
                          color: u.tipo === 'Admin' ? '#E3C53C' : '#555', 
                          fontWeight: '600', fontSize: '12px', padding: '4px 8px', 
                          backgroundColor: u.tipo === 'Admin' ? 'rgba(227, 197, 60, 0.1)' : '#EAEAEA', 
                          borderRadius: '4px' 
                        }}>
                          {u.tipo}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setAdminForm({ 
                          id_utilizador: u.id_utilizador, nome: u.nome, email: u.email, 
                          tipo: u.tipo, data_nascimento: u.data_nascimento ? u.data_nascimento.split('T')[0] : '', 
                          telefone: u.telefone || '', password: '' 
                        })} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Editar</button>
                        <button onClick={() => apagarUtilizador(u.id_utilizador)} className="btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Apagar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISTA: PERFIL */}
        {view === 'perfil' && (
          <div className="fade-in" style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="card" style={{ flex: 1, minWidth: '300px' }}>
              <h3>Informações Pessoais</h3>
              <form onSubmit={atualizarPerfil}>
                <label>Nome Completo</label>
                <input type="text" className="input-style" value={perfilData.nome} onChange={e => setPerfilData({...perfilData, nome: e.target.value})} required />
                
                <label>E-mail</label>
                <input type="email" className="input-style" value={perfilData.email} onChange={e => setPerfilData({...perfilData, email: e.target.value})} required />
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Data de Nascimento</label>
                    <input type="date" className="input-style" value={perfilData.data_nascimento ? perfilData.data_nascimento.split('T')[0] : ''} onChange={e => setPerfilData({...perfilData, data_nascimento: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Telefone</label>
                    <input type="tel" className="input-style" value={perfilData.telefone} onChange={e => setPerfilData({...perfilData, telefone: e.target.value})} />
                  </div>
                </div>

                <div className="divider"></div>

                <h3 style={{ fontSize: '18px' }}>Segurança (Mudar Palavra-passe)</h3>
                <p style={{ fontSize: '13px', color: '#777', marginTop: '-10px', marginBottom: '15px' }}>Deixa em branco se não quiseres alterar a palavra-passe atual.</p>
                
                <label>Palavra-passe Atual</label>
                <input type="password" placeholder="Necessária para alterações de segurança" className="input-style" value={perfilData.senhaAtual} onChange={e => setPerfilData({...perfilData, senhaAtual: e.target.value})} />
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Nova Palavra-passe</label>
                    <input type="password" placeholder="Mínimo 8 caracteres" className="input-style" value={perfilData.novaSenha} onChange={e => setPerfilData({...perfilData, novaSenha: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Confirmar Nova Palavra-passe</label>
                    <input type="password" placeholder="Repete a nova senha" className="input-style" value={perfilData.confirmarNovaSenha} onChange={e => setPerfilData({...perfilData, confirmarNovaSenha: e.target.value})} />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '15px', width: '100%' }}>Salvar Alterações</button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
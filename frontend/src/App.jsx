import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const API_URL = 'http://127.0.0.1:5000';

function App() {
  const [user, setUser] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [params, setParams] = useState({ populacao: 1000, transmissao: 0.3, recuperacao: 0.1, dias: 100 });
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState({ totalSims: 0 });

  // Função de Login (Requisito C.1)
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, loginData);
      setUser(res.data);
    } catch (err) {
      alert("Erro nas credenciais MEDCEI");
    }
  };

  // Simulação SIR (Lógica de Negócio)
  const executarSimulacao = () => {
    let S = params.populacao - 1, I = 1, R = 0;
    const sData = [S], iData = [I], rData = [R], labels = [0];

    for (let t = 1; t <= params.dias; t++) {
      let novosInfetados = (params.transmissao * S * I) / params.populacao;
      let novosRecuperados = params.recuperacao * I;
      S -= novosInfetados; I += novosInfetados - novosRecuperados; R += novosRecuperados;
      labels.push(t); sData.push(S); iData.push(I); rData.push(R);
    }

    setChartData({
      labels,
      datasets: [
        { label: 'Suscetíveis', data: sData, borderColor: '#ECC440', backgroundColor: 'rgba(236, 196, 64, 0.2)', fill: true },
        { label: 'Infetados', data: iData, borderColor: '#282828', borderWidth: 3, fill: false },
        { label: 'Recuperados', data: rData, borderColor: '#61B695', backgroundColor: 'rgba(97, 182, 149, 0.2)', fill: true }
      ]
    });
  };

  if (!user) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <h1 style={{ color: '#61B695' }}>MEDCEI</h1>
          <p>Acesso ao Simulador</p>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Utilizador" onChange={e => setLoginData({...loginData, username: e.target.value})} style={styles.input} />
            <input type="password" placeholder="Password" onChange={e => setLoginData({...loginData, password: e.target.value})} style={styles.input} />
            <button type="submit" style={styles.button}>ENTRAR</button>
          </form>
          <p style={{fontSize: '12px'}}>Dica: admin / 123 ou user1 / 123</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h2>MEDCEI - Painel {user.role === 'admin' ? 'Administrador' : 'Explorador'}</h2>
        <span>Bem-vindo, {user.username}!</span>
        <button onClick={() => setUser(null)} style={styles.logout}>Sair</button>
      </header>

      <div style={styles.mainContent}>
        <aside style={styles.sidebar}>
          <h3>Parâmetros</h3>
          <label>População: {params.populacao}</label>
          <input type="range" min="100" max="10000" value={params.populacao} onChange={e => setParams({...params, populacao: parseInt(e.target.value)})} style={styles.range} />
          
          <label>Transmissão (β): {params.transmissao}</label>
          <input type="range" min="0.1" max="1" step="0.1" value={params.transmissao} onChange={e => setParams({...params, transmissao: parseFloat(e.target.value)})} style={styles.range} />

          <button onClick={executarSimulacao} style={styles.button}>GERAR SIMULAÇÃO</button>

          {user.role === 'admin' && (
            <div style={styles.adminStats}>
              <h4>📊 Gestão (Admin)</h4>
              <p>Simulações hoje: 12</p>
              <button style={{...styles.button, backgroundColor: '#282828'}}>Gerir Utilizadores</button>
            </div>
          )}
        </aside>

        <main style={styles.chartArea}>
          {chartData ? <Line data={chartData} /> : <p>Defina os parâmetros para visualizar a curva epidemiológica.</p>}
        </main>
      </div>
    </div>
  );
}

const styles = {
  loginPage: { height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E6F2F5' },
  loginBox: { background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' },
  input: { display: 'block', width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { width: '100%', padding: '12px', backgroundColor: '#61B695', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  appContainer: { minHeight: '100vh', backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#282828', color: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mainContent: { display: 'flex', padding: '30px', gap: '25px' },
  sidebar: { width: '320px', background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  chartArea: { flex: 1, background: 'white', padding: '25px', borderRadius: '12px' },
  range: { width: '100%', marginBottom: '20px' },
  logout: { background: 'none', border: '1px solid white', color: 'white', cursor: 'pointer', padding: '5px 10px' },
  adminStats: { marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }
};

export default App;

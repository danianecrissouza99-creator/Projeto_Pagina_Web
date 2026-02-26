const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURAÇÃO DA BASE DE DADOS (SQL SERVER) ---
// Ajusta as credenciais para o teu SQL Server local
const dbConfig = {
    user: 'Sa',             // O teu utilizador do SQL Server (ex: sa)
    password: 'Bdsql@123', // A tua password do SQL Server
    server: 'localhost',     // O teu servidor (ex: localhost ou .\SQLEXPRESS)
    database: 'MEDCEI',
    options: {
        encrypt: false,      // Usar false para desenvolvimento local
        trustServerCertificate: true
    }
};

// Conectar à Base de Dados globalmente
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('📦 Ligado ao SQL Server (MEDCEI)');
        return pool;
    })
    .catch(err => console.log('Erro de ligação à Base de Dados: ', err));

// --- 1. AUTENTICAÇÃO E REGISTO ---

// Registo de novo utilizador
app.post('/register', async (req, res) => {
    const { nome, email, password, data_nascimento, telefone } = req.body;
    
    try {
        const pool = await poolPromise;
        
        // Verificar se o email já existe
        const resultCheck = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Utilizador WHERE email = @email');

        if (resultCheck.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Este e-mail já está registado.' });
        }

        // Encriptar a password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Inserir na BD
        await pool.request()
            .input('nome', sql.VarChar, nome)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .input('tipo', sql.VarChar, 'User') // 'User' ou 'REGISTADO' dependendo do que preferes
            .input('data_nascimento', sql.Date, data_nascimento ? new Date(data_nascimento) : null)
            .input('telefone', sql.VarChar, telefone || null)
            .query(`INSERT INTO Utilizador (nome, email, password, tipo, data_nascimento, telefone) 
                    VALUES (@nome, @email, @password, @tipo, @data_nascimento, @telefone)`);
        
        res.json({ success: true, message: 'Conta criada com sucesso!' });
    } catch (error) {
        console.error("Erro no registo:", error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Utilizador WHERE email = @email');

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'E-mail ou palavra-passe incorretos.' });
        }

        const user = result.recordset[0];
        
        // --- A MAGIA ACONTECE AQUI ---
        let match = false;
        // Se a password na BD começar por '$2', sabemos que está encriptada
        if (user.password.startsWith('$2')) {
            match = await bcrypt.compare(senha, user.password);
        } else {
            // Se for o Admin (123456 em texto limpo), compara diretamente
            match = (senha === user.password);
        }

        if (match) {
            delete user.password; // Removemos a password antes de enviar para o frontend por segurança
            res.json({ success: true, user });
        } else {
            res.status(401).json({ success: false, message: 'E-mail ou palavra-passe incorretos.' });
        }
    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    }
});

// Recuperar Password
app.post('/recuperar-senha', async (req, res) => {
    const { email } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT email FROM Utilizador WHERE email = @email');

        console.log(`[SISTEMA] Pedido de recuperação de senha para: ${email}`);
        
        if (result.recordset.length > 0) {
            console.log(`[SISTEMA] E-mail encontrado. Simular envio de e-mail de recuperação...`);
        }

        res.json({ success: true, message: 'Se o e-mail existir no nosso sistema, receberás um link de recuperação em breve.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno no servidor.' });
    }
});

// --- 2. GESTÃO DE PERFIL ---

// Atualizar Perfil / Mudar Password
app.put('/utilizador/:id', async (req, res) => {
    const userId = req.params.id;
    const { nome, email, data_nascimento, telefone, senhaAtual, novaSenha } = req.body;

    try {
        const pool = await poolPromise;
        
        if (senhaAtual && novaSenha) {
            const result = await pool.request()
                .input('id', sql.Int, userId)
                .query('SELECT password FROM Utilizador WHERE id_utilizador = @id');

            if (result.recordset.length === 0) return res.status(404).json({ success: false, message: 'Utilizador não encontrado.' });

            const match = await bcrypt.compare(senhaAtual, result.recordset[0].password);
            if (!match) return res.status(401).json({ success: false, message: 'A palavra-passe atual está incorreta.' });

            const hashedNovaSenha = await bcrypt.hash(novaSenha, 10);
            await pool.request()
                .input('nome', sql.VarChar, nome)
                .input('email', sql.VarChar, email)
                .input('data_nasc', sql.Date, data_nascimento ? new Date(data_nascimento) : null)
                .input('tel', sql.VarChar, telefone || null)
                .input('pass', sql.VarChar, hashedNovaSenha)
                .input('id', sql.Int, userId)
                .query('UPDATE Utilizador SET nome = @nome, email = @email, data_nascimento = @data_nasc, telefone = @tel, password = @pass WHERE id_utilizador = @id');
        } else {
            await pool.request()
                .input('nome', sql.VarChar, nome)
                .input('email', sql.VarChar, email)
                .input('data_nasc', sql.Date, data_nascimento ? new Date(data_nascimento) : null)
                .input('tel', sql.VarChar, telefone || null)
                .input('id', sql.Int, userId)
                .query('UPDATE Utilizador SET nome = @nome, email = @email, data_nascimento = @data_nasc, telefone = @tel WHERE id_utilizador = @id');
        }

        res.json({ success: true, message: 'Perfil atualizado com sucesso.' });
    } catch (error) {
        console.error("Erro ao atualizar perfil:", error);
        res.status(500).json({ success: false, message: 'Erro ao atualizar. Verifica se o e-mail não está já em uso.' });
    }
});

// --- 3. SIMULADOR E HISTÓRICO ---

// Correr simulação e guardar nas tabelas de Simulacao, Parametros e Resultados
app.post('/simular', async (req, res) => {
    const { userId, populacao, taxaTrans, taxaRecup, dias } = req.body;

    // Gerador do Modelo SIR (Corrigido sem Math.floor prematuro)
    const pop = parseInt(populacao);
    const beta = parseFloat(taxaTrans);
    const gamma = parseFloat(taxaRecup);
    const totalDias = parseInt(dias);

    // CÁLCULO DO RT - Von Foerster (Duração média da infeção = 1 / gamma)
    const duracaoMedia = 1 / gamma;

    // Começamos o Dia 0 com pop - 1 suscetíveis e 1 infetado
    let s = [pop - 1], i = [1], r = [0], rt = []; 
    
    // Rt inicial
    rt.push(parseFloat((beta * duracaoMedia * ((pop - 1) / pop)).toFixed(2)));

    // Variáveis internas sem arredondamento para a matemática fluir
    let currentS = pop - 1;
    let currentI = 1;
    let currentR = 0;

    for (let day = 1; day < totalDias; day++) {
        // Cálculo contínuo (sem Math.floor aqui!)
        let novosInfetados = (beta * currentS * currentI) / pop;
        let novosRecuperados = gamma * currentI;

        currentS = Math.max(0, currentS - novosInfetados);
        currentI = Math.max(0, currentI + novosInfetados - novosRecuperados);
        currentR = currentR + novosRecuperados;

        // Arredondamos apenas na hora de adicionar ao gráfico
        s.push(Math.round(currentS));
        i.push(Math.round(currentI));
        r.push(Math.round(currentR));
        
        // Calcular e registar o Rt nesta fase
        let rtAtual = beta * duracaoMedia * (currentS / pop);
        rt.push(parseFloat(rtAtual.toFixed(2)));
    }

    if (userId) {
        try {
            const pool = await poolPromise;
            const nomeSim = `Simulação de ${new Date().toLocaleDateString('pt-PT')}`;
            
            // 1. Inserir em Simulacao e obter o ID gerado
            const resultSim = await pool.request()
                .input('id_utilizador', sql.Int, userId)
                .input('nome_simulacao', sql.VarChar, nomeSim)
                .input('estado', sql.VarChar, 'CONCLUIDA')
                .query(`INSERT INTO Simulacao (id_utilizador, nome_simulacao, estado, data_criacao, data_execucao) 
                        OUTPUT inserted.id_simulacao 
                        VALUES (@id_utilizador, @nome_simulacao, @estado, GETDATE(), GETDATE())`);
            
            const idSimulacao = resultSim.recordset[0].id_simulacao;

            // 2. Inserir em Parametros_Simulacao
            await pool.request()
                .input('id_sim', sql.Int, idSimulacao)
                .input('pop', sql.Int, populacao)
                .input('tax_inf', sql.Decimal(10,4), beta)
                .input('tax_rec', sql.Decimal(10,4), gamma)
                .input('dias', sql.Int, dias)
                .query(`INSERT INTO Parametros_Simulacao (id_simulacao, populacao_inicial, taxa_infeccao, taxa_recuperacao, duracao_dias) 
                        VALUES (@id_sim, @pop, @tax_inf, @tax_rec, @dias)`);

            // 3. Inserir em Resultado_Simulacao (opcional conforme a tua DB)
            const graficosJSON = JSON.stringify({ s, i, r, rt });
            await pool.request()
                .input('id_sim', sql.Int, idSimulacao)
                .input('dados', sql.NVarChar(sql.MAX), graficosJSON)
                .input('tot_inf', sql.Int, populacao - currentS)
                .input('tot_rec', sql.Int, currentR)
                .query(`INSERT INTO Resultado_Simulacao (id_simulacao, dados_grafico, total_infetados, total_recuperados) 
                        VALUES (@id_sim, @dados, @tot_inf, @tot_rec)`);
            
        } catch (error) {
            console.error("Erro ao guardar histórico:", error);
        }
    }

    res.json({ success: true, curvas: { s, i, r, rt } });
});

// Buscar histórico (Faz JOIN entre Simulacao e Parametros)
app.get('/historico/:userId', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.params.userId)
            .query(`
                SELECT s.id_simulacao, s.nome_simulacao, s.estado, s.data_criacao, 
                       p.populacao_inicial, p.taxa_infeccao, p.taxa_recuperacao, p.duracao_dias
                FROM Simulacao s
                LEFT JOIN Parametros_Simulacao p ON s.id_simulacao = p.id_simulacao
                WHERE s.id_utilizador = @id 
                ORDER BY s.data_criacao DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao carregar histórico.' });
    }
});

// Limpar histórico (CASCADE apagará parâmetros e resultados)
app.delete('/historico/limpar/:userId', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.userId)
            .query('DELETE FROM Simulacao WHERE id_utilizador = @id');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao limpar histórico.' });
    }
});

// --- 4. ADMINISTRAÇÃO ---

app.get('/admin/utilizadores', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT id_utilizador, nome, email, data_nascimento, telefone, tipo, data_registo FROM Utilizador ORDER BY id_utilizador DESC');
        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao listar utilizadores.' });
    }
});

app.post('/admin/utilizadores', async (req, res) => {
    const { nome, email, password, tipo, data_nascimento, telefone } = req.body;
    try {
        const pool = await poolPromise;
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.request()
            .input('nome', sql.VarChar, nome)
            .input('email', sql.VarChar, email)
            .input('password', sql.VarChar, hashedPassword)
            .input('tipo', sql.VarChar, tipo || 'User')
            .input('data_nascimento', sql.Date, data_nascimento ? new Date(data_nascimento) : null)
            .input('telefone', sql.VarChar, telefone || null)
            .query('INSERT INTO Utilizador (nome, email, password, tipo, data_nascimento, telefone) VALUES (@nome, @email, @password, @tipo, @data_nascimento, @telefone)');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao criar utilizador.' });
    }
});

app.put('/admin/utilizadores/:id', async (req, res) => {
    const { nome, email, tipo, data_nascimento, telefone } = req.body;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('nome', sql.VarChar, nome)
            .input('email', sql.VarChar, email)
            .input('tipo', sql.VarChar, tipo)
            .input('data_nasc', sql.Date, data_nascimento ? new Date(data_nascimento) : null)
            .input('tel', sql.VarChar, telefone || null)
            .input('id', sql.Int, req.params.id)
            .query('UPDATE Utilizador SET nome = @nome, email = @email, tipo = @tipo, data_nascimento = @data_nasc, telefone = @tel WHERE id_utilizador = @id');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao atualizar utilizador.' });
    }
});

app.delete('/admin/utilizadores/:id', async (req, res) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Utilizador WHERE id_utilizador = @id');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao apagar utilizador.' });
    }
});

// --- ARRANQUE DO SERVIDOR ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr na porta ${PORT}`);
});
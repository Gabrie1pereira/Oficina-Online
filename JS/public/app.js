const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const Stripe = require('stripe');
const stripe = Stripe('sua_chave_secreta_stripe'); // Substitua pela sua chave Stripe

const app = express();
const db = new sqlite3.Database('./database/oficina.db');

// Configurar middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Criar tabelas se não existirem
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        endereco TEXT,
        telefone TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS carros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        placa TEXT,
        ano INTEGER,
        km INTEGER,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS serviços (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        descricao TEXT,
        preco REAL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orçamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER,
        carro_id INTEGER,
        serviço_id INTEGER,
        status TEXT,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id),
        FOREIGN KEY(carro_id) REFERENCES carros(id),
        FOREIGN KEY(serviço_id) REFERENCES serviços(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS estoque (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        peça TEXT,
        quantidade INTEGER,
        preço REAL
    )`);
});

// Rotas
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/cadastro', (req, res) => {
    res.render('cadastro');
});

app.post('/cadastro', (req, res) => {
    const { nome, endereco, telefone, placa, ano, km } = req.body;
    db.run(`INSERT INTO clientes (nome, endereco, telefone) VALUES (?, ?, ?)`, [nome, endereco, telefone], function(err) {
        if (err) {
            return console.log(err.message);
        }
        const cliente_id = this.lastID;
        db.run(`INSERT INTO carros (cliente_id, placa, ano, km) VALUES (?, ?, ?, ?)`, [cliente_id, placa, ano, km], function(err) {
            if (err) {
                return console.log(err.message);
            }
            res.redirect('/');
        });
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = authenticateUser(username, password);
    if (user) {
      const token = generateJWT(user);
      res.json({ token });
    } else {
      res.status(401).send('Unauthorized');
    }
  });
  

app.get('/servicos', (req, res) => {
    db.all(`SELECT * FROM serviços`, [], (err, rows) => {
        if (err) {
            return console.log(err.message);
        }
        res.render('serviços', { serviços: rows });
    });
});

app.get('/estoque', (req, res) => {
    db.all(`SELECT * FROM estoque`, [], (err, rows) => {
        if (err) {
            return console.log(err.message);
        }
        res.render('estoque', { estoque: rows });
    });
});

// Pagamento
app.get('/pagamento', (req, res) => {
    res.render('pagamento');
});

app.post('/pagamento-pix', (req, res) => {
    const { amount } = req.body;
    // Aqui você pode integrar com uma API de Pix para gerar um QR Code
    res.send(`Simulação de pagamento via Pix no valor de R$${amount}`);
});

app.post('/pagamento', async (req, res) => {
    const { amount } = req.body;

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100, // Stripe trabalha com centavos
            currency: 'brl',
            payment_method_types: ['card'],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Adicionar peça ao estoque
app.get('/estoque/adicionar', (req, res) => {
    res.render('adicionar_estoque');
});

app.post('/estoque/adicionar', (req, res) => {
    const { peça, quantidade, preço } = req.body;
    db.run(`INSERT INTO estoque (peça, quantidade, preço) VALUES (?, ?, ?)`, [peça, quantidade, preço], function(err) {
        if (err) {
            return console.log(err.message);
        }
        res.redirect('/estoque');
    });
});

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/js/service-worker.js')
    .then(registration => {
        console.log('Service Worker registrado com sucesso:', registration);
    })
    .catch(error => {
        console.log('Falha ao registrar o Service Worker:', error);
    });
}


// Iniciar o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

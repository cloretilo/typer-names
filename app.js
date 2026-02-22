const express = require('express');
const fs = require('fs');
const session = require('express-session');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const ADMIN_USER = "admin";
const ADMIN_PASS = "ventas2024"; 
const SESSION_SECRET = "super_secret_session_key"; 

app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } 
}));

const dataFile = './data.json';
const telegramUser = "tu_usuario_telegram"; 

const requireLogin = (req, res, next) => {
    if (req.session.loggedIn) { 
        next(); 
    } else { 
        res.redirect('/login'); 
    }
};

const getData = () => {
    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, '[]'); 
        return [];
    }
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
};

const saveData = (data) => fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

app.get('/', (req, res) => {
    const inventory = getData();
    const groupedInventory = inventory.reduce((acc, item) => {
        let cat = acc.find(c => c.category === item.category);
        if (!cat) {
            cat = { category: item.category, items: [] };
            acc.push(cat);
        }
        cat.items.push(item);
        return acc;
    }, []);

    res.render('index', { inventory: groupedInventory, telegramUser });
});

app.get('/login', (req, res) => {
    if (req.session.loggedIn) return res.redirect('/admin');
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        req.session.loggedIn = true;
        res.redirect('/admin');
    } else {
        res.render('login', { error: "Invalid credentials" });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/admin', requireLogin, (req, res) => {
    const inventory = getData().reverse(); 
    res.render('admin', { inventory });
});

app.post('/admin/add', requireLogin, (req, res) => {
    let inventory = getData();
    
    let nameInput = req.body.name.trim();
    if (!nameInput.startsWith('@')) {
        nameInput = '@' + nameInput;
    }

    let priceInput = req.body.price.trim();
    if (!priceInput.startsWith('$')) {
        priceInput = '$' + priceInput;
    }

    inventory.push({
        id: Date.now(),
        category: req.body.category,
        name: nameInput,
        price: priceInput,
        status: "Available"
    });
    
    saveData(inventory);
    res.redirect('/admin');
});

app.post('/admin/toggle/:id', requireLogin, (req, res) => {
    let inventory = getData();
    const item = inventory.find(i => i.id == req.params.id);
    if (item) {
        item.status = item.status === "Available" ? "Sold" : "Available";
        saveData(inventory);
    }
    res.redirect('/admin');
});

app.post('/admin/delete/:id', requireLogin, (req, res) => {
    let inventory = getData();
    inventory = inventory.filter(i => i.id != req.params.id);
    saveData(inventory);
    res.redirect('/admin');
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Typer running. Admin panel at http://localhost:${PORT}/admin`));
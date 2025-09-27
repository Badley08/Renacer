const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration CORS - IMPORTANT pour autoriser les modifications
app.use(cors({
    origin: '*', // En production, spécifier les domaines autorisés
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuration de la base de données MySQL
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'renacer_edu',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;

// Initialiser la connexion à la base de données
async function initDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('✅ Connexion à MySQL réussie');
        
        // Créer les tables si elles n'existent pas
        await createTables();
    } catch (error) {
        console.error('❌ Erreur de connexion à MySQL:', error);
        process.exit(1);
    }
}

// Créer les tables
async function createTables() {
    const connection = await pool.getConnection();
    
    try {
        // Table des utilisateurs
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        // Table des posts du forum
        await connection.query(`
            CREATE TABLE IF NOT EXISTS forum_posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                author VARCHAR(255) NOT NULL,
                authorEmail VARCHAR(255) NOT NULL,
                user_id INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        // Table des progrès des quiz
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quiz_progress (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                quiz_id INT NOT NULL,
                score INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_user_quiz (user_id, quiz_id)
            )
        `);

        // Table des connexions (logs)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS login_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                email VARCHAR(255) NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Tables créées avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de la création des tables:', error);
    } finally {
        connection.release();
    }
}

// Emails des administrateurs
const ADMIN_EMAILS = ['karlluberisse1308@gmail.com', 'mavilennydelarosa@outlook.com'];

// Middleware pour vérifier si l'utilisateur est admin
function isAdmin(email) {
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

// ===== ROUTES D'AUTHENTIFICATION =====

// Inscription
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        // Vérifier si l'email existe déjà
        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Vérifier si c'est un admin
        const adminStatus = isAdmin(email);

        // Insérer l'utilisateur
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)',
            [name, email.toLowerCase(), hashedPassword, adminStatus]
        );

        const newUser = {
            id: result.insertId,
            name,
            email: email.toLowerCase(),
            is_admin: adminStatus
        };

        res.status(201).json({ 
            success: true, 
            message: 'Utilisateur créé avec succès',
            user: newUser 
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
    }
});

// Connexion
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        // Trouver l'utilisateur
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        const user = users[0];

        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
        }

        // Logger la connexion
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        await pool.query(
            'INSERT INTO login_logs (user_id, email, ip_address, user_agent) VALUES (?, ?, ?, ?)',
            [user.id, user.email, ipAddress, userAgent]
        );

        // Retourner l'utilisateur sans le mot de passe
        const userResponse = {
            id: user.id,
            name: user.name,
            email: user.email,
            is_admin: user.is_admin || isAdmin(user.email)
        };

        res.json({ 
            success: true, 
            message: 'Connexion réussie',
            user: userResponse 
        });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
    }
});

// ===== ROUTES DES POSTS DU FORUM =====

// Obtenir tous les posts
app.get('/api/posts', async (req, res) => {
    try {
        const [posts] = await pool.query(
            'SELECT * FROM forum_posts ORDER BY created_at DESC'
        );
        res.json({ success: true, posts });
    } catch (error) {
        console.error('Erreur lors de la récupération des posts:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer un post
app.post('/api/posts', async (req, res) => {
    try {
        const { title, content, author, authorEmail } = req.body;

        if (!title || !content || !author || !authorEmail) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        // Trouver l'ID de l'utilisateur
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [authorEmail]);
        const userId = users.length > 0 ? users[0].id : null;

        const [result] = await pool.query(
            'INSERT INTO forum_posts (title, content, author, authorEmail, user_id) VALUES (?, ?, ?, ?, ?)',
            [title, content, author, authorEmail.toLowerCase(), userId]
        );

        const [newPost] = await pool.query(
            'SELECT * FROM forum_posts WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Post créé avec succès',
            post: newPost[0] 
        });
    } catch (error) {
        console.error('Erreur lors de la création du post:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un post
app.delete('/api/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;

        await pool.query('DELETE FROM forum_posts WHERE id = ?', [postId]);

        res.json({ 
            success: true, 
            message: 'Post supprimé avec succès' 
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du post:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===== ROUTES DES QUIZ =====

// Obtenir le progrès d'un utilisateur
app.get('/api/quiz-progress/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        const [rows] = await pool.query(
            'SELECT quiz_id, score FROM quiz_progress WHERE user_id = ?',
            [userId]
        );

        const progress = {};
        rows.forEach(row => {
            progress[row.quiz_id] = row.score;
        });

        res.json({ success: true, progress });
    } catch (error) {
        console.error('Erreur lors de la récupération du progrès:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Sauvegarder le progrès d'un quiz
app.post('/api/quiz-progress', async (req, res) => {
    try {
        const { userId, quizId, score } = req.body;

        if (!userId || !quizId || score === undefined) {
            return res.status(400).json({ error: 'Données manquantes' });
        }

        await pool.query(
            `INSERT INTO quiz_progress (user_id, quiz_id, score) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE score = GREATEST(score, VALUES(score)), updated_at = CURRENT_TIMESTAMP`,
            [userId, quizId, score]
        );

        res.json({ 
            success: true, 
            message: 'Progrès sauvegardé avec succès' 
        });
    } catch (error) {
        console.error('Erreur lors de la sauvegarde du progrès:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===== ROUTES ADMINISTRATEUR =====

// Obtenir tous les utilisateurs (Admin seulement)
app.get('/api/admin/users', async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, name, email, is_admin, created_at FROM users ORDER BY created_at DESC'
        );

        res.json({ success: true, users });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un utilisateur (Admin seulement)
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Vérifier que l'utilisateur n'est pas admin
        const [user] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
        
        if (user.length > 0 && isAdmin(user[0].email)) {
            return res.status(403).json({ error: 'Impossible de supprimer un administrateur' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [userId]);

        res.json({ 
            success: true, 
            message: 'Utilisateur supprimé avec succès' 
        });
    } catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir les statistiques (Admin seulement)
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [userCount] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [postCount] = await pool.query('SELECT COUNT(*) as count FROM forum_posts');
        const [quizCount] = await pool.query('SELECT COUNT(*) as count FROM quiz_progress');

        res.json({
            success: true,
            totalUsers: userCount[0].count,
            totalPosts: postCount[0].count,
            totalQuizAttempts: quizCount[0].count
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir les logs de connexion (Admin seulement)
app.get('/api/admin/login-logs', async (req, res) => {
    try {
        const [logs] = await pool.query(
            `SELECT ll.*, u.name 
             FROM login_logs ll 
             JOIN users u ON ll.user_id = u.id 
             ORDER BY ll.login_time DESC 
             LIMIT 100`
        );

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Erreur lors de la récupération des logs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===== ROUTE PAR DÉFAUT =====

app.get('/', (req, res) => {
    res.json({ 
        message: 'Bienvenue sur l\'API Renacer EDU', 
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth/register, /api/auth/login',
            posts: '/api/posts',
            quiz: '/api/quiz-progress',
            admin: '/api/admin/*'
        }
    });
});

// ===== DÉMARRAGE DU SERVEUR =====

initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
        console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
    });
});

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
    console.error('❌ Erreur non gérée:', error);
});

process.on('SIGINT', async () => {
    if (pool) {
        await pool.end();
    }
    console.log('\n👋 Serveur arrêté');
    process.exit(0);
});
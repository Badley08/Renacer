// Configuration API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let currentUser = null;
let forumPosts = [];
let allUsers = [];
let quizProgress = {};
let currentQuiz = null;
let currentQuestion = 0;
let quizScore = 0;

const ADMIN_EMAILS = ['karlluberisse1308@gmail.com', 'mavilennydelarosa@outlook.com'];

// Quizzes
const quizzes = [
    {
        id: 1,
        title: 'Matem�ticas B�sicas',
        description: 'Quiz de operaciones matem�ticas fundamentales',
        emoji: '\U0001f522',
        questions: [
            { question: '�Cu�nto es 15 + 27?', options: ['32', '42', '52', '62'], correct: 1 },
            { question: '�Cu�nto es 8 � 7?', options: ['48', '54', '56', '64'], correct: 2 },
            { question: '�Cu�nto es 100 � 4?', options: ['20', '25', '30', '35'], correct: 1 },
            { question: '�Cu�nto es 50 - 23?', options: ['17', '27', '37', '47'], correct: 1 },
            { question: '�Cu�l es el resultado de 3�?', options: ['6', '9', '12', '15'], correct: 1 }
        ]
    },
    {
        id: 2,
        title: 'Historia Universal',
        description: 'Eventos importantes de la historia mundial',
        emoji: '\U0001f3db\ufe0f',
        questions: [
            { question: '�En qu� a�o cay� el Imperio Romano de Occidente?', options: ['376 d.C.', '476 d.C.', '576 d.C.', '676 d.C.'], correct: 1 },
            { question: '�Qui�n descubri� Am�rica?', options: ['Vasco da Gama', 'Crist�bal Col�n', 'Fernando de Magallanes', 'Marco Polo'], correct: 1 },
            { question: '�Cu�ndo inici� la Segunda Guerra Mundial?', options: ['1935', '1937', '1939', '1941'], correct: 2 },
            { question: '�Qu� civilizaci�n construy� Machu Picchu?', options: ['Aztecas', 'Mayas', 'Incas', 'Olmecas'], correct: 2 },
            { question: '�En qu� a�o lleg� el hombre a la Luna?', options: ['1967', '1969', '1971', '1973'], correct: 1 }
        ]
    },
    {
        id: 3,
        title: 'Ciencias Naturales',
        description: 'Conceptos b�sicos de biolog�a, f�sica y qu�mica',
        emoji: '\U0001f52c',
        questions: [
            { question: '�Cu�l es el planeta m�s grande del sistema solar?', options: ['Saturno', 'J�piter', 'Neptuno', 'Urano'], correct: 1 },
            { question: '�Cu�ntos cromosomas tiene el ser humano?', options: ['23', '46', '48', '92'], correct: 1 },
            { question: '�Qu� gas respiran las plantas?', options: ['Ox�geno', 'Nitr�geno', 'CO2', 'Hidr�geno'], correct: 2 },
            { question: '�A qu� velocidad viaja la luz?', options: ['200,000 km/s', '300,000 km/s', '400,000 km/s', '500,000 km/s'], correct: 1 },
            { question: '�Cu�l es el s�mbolo qu�mico del oro?', options: ['Or', 'Au', 'Go', 'Ag'], correct: 1 }
        ]
    }
];

// ===== API CALLS =====

async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_URL}${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error en la petici�n');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ===== UTILIDADES =====

function isAdmin(email) {
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    if (pageId === 'homePage') renderHome();
    if (pageId === 'forumPage') renderForum();
    if (pageId === 'educationPage') renderEducation();
    if (pageId === 'profilePage') renderProfile();
    if (pageId === 'adminPage') renderAdmin();
}

function showAlert(elementId, message, type) {
    const alertClass = type === 'error' ? 'alert-error' : 'alert-success';
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    setTimeout(() => element.innerHTML = '', 5000);
}

// ===== AUTENTICACI�N =====

async function register() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
        showAlert('registerAlert', 'Por favor completa todos los campos', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('registerAlert', 'La contrase�a debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        const result = await apiCall('/auth/register', 'POST', { name, email, password });
        showAlert('registerAlert', '�Registro exitoso! Ahora puedes iniciar sesi�n', 'success');
        setTimeout(() => showPage('loginPage'), 2000);
    } catch (error) {
        showAlert('registerAlert', error.message, 'error');
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAlert('loginAlert', 'Por favor completa todos los campos', 'error');
        return;
    }

    try {
        const result = await apiCall('/auth/login', 'POST', { email, password });
        currentUser = result.user;
        localStorage.setItem('renacer_user', JSON.stringify(currentUser));
        showPage('homePage');
    } catch (error) {
        showAlert('loginAlert', error.message, 'error');
    }
}

function logout() {
    if (confirm('�Seguro que quieres cerrar sesi�n?')) {
        currentUser = null;
        localStorage.removeItem('renacer_user');
        showPage('homePage');
    }
}

// ===== RENDER HOME =====

function renderHome() {
    const actionsHTML = currentUser 
        ? `
            <span style="color: #4F46E5; font-weight: 600;">${currentUser.name}</span>
            ${isAdmin(currentUser.email) ? '<span class="admin-badge">\U0001f451 Admin</span>' : ''}
            ${isAdmin(currentUser.email) ? '<button onclick="showPage(\'adminPage\')" class="btn btn-warning btn-small">\u2699\ufe0f Admin</button>' : ''}
        `
        : '';
    
    document.getElementById('headerActions').innerHTML = actionsHTML;

    if (!currentUser) {
        document.getElementById('homeContent').innerHTML = `
            <div class="center-page">
                <div class="card welcome-card" style="text-align: center;">
                    <h1 style="font-size: 48px; margin-bottom: 20px;">\U0001f331 Renacer EDU</h1>
                    <p style="color: #6B7280; margin-bottom: 30px; font-size: 18px;">Plataforma educativa para el crecimiento continuo</p>
                    <button onclick="showPage('loginPage')" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">Iniciar Sesi�n</button>
                    <button onclick="showPage('registerPage')" class="btn btn-success" style="width: 100%;">Registrarse</button>
                </div>
            </div>
        `;
    } else {
        document.getElementById('homeContent').innerHTML = `
            <div class="card">
                <h2 style="margin-bottom: 10px;">�Hola, ${currentUser.name}! \U0001f44b</h2>
                ${isAdmin(currentUser.email) ? '<span class="admin-badge">\U0001f451 Administrador</span>' : ''}
            </div>
            <div class="card-grid">
                <div class="card card-hover" onclick="showPage('forumPage')">
                    <div style="font-size: 48px; text-align: center; margin-bottom: 15px;">\U0001f4ac</div>
                    <h3 style="text-align: center; margin-bottom: 10px;">Foro</h3>
                    <p style="text-align: center; color: #6B7280;">Comparte ideas y aprende de otros</p>
                </div>
                <div class="card card-hover" onclick="showPage('educationPage')">
                    <div style="font-size: 48px; text-align: center; margin-bottom: 15px;">\U0001f4da</div>
                    <h3 style="text-align: center; margin-bottom: 10px;">Educaci�n</h3>
                    <p style="text-align: center; color: #6B7280;">Quiz y lecciones interactivas</p>
                </div>
                <div class="card card-hover" onclick="showPage('profilePage')">
                    <div style="font-size: 48px; text-align: center; margin-bottom: 15px;">\U0001f464</div>
                    <h3 style="text-align: center; margin-bottom: 10px;">Mi Perfil</h3>
                    <p style="text-align: center; color: #6B7280;">Revisa tu progreso</p>
                </div>
            </div>
        `;
    }
}

// ===== FORO =====

async function loadForumPosts() {
    try {
        const result = await apiCall('/posts');
        forumPosts = result.posts;
        renderForum();
    } catch (error) {
        console.error('Error al cargar posts:', error);
    }
}

function toggleNewPost() {
    const form = document.getElementById('newPostForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function createPost() {
    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) {
        alert('Por favor completa todos los campos');
        return;
    }

    try {
        await apiCall('/posts', 'POST', {
            title,
            content,
            author: currentUser.name,
            authorEmail: currentUser.email
        });

        document.getElementById('postTitle').value = '';
        document.getElementById('postContent').value = '';
        toggleNewPost();
        await loadForumPosts();
    } catch (error) {
        alert('Error al crear el post: ' + error.message);
    }
}

async function deletePost(postId) {
    if (confirm('�Eliminar esta publicaci�n?')) {
        try {
            await apiCall(`/posts/${postId}`, 'DELETE');
            await loadForumPosts();
        } catch (error) {
            alert('Error al eliminar el post: ' + error.message);
        }
    }
}

function renderForum() {
    const postsHTML = forumPosts.length === 0 
        ? '<div class="card"><p style="text-align: center; color: #6B7280;">No hay mensajes a�n. �S� el primero en publicar!</p></div>'
        : forumPosts.map(post => `
            <div class="post">
                <div class="post-header">
                    <div>
                        <div class="post-title">${post.title}</div>
                        <div class="post-meta">
                            Por ${post.author} 
                            ${isAdmin(post.authorEmail) ? '<span class="admin-badge">\U0001f451 Admin</span>' : ''}
                            \u2022 ${new Date(post.created_at).toLocaleString('es-ES')}
                        </div>
                    </div>
                    ${(isAdmin(currentUser.email) || post.authorEmail === currentUser.email) 
                        ? `<button onclick="deletePost(${post.id})" class="btn btn-danger btn-small">\U0001f5d1\ufe0f</button>` 
                        : ''}
                </div>
                <div class="post-content">${post.content}</div>
            </div>
        `).join('');

    document.getElementById('forumPosts').innerHTML = postsHTML;
}

// ===== EDUCACI�N =====

async function loadQuizProgress() {
    try {
        const result = await apiCall(`/quiz-progress/${currentUser.id}`);
        quizProgress = result.progress || {};
        renderEducation();
    } catch (error) {
        console.error('Error al cargar progreso:', error);
    }
}

function renderEducation() {
    const quizzesHTML = quizzes.map(quiz => {
        const progress = quizProgress[quiz.id] || 0;
        return `
            <div class="card card-hover" onclick="startQuiz(${quiz.id})">
                <div style="font-size: 48px; text-align: center; margin-bottom: 15px;">${quiz.emoji}</div>
                <h3 style="margin-bottom: 10px;">${quiz.title}</h3>
                <p style="color: #6B7280; margin-bottom: 15px;">${quiz.description}</p>
                <p style="font-size: 14px; color: #6B7280;">${quiz.questions.length} preguntas</p>
                ${progress > 0 ? `<p style="font-size: 14px; color: #10B981; font-weight: 600;">Mejor puntaje: ${progress}/${quiz.questions.length}</p>` : ''}
            </div>
        `;
    }).join('');

    document.getElementById('quizList').innerHTML = quizzesHTML;
}

// ===== QUIZ =====

function startQuiz(quizId) {
    currentQuiz = quizzes.find(q => q.id === quizId);
    currentQuestion = 0;
    quizScore = 0;
    showPage('quizPage');
    renderQuestion();
}

function renderQuestion() {
    const question = currentQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / currentQuiz.questions.length) * 100;

    document.getElementById('quizTitle').textContent = currentQuiz.title;
    document.getElementById('questionNumber').textContent = `Pregunta ${currentQuestion + 1} de ${currentQuiz.questions.length}`;
    document.getElementById('quizProgress').style.width = progress + '%';
    document.getElementById('questionText').textContent = question.question;

    const optionsHTML = question.options.map((option, index) => 
        `<button class="quiz-option" onclick="selectAnswer(${index})">${option}</button>`
    ).join('');

    document.getElementById('quizOptions').innerHTML = optionsHTML;
}

function selectAnswer(optionIndex) {
    const question = currentQuiz.questions[currentQuestion];
    
    if (optionIndex === question.correct) {
        quizScore++;
    }

    if (currentQuestion < currentQuiz.questions.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    if (!quizProgress[currentQuiz.id] || quizScore > quizProgress[currentQuiz.id]) {
        quizProgress[currentQuiz.id] = quizScore;
        
        try {
            await apiCall('/quiz-progress', 'POST', {
                userId: currentUser.id,
                quizId: currentQuiz.id,
                score: quizScore
            });
        } catch (error) {
            console.error('Error al guardar progreso:', error);
        }
    }

    const percentage = (quizScore / currentQuiz.questions.length) * 100;
    document.getElementById('finalScore').textContent = `${quizScore}/${currentQuiz.questions.length}`;
    document.getElementById('finalPercentage').textContent = `${percentage.toFixed(0)}% de aciertos`;
    showPage('resultsPage');
}

// ===== PERFIL =====

async function renderProfile() {
    await loadQuizProgress();
    
    const completedQuizzes = Object.keys(quizProgress).length;
    const totalScore = Object.values(quizProgress).reduce((a, b) => a + b, 0);
    
    try {
        const result = await apiCall('/posts');
        const userPosts = result.posts.filter(p => p.authorEmail === currentUser.email).length;

        document.getElementById('profileInfo').innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: 700; margin-right: 20px;">
                    ${currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h2 style="margin-bottom: 5px;">${currentUser.name}</h2>
                    <p style="color: #6B7280; margin-bottom: 5px;">${currentUser.email}</p>
                    ${isAdmin(currentUser.email) ? '<span class="admin-badge">\U0001f451 Administrador</span>' : ''}
                </div>
            </div>
        `;

        document.getElementById('userStats').innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${completedQuizzes}</div>
                <div class="stat-label">Quiz Completados</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalScore}</div>
                <div class="stat-label">Puntos Totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${userPosts}</div>
                <div class="stat-label">Posts en Foro</div>
            </div>
        `;

        if (completedQuizzes > 0) {
            const resultsHTML = Object.entries(quizProgress).map(([quizId, score]) => {
                const quiz = quizzes.find(q => q.id == quizId);
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #F9FAFB; border-radius: 10px; margin-bottom: 10px;">
                        <span style="font-weight: 600;">${quiz.emoji} ${quiz.title}</span>
                        <span style="color: #10B981; font-weight: 700;">${score}/${quiz.questions.length}</span>
                    </div>
                `;
            }).join('');

            document.getElementById('quizResults').innerHTML = `
                <h3 style="margin-bottom: 15px;">Tus Resultados</h3>
                ${resultsHTML}
            `;
        } else {
            document.getElementById('quizResults').innerHTML = '';
        }
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
}

// ===== ADMIN =====

async function loadAllUsers() {
    try {
        const result = await apiCall('/admin/users');
        allUsers = result.users;
        renderAdmin();
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
    }
}

async function deleteUser(userId) {
    if (confirm('�Est�s seguro de eliminar este usuario? Esta acci�n es irreversible.')) {
        try {
            await apiCall(`/admin/users/${userId}`, 'DELETE');
            await loadAllUsers();
        } catch (error) {
            alert('Error al eliminar usuario: ' + error.message);
        }
    }
}

async function renderAdmin() {
    if (!isAdmin(currentUser.email)) {
        showPage('homePage');
        return;
    }

    await loadAllUsers();
    await loadForumPosts();

    // Lista de usuarios
    const usersHTML = allUsers.map(user => `
        <div class="user-item">
            <div class="user-info">
                <h4>${user.name} ${isAdmin(user.email) ? '<span class="admin-badge">\U0001f451 Admin</span>' : ''}</h4>
                <p>${user.email}</p>
                <p style="font-size: 12px; color: #9CA3AF;">Registrado: ${new Date(user.created_at).toLocaleDateString('es-ES')}</p>
            </div>
            <div class="user-actions">
                ${!isAdmin(user.email) ? `<button onclick="deleteUser(${user.id})" class="btn btn-danger btn-small">\U0001f5d1\ufe0f Eliminar</button>` : ''}
            </div>
        </div>
    `).join('');

    document.getElementById('usersList').innerHTML = usersHTML;

    // Lista de posts
    const adminPostsHTML = forumPosts.map(post => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #F9FAFB; border-radius: 10px; margin-bottom: 10px;">
            <div>
                <strong>${post.title}</strong>
                <p style="font-size: 14px; color: #6B7280;">Por ${post.author} - ${new Date(post.created_at).toLocaleString('es-ES')}</p>
            </div>
            <button onclick="deletePost(${post.id})" class="btn btn-danger btn-small">\U0001f5d1\ufe0f</button>
        </div>
    `).join('');

    document.getElementById('adminPostsList').innerHTML = adminPostsHTML;

    // Estad�sticas
    try {
        const statsResult = await apiCall('/admin/stats');
        document.getElementById('adminStats').innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${statsResult.totalUsers}</div>
                <div class="stat-label">Usuarios Totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${statsResult.totalPosts}</div>
                <div class="stat-label">Posts Totales</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${statsResult.totalQuizAttempts}</div>
                <div class="stat-label">Quiz Realizados</div>
            </div>
        `;
    } catch (error) {
        console.error('Error al cargar estad�sticas:', error);
    }
}

// ===== INICIALIZACI�N =====

window.onload = function() {
    // Registrar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    // Cargar sesi�n
    const savedUser = localStorage.getItem('renacer_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }

    renderHome();
    
    // Cargar datos si hay usuario
    if (currentUser) {
        loadForumPosts();
        loadQuizProgress();
    }
};
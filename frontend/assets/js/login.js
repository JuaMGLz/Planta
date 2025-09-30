let isLoginMode = true;

// Función para alternar entre Login y Registro
function toggleAuthMode(event) {
    event.preventDefault(); 
    isLoginMode = !isLoginMode;

    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const toggleAuth = document.getElementById('toggle-auth');
    const statusMessage = document.getElementById('status-message');
    
    statusMessage.classList.add('hidden'); 

    if (isLoginMode) {
        formTitle.textContent = 'INICIAR SESIÓN | ACCESO AL SISTEMA';
        submitBtn.textContent = 'ACCEDER AL SERVIDOR';
        toggleAuth.innerHTML = '¿No tienes una cuenta de usuario? <a href="#" onclick="toggleAuthMode(event)">CREAR CUENTA</a>';
    } else {
        formTitle.textContent = 'REGISTRO DE USUARIO | NUEVA CUENTA';
        submitBtn.textContent = 'REGISTRAR Y JUGAR';
        toggleAuth.innerHTML = '¿Ya tienes una cuenta de usuario? <a href="#" onclick="toggleAuthMode(event)">INICIAR SESIÓN</a>';
    }
}

// Función para simular la redirección con un mensaje de "cargando"
function startLoadingAndRedirect(statusMessage, success = true) {
    statusMessage.textContent = '⚙️ CONECTANDO AL SERVIDOR... VALIDANDO CREDENCIALES.';
    statusMessage.classList.remove('hidden', 'message-error');
    statusMessage.classList.add('message-success');

    // Simular un tiempo de carga del juego/servidor
    setTimeout(() => {
        if (success) {
            statusMessage.textContent = '✅ ACCESO AUTORIZADO. CARGANDO INTERFAZ...';
            setTimeout(() => {
                // Redirigir al dashboard
                window.location.href = 'dashboard.html'; 
            }, 1000);
        } else {
            statusMessage.textContent = '❌ ERROR: CREDENCIALES DE ACCESO DENEGADAS.';
            statusMessage.classList.remove('message-success');
            statusMessage.classList.add('message-error');
        }
    }, 1500);
}


// Función principal para manejar el envío del formulario
function handleAuth(event) {
    event.preventDefault(); 

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const statusMessage = document.getElementById('status-message');

    statusMessage.classList.remove('message-success', 'message-error');
    statusMessage.classList.add('hidden');

    if (!email || !password) {
        statusMessage.textContent = '⚠️ DATOS INCOMPLETOS: CORREO Y CONTRASEÑA REQUERIDOS.';
        statusMessage.classList.add('message-error');
        statusMessage.classList.remove('hidden');
        return;
    }

    if (isLoginMode) {
        // Simulación de Login
        if (email === "test@smartplant.com" && password === "password123") {
            startLoadingAndRedirect(statusMessage, true);
        } else {
            startLoadingAndRedirect(statusMessage, false);
        }
    } else {
        // Simulación de Registro
        startLoadingAndRedirect(statusMessage, true);
    }
}

// Función de marcador de posición para Login con Google
function loginWithGoogle() {
    const statusMessage = document.getElementById('status-message');
    statusMessage.classList.remove('message-error');
    statusMessage.classList.add('hidden');

    startLoadingAndRedirect(statusMessage, true);
}

// Inicializar el estado al cargar
document.addEventListener('DOMContentLoaded', () => {
    // Asegura que el estado inicial sea "Iniciar Sesión" con el nuevo texto
    toggleAuthMode(new Event('click')); // Esto invierte el estado a "Registro"
    toggleAuthMode(new Event('click')); // Y luego lo vuelve a poner en "Login"
});
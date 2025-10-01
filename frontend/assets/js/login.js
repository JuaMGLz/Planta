let isLoginMode = true;

// Función auxiliar para validar formato de email
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

function toggleAuthMode(event) {
    if (event) event.preventDefault();
    isLoginMode = !isLoginMode;

    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const toggleAuth = document.getElementById('toggle-auth');
    const statusMessage = document.getElementById('status-message');
    
    // Elementos del DOM
    const gUser = document.getElementById('group-username');
    const gName = document.getElementById('group-fullname');
    const gAvatar = document.getElementById('group-avatar'); 
    const emailOrUserLabel = document.getElementById('email_or_username').previousElementSibling;

    statusMessage.classList.add('hidden');

    if (isLoginMode) {
        // MODO: INICIAR SESIÓN
        formTitle.textContent = 'INICIAR SESIÓN | ACCESO AL SISTEMA';
        submitBtn.textContent = 'ACCEDER AL SERVIDOR';
        toggleAuth.innerHTML = '¿No tienes una cuenta de usuario? <a href="#" onclick="toggleAuthMode(event)">CREAR CUENTA</a>';
        
        // Ocultar campos de registro
        gUser.classList.add('hidden');
        gName.classList.add('hidden');
        gAvatar.classList.add('hidden'); 
        // Actualizar etiqueta del campo principal
        emailOrUserLabel.textContent = 'Usuario o Correo Electrónico'; 

    } else {
        // MODO: REGISTRO (Muestra los campos de usuario)
        formTitle.textContent = 'REGISTRO DE USUARIO | NUEVA CUENTA';
        submitBtn.textContent = 'REGISTRAR';
        toggleAuth.innerHTML = '¿Ya tienes una cuenta de usuario? <a href="#" onclick="toggleAuthMode(event)">INICIAR SESIÓN</a>';

        // Mostrar campos de registro
        gUser.classList.remove('hidden');
        gName.classList.remove('hidden');
        gAvatar.classList.remove('hidden'); 
        // Actualizar etiqueta del campo principal
        emailOrUserLabel.textContent = 'Correo Electrónico'; 
    }
}

function showStatus(msg, ok=true) {
    const el = document.getElementById('status-message');
    el.textContent = msg;
    el.classList.remove('hidden','message-success','message-error');
    el.classList.add(ok ? 'message-success' : 'message-error');
}

async function handleAuth(event) {
    event.preventDefault();
    
    // Correo/Usuario y Contraseña son siempre necesarios
    const login_input = document.getElementById('email_or_username').value.trim(); 
    const password = document.getElementById('password').value;
    
    // Campos de registro (pueden ser nulos en Login)
    const username = document.getElementById('username')?.value?.trim();
    const full_name = document.getElementById('full_name')?.value?.trim() || null; // Opcional
    const avatar_url = document.getElementById('avatar_url')?.value?.trim() || null; // Opcional

    if (!login_input || !password) return showStatus('⚠️ DATOS INCOMPLETOS: Correo/Usuario y Contraseña son requeridos.', false);
    
    try {
        if (isLoginMode) {
            // ***** LÓGICA DE INICIO DE SESIÓN *****
            if (!isValidEmail(login_input)) {
                 return showStatus('⚠️ Para Iniciar Sesión, utiliza tu Correo Electrónico y Contraseña.', false);
            }
            
            showStatus('⚙️ CONECTANDO AL SERVIDOR... VALIDANDO CREDENCIALES.');
            const { error } = await supabase.auth.signInWithPassword({ email: login_input, password }); 
            
            if (error) throw error;
            showStatus('✅ ACCESO AUTORIZADO. CARGANDO INTERFAZ...');
            // Solo redirección relativa (funciona si ya estamos en la subcarpeta)
            setTimeout(()=> location.href = 'dashboard.html', 700); 
            
        } else {
            // ***** LÓGICA DE REGISTRO *****
            
            if (!isValidEmail(login_input)) {
                return showStatus('⚠️ REGISTRO: Debes usar un Correo Electrónico válido para crear la cuenta.', false);
            }
            
            if (!username) {
                return showStatus('⚠️ REGISTRO: El Nombre de Usuario es obligatorio para crear una cuenta directa.', false);
            }

            showStatus('⚙️ CREANDO CUENTA...');
            
            const { error } = await supabase.auth.signUp({
                email: login_input,
                password,
                options: {
                    data: { 
                        username, 
                        full_name, 
                        url_avatar: avatar_url, 
                        limite_plantas: 5,
                        es_administrador: false
                    },
                    // *** CORRECCIÓN: Usar la ruta absoluta para el correo de confirmación ***
                    emailRedirectTo: `${location.origin}/Planta/dashboard.html` 
                }
            });

            if (error) throw error;
            showStatus('✅ Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.');
        }
    } catch (err) {
        console.error(err);
        let errorMessage = err.message || 'Error de autenticación';
        if (errorMessage.includes('duplicate key value violates unique constraint')) {
             errorMessage = 'El Nombre de Usuario o Correo Electrónico ya está en uso. Intenta con otro.';
        }
        showStatus('❌ ' + errorMessage, false);
    }
}

async function loginWithGoogle() {
    try {
        showStatus('⚙️ Abriendo Google...');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            // *** CORRECCIÓN: Usar la ruta absoluta para el redireccionamiento OAuth ***
            options: { redirectTo: `${location.origin}/Planta/dashboard.html` }
        });
        if (error) throw error;
    } catch (err) {
        showStatus('❌ ' + (err.message || 'No se pudo iniciar con Google'), false);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('group-username')?.classList.add('hidden');
    document.getElementById('group-fullname')?.classList.add('hidden');
    document.getElementById('group-avatar')?.classList.add('hidden');
    
    if (!isLoginMode) toggleAuthMode(new Event('click'));
});
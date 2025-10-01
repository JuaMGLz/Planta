/************  CONFIG RUTAS (local y GitHub Pages)  ************/

// ¿Estamos en GitHub Pages (project site)?
const IS_GH_PAGES = location.hostname.endsWith("github.io");

// En GH Pages tu dashboard vive en la raíz del repo:
const DASHBOARD_PATH_REL_GH = "dashboard.html";
// En local vive dentro de /frontend:
const DASHBOARD_PATH_REL_LOCAL = "frontend/dashboard.html";

// Ruta relativa correcta según entorno (¡sin slash inicial!)
const DASHBOARD_PATH_REL = IS_GH_PAGES ? DASHBOARD_PATH_REL_GH : DASHBOARD_PATH_REL_LOCAL;

// Prefijo /<repo>/ cuando estamos en GH Pages (p. ej. /Planta/). En local es "/".
const firstSeg = location.pathname.split("/").filter(Boolean)[0] || "";
const REPO_PREFIX = IS_GH_PAGES && firstSeg ? `/${firstSeg}/` : "/";

// URL final absoluta del dashboard
const DASHBOARD_URL = new URL(DASHBOARD_PATH_REL, `${location.origin}${REPO_PREFIX}`).href;

/*******************  LÓGICA DE LOGIN/REGISTRO  *******************/
let isLoginMode = true;

// Validación de email
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function toggleAuthMode(event) {
  if (event) event.preventDefault();
  isLoginMode = !isLoginMode;

  const formTitle = document.getElementById("form-title");
  const submitBtn = document.getElementById("submit-btn");
  const toggleAuth = document.getElementById("toggle-auth");
  const statusMessage = document.getElementById("status-message");

  const gUser = document.getElementById("group-username");
  const gName = document.getElementById("group-fullname");
  const gAvatar = document.getElementById("group-avatar");
  const emailOrUserLabel =
    document.getElementById("email_or_username").previousElementSibling;

  statusMessage.classList.add("hidden");

  if (isLoginMode) {
    formTitle.textContent = "INICIAR SESIÓN | ACCESO AL SISTEMA";
    submitBtn.textContent = "ACCEDER AL SERVIDOR";
    toggleAuth.innerHTML =
      '¿No tienes una cuenta de usuario? <a href="#" onclick="toggleAuthMode(event)">CREAR CUENTA</a>';

    gUser.classList.add("hidden");
    gName.classList.add("hidden");
    gAvatar.classList.add("hidden");
    emailOrUserLabel.textContent = "Usuario o Correo Electrónico";
  } else {
    formTitle.textContent = "REGISTRO DE USUARIO | NUEVA CUENTA";
    submitBtn.textContent = "REGISTRAR";
    toggleAuth.innerHTML =
      '¿Ya tienes una cuenta de usuario? <a href="#" onclick="toggleAuthMode(event)">INICIAR SESIÓN</a>';

    gUser.classList.remove("hidden");
    gName.classList.remove("hidden");
    gAvatar.classList.remove("hidden");
    emailOrUserLabel.textContent = "Correo Electrónico";
  }
}

function showStatus(msg, ok = true) {
  const el = document.getElementById("status-message");
  el.textContent = msg;
  el.classList.remove("hidden", "message-success", "message-error");
  el.classList.add(ok ? "message-success" : "message-error");
}

async function handleAuth(event) {
  event.preventDefault();

  const login_input = document.getElementById("email_or_username").value.trim();
  const password = document.getElementById("password").value;

  const username = document.getElementById("username")?.value?.trim();
  const full_name = document.getElementById("full_name")?.value?.trim() || null;
  const avatar_url =
    document.getElementById("avatar_url")?.value?.trim() || null;

  if (!login_input || !password) {
    return showStatus(
      "⚠️ DATOS INCOMPLETOS: Correo/Usuario y Contraseña son requeridos.",
      false
    );
  }

  try {
    if (isLoginMode) {
      if (!isValidEmail(login_input)) {
        return showStatus(
          "⚠️ Para Iniciar Sesión, utiliza tu Correo Electrónico y Contraseña.",
          false
        );
      }

      showStatus("⚙️ CONECTANDO AL SERVIDOR... VALIDANDO CREDENCIALES.");
      const { error } = await supabase.auth.signInWithPassword({
        email: login_input,
        password,
      });
      if (error) throw error;

      showStatus("✅ ACCESO AUTORIZADO. CARGANDO INTERFAZ...");
      setTimeout(() => {
        location.href = DASHBOARD_URL;
      }, 700);
    } else {
      if (!isValidEmail(login_input)) {
        return showStatus(
          "⚠️ REGISTRO: Debes usar un Correo Electrónico válido para crear la cuenta.",
          false
        );
      }
      if (!username) {
        return showStatus(
          "⚠️ REGISTRO: El Nombre de Usuario es obligatorio para crear una cuenta directa.",
          false
        );
      }

      showStatus("⚙️ CREANDO CUENTA...");
      const { error } = await supabase.auth.signUp({
        email: login_input,
        password,
        options: {
          data: {
            username,
            full_name,
            url_avatar: avatar_url,
            limite_plantas: 5,
            es_administrador: false,
          },
          // A dónde regresará tras confirmar el correo
          emailRedirectTo: DASHBOARD_URL,
        },
      });
      if (error) throw error;

      showStatus(
        "✅ Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión."
      );
    }
  } catch (err) {
    console.error(err);
    let errorMessage = err.message || "Error de autenticación";
    if (errorMessage.includes("duplicate key value")) {
      errorMessage =
        "El Nombre de Usuario o Correo Electrónico ya está en uso. Intenta con otro.";
    }
    showStatus("❌ " + errorMessage, false);
  }
}

async function loginWithGoogle() {
  try {
    showStatus("⚙️ Abriendo Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // A dónde debe regresarte Supabase después del OAuth
        redirectTo: DASHBOARD_URL,
      },
    });
    if (error) throw error;
  } catch (err) {
    showStatus("❌ " + (err.message || "No se pudo iniciar con Google"), false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("group-username")?.classList.add("hidden");
  document.getElementById("group-fullname")?.classList.add("hidden");
  document.getElementById("group-avatar")?.classList.add("hidden");
  if (!isLoginMode) toggleAuthMode(new Event("click"));
});

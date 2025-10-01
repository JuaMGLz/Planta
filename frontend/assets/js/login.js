/************  CONFIG RUTAS (local y GitHub Pages)  ************/
const DASHBOARD_PATH_REL = "/frontend/dashboard.html"; // cambia si mueves el archivo
const GH_USER = "juamglz";
const GH_REPO = "Planta";

// ¿Estamos en GitHub Pages?
const IS_GH_PAGES = location.hostname.endsWith("github.io");

// URL ABSOLUTA de GitHub Pages (sin depender del path actual)
const GH_BASE = `https://${GH_USER}.github.io/${GH_REPO}`;
const GH_DASHBOARD_URL = `${GH_BASE}${DASHBOARD_PATH_REL}`;

// En local, usa origin tal cual
const LOCAL_DASHBOARD_URL = new URL(DASHBOARD_PATH_REL, location.origin).href;

// URL final (forzada a GH si estamos en Pages)
const DASHBOARD_URL = IS_GH_PAGES ? GH_DASHBOARD_URL : LOCAL_DASHBOARD_URL;

/*******************  LÓGICA DE LOGIN/REGISTRO  *******************/
let isLoginMode = true;
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
      if (!isValidEmail(login_input))
        return showStatus("⚠️ REGISTRO: Usa un correo válido.", false);
      if (!username)
        return showStatus("⚠️ REGISTRO: Falta nombre de usuario.", false);

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
    let m = err.message || "Error de autenticación";
    if (m.includes("duplicate key value"))
      m = "El usuario o correo ya está en uso.";
    showStatus("❌ " + m, false);
  }
}

async function loginWithGoogle() {
  try {
    showStatus("⚙️ Abriendo Google...");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: DASHBOARD_URL },
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

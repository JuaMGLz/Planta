// assets/js/dashboard.js

// ===== CONFIGURACIÓN SUPABASE =====
const SUPABASE_URL = "https://zgodzbybnfusfwxkjmuw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2R6YnlibmZ1c2Z3eGtqbXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjgyMDIsImV4cCI6MjA3NDg0NDIwMn0.13M6pLC95UqEup2Ct6A5qYyIGp53YHaYnIoJzp0rNZo";

// Variable para el cliente Supabase
let supabaseClient;

// ===== INICIALIZACIÓN SUPABASE =====
function initializeSupabase() {
    try {
        console.log("🔄 Inicializando Supabase...");
        
        // Verificar si la librería está disponible
        if (typeof supabase === 'undefined') {
            console.error("❌ Librería Supabase no cargada");
            return false;
        }
        
        // Crear el cliente
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase inicializado correctamente");
        console.log("supabaseClient:", supabaseClient);
        console.log("supabaseClient.from:", typeof supabaseClient.from);
        
        return true;
    } catch (error) {
        console.error("❌ Error inicializando Supabase:", error);
        return false;
    }
}

// ===== DATOS DE LAS PLANTAS =====
const plantData = {
  pothos: {
    name: "🌿 Pothos",
    wateringFreq: "Cada 7-10 días",
    idealHumidity: "40-60%",
    characteristics: "Resistente, perfecta para principiantes",
    minHumidity: 40,
    maxHumidity: 60,
  },
  snake: {
    name: "🐍 Sansevieria",
    wateringFreq: "Cada 2-3 semanas",
    idealHumidity: "20-40%",
    characteristics: "Muy resistente a la sequía, purifica el aire",
    minHumidity: 20,
    maxHumidity: 40,
  },
  aloe: {
    name: "🌵 Aloe Vera",
    wateringFreq: "Cada 2-4 semanas",
    idealHumidity: "30-45%",
    characteristics: "Suculenta medicinal, necesita poco agua",
    minHumidity: 30,
    maxHumidity: 45,
  },
  ficus: {
    name: "🌳 Ficus",
    wateringFreq: "Cada 5-7 días",
    idealHumidity: "50-70%",
    characteristics: "Necesita humedad constante, luz indirecta",
    minHumidity: 50,
    maxHumidity: 70,
  },
  monstera: {
    name: "🍃 Monstera Deliciosa",
    wateringFreq: "Cada 7-10 días",
    idealHumidity: "45-65%",
    characteristics: "Planta tropical, necesita humedad alta",
    minHumidity: 45,
    maxHumidity: 65,
  },
  lavender: {
    name: "💜 Lavanda",
    wateringFreq: "Cada 10-14 días",
    idealHumidity: "25-40%",
    characteristics: "Prefiere suelos secos, aromática",
    minHumidity: 25,
    maxHumidity: 40,
  },
};

// ===== VARIABLES GLOBALES =====
let currentPlant = "pothos";
let currentHumidity = 35;
let lastUpdateTimestamp = new Date();
let dataRefreshInterval;
let currentTelemetryData = null;
const DEVICE_ID = "8a656766-c4f8-4ff9-b362-9418fb794969";

// ===== FUNCIÓN PARA FORMATEAR NÚMEROS =====
function formatNumber(value, decimals = 2) {
    if (value === null || value === undefined) return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    
    // Si es un número entero, no mostrar decimales
    if (num % 1 === 0) {
        return num.toString();
    }
    
    // Mostrar máximo 2 decimales
    return num.toFixed(decimals);
}

// ===== FUNCIONES DE TELEMETRÍA =====

async function loadLatestData() {
  try {
    // Verificar que Supabase esté inicializado
    if (!supabaseClient || typeof supabaseClient.from !== 'function') {
      console.error('❌ Supabase no está inicializado correctamente');
      showNotification('Error: Base de datos no disponible', 'error');
      return;
    }

    console.log("🔄 Cargando últimos datos de telemetría...");
    
    const { data, error } = await supabaseClient
      .from('telemetria')
      .select('*')
      .eq('dispositivo_id', DEVICE_ID)
      .order('fecha', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error al cargar datos:', error);
      showNotification('Error al cargar datos: ' + error.message, 'error');
      return;
    }

    if (data && data.length > 0) {
      currentTelemetryData = data[0];
      updateDashboardWithRealData(currentTelemetryData);
      showNotification('Datos actualizados correctamente', 'success');
    } else {
      console.log('📭 No hay datos disponibles');
      showNotification('No hay datos disponibles del dispositivo', 'warning');
    }
  } catch (err) {
    console.error('❌ Error:', err);
    showNotification('Error de conexión: ' + err.message, 'error');
  }
}

function updateDashboardWithRealData(telemetryData) {
  console.log('📊 Actualizando dashboard con:', telemetryData);
  
  // Actualizar humedad del suelo con formato
  const soilHumidity = parseFloat(telemetryData.humedad_suelo) || 0;
  currentHumidity = parseFloat(formatNumber(soilHumidity));
  
  // Actualizar temperatura con formato
  const temp = parseFloat(telemetryData.datos_crudos?.temp_c) || 0;
  document.getElementById("temperature").textContent = `${formatNumber(temp)}°C`;
  
  // Actualizar luz ambiente con formato
  const light = parseFloat(telemetryData.luz_ambiente) || 0;
  document.getElementById("light").textContent = `${formatNumber(light)}%`;
  
  // Actualizar pH con formato (1 decimal para pH)
  const phValue = parseFloat(telemetryData.ph) || 0;
  document.getElementById("ph").textContent = formatNumber(phValue, 1);
  
  // Actualizar intensidad WiFi
  const wifiStrength = parseFloat(telemetryData.intensidad_wifi) || 0;
  updateWifiStatus(wifiStrength);
  
  // Actualizar batería con formato
  const battery = parseFloat(telemetryData.bateria) || 0;
  updateBatteryStatus(battery);
  
  // Actualizar timestamp
  lastUpdateTimestamp = new Date();
  updateTimestamp();
  
  // Actualizar estado de la planta
  updatePlantStatus();
  
  // Actualizar sección ESP32
  updateESP32Status(telemetryData);
}

// ===== FUNCIONES DE LA PLANTA =====

function changePlant() {
  const selector = document.getElementById("plantSelector");
  currentPlant = selector.value;
  const plant = plantData[currentPlant];

  document.getElementById("plantName").textContent = plant.name;
  document.getElementById("wateringFreq").textContent = plant.wateringFreq;
  document.getElementById("idealHumidity").textContent = plant.idealHumidity;
  document.getElementById("plantCharacteristics").textContent = plant.characteristics;

  updatePlantStatus();
}

function updatePlantStatus() {
  const plant = plantData[currentPlant];
  const ledIndicator = document.getElementById("ledIndicator");
  const ledStatus = document.getElementById("ledStatus");
  const currentAlert = document.getElementById("currentAlert");
  const alertMessage = document.getElementById("alertMessage");
  const waterButton = document.getElementById("waterButton");
  const nextWatering = document.getElementById("nextWatering");

  if (currentHumidity < plant.minHumidity) {
    ledIndicator.className = "led-indicator led-blue";
    ledStatus.textContent = "Necesita agua";
    currentAlert.className = "alert alert-warning";
    alertMessage.innerHTML = `⚠️ Humedad por debajo del nivel óptimo para ${plant.name.split(" ")[1]}`;
    waterButton.style.display = "flex";
    nextWatering.innerHTML = '<span>Próximo riego:</span><span style="color: #ef4444;">¡Ahora!</span>';
  } else if (currentHumidity > plant.maxHumidity) {
    ledIndicator.className = "led-indicator led-red";
    ledStatus.textContent = "Exceso de agua";
    currentAlert.className = "alert alert-danger";
    alertMessage.innerHTML = `🚨 Demasiada humedad - riesgo de pudrición de raíces`;
    waterButton.style.display = "none";
    nextWatering.innerHTML = '<span>Próximo riego:</span><span style="color: #f59e0b;">En 1-2 semanas</span>';
  } else {
    ledIndicator.className = "led-indicator led-green";
    ledStatus.textContent = "Estado óptimo";
    currentAlert.className = "alert alert-success";
    alertMessage.innerHTML = `✅ ${plant.name.split(" ")[1]} está en condiciones ideales`;
    waterButton.style.display = "none";

    const days = currentPlant === "snake" || currentPlant === "aloe" ? "7-10 días" : 
                 currentPlant === "lavender" ? "5-7 días" : "3-5 días";
    nextWatering.innerHTML = `<span>Próximo riego:</span><span style="color: #10b981;">En ${days}</span>`;
  }

  updateProgressRing();
}

function updateProgressRing() {
  const progressCircle = document.getElementById("progressCircle");
  const humidityValue = document.getElementById("humidityValue");
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (currentHumidity / 100) * circumference;

  progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressCircle.style.strokeDashoffset = offset;

  humidityValue.textContent = `${formatNumber(currentHumidity)}%`;
  document.getElementById("humidity").textContent = `${formatNumber(currentHumidity)}%`;

  const plant = plantData[currentPlant];
  if (currentHumidity < plant.minHumidity) {
    progressCircle.style.stroke = "#ef4444";
  } else if (currentHumidity > plant.maxHumidity) {
    progressCircle.style.stroke = "#f59e0b";
  } else {
    progressCircle.style.stroke = "#10b981";
  }
}

function waterPlant() {
  const plant = plantData[currentPlant];
  currentHumidity = Math.min(85, plant.minHumidity + Math.random() * (plant.maxHumidity - plant.minHumidity));
  currentHumidity = parseFloat(formatNumber(currentHumidity));
  updatePlantStatus();

  const button = document.getElementById("waterButton");
  button.innerHTML = "✅ Regada";
  button.style.background = "linear-gradient(135deg, #10b981, #059669)";

  setTimeout(() => {
    button.innerHTML = "💧 Regar Planta";
  }, 2000);
}

// ===== FUNCIONES AUXILIARES =====

function updateWifiStatus(rssi) {
  const wifiElements = document.querySelectorAll('#esp32-status-content .schedule-item span:last-child');
  if (wifiElements.length > 1) {
    let status = '';
    let color = '#ef4444';
    
    if (rssi >= -50) {
      status = 'Excelente';
      color = '#10b981';
    } else if (rssi >= -60) {
      status = 'Bueno';
      color = '#f59e0b';
    } else if (rssi >= -70) {
      status = 'Regular';
      color = '#f59e0b';
    } else {
      status = 'Débil';
      color = '#ef4444';
    }
    
    wifiElements[1].textContent = `${formatNumber(rssi)} dBm (${status})`;
    wifiElements[1].style.color = color;
  }
}

function updateBatteryStatus(battery) {
  const batteryElement = document.querySelector('.status-badge.status-low');
  if (batteryElement) {
    batteryElement.textContent = `${formatNumber(battery)}%`;
    
    if (battery >= 70) {
      batteryElement.className = 'status-badge status-connected';
    } else if (battery >= 30) {
      batteryElement.className = 'status-badge status-low';
    } else {
      batteryElement.className = 'status-badge status-offline';
    }
  }
}

function updateESP32Status(telemetryData) {
  const esp32Section = document.getElementById('esp32-status-content');
  
  if (esp32Section && telemetryData) {
    const batteryElement = esp32Section.querySelector('.status-badge');
    if (batteryElement) {
      const battery = parseFloat(telemetryData.bateria) || 0;
      batteryElement.textContent = `${formatNumber(battery)}%`;
      
      if (battery >= 70) {
        batteryElement.className = 'status-badge status-connected';
      } else if (battery >= 30) {
        batteryElement.className = 'status-badge status-low';
      } else {
        batteryElement.className = 'status-badge status-offline';
      }
    }
    
    const firmwareElements = esp32Section.querySelectorAll('.schedule-item span:last-child');
    if (firmwareElements.length > 2) {
      firmwareElements[2].textContent = telemetryData.version_firmware || 'v1.0.0';
    }
    
    const uptimeElements = esp32Section.querySelectorAll('.schedule-item span:last-child');
    if (uptimeElements.length > 3 && telemetryData.tiempo_activo_seg) {
      const days = Math.floor(telemetryData.tiempo_activo_seg / 86400);
      const hours = Math.floor((telemetryData.tiempo_activo_seg % 86400) / 3600);
      uptimeElements[3].textContent = `${formatNumber(days)} días, ${formatNumber(hours)} horas`;
    }
  }
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'success'}`;
  notification.innerHTML = `
    <span>${type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'}</span>
    <span>${message}</span>
  `;
  
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '1000';
  notification.style.minWidth = '300px';
  notification.style.animation = 'slideInRight 0.3s ease';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

function updateTimestamp() {
  const now = new Date();
  const secondsPassed = Math.floor((now - lastUpdateTimestamp) / 1000);
  if (secondsPassed < 60) {
    document.getElementById("lastUpdate").textContent = `hace ${formatNumber(secondsPassed)} seg`;
  } else {
    document.getElementById("lastUpdate").textContent = `hace ${formatNumber(Math.floor(secondsPassed / 60))} min`;
  }
}

function addPlant() {
  alert("Funcionalidad para añadir una nueva planta en desarrollo.");
}

// ===== FUNCIONES DE AUTOREFRESCO =====

function startAutoRefresh() {
  loadLatestData();
  dataRefreshInterval = setInterval(loadLatestData, 30000);
}

function stopAutoRefresh() {
  if (dataRefreshInterval) {
    clearInterval(dataRefreshInterval);
  }
}

// ===== INICIALIZACIÓN =====

function initializeDashboard() {
  console.log("🚀 Inicializando dashboard...");
  
  // 1. Inicializar Supabase
  if (!initializeSupabase()) {
    console.error("❌ No se pudo inicializar Supabase");
    showNotification("Error: No se puede conectar a la base de datos", "error");
    return;
  }

  // 2. Configurar navegación
  const navItems = document.querySelectorAll(".nav-item");
  const contentSections = document.querySelectorAll(".content-section");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      contentSections.forEach((section) => {
        section.classList.remove("active");
      });
      navItems.forEach((nav) => {
        nav.classList.remove("active");
      });
      const targetId = item.dataset.target;
      document.getElementById(targetId).classList.add("active");
      item.classList.add("active");
    });
  });

  // 3. INICIALIZAR LA CARGA AUTOMÁTICA DE DATOS
  startAutoRefresh();
  
  // 4. Inicializar el dashboard
  changePlant();
  updateTimestamp();
  
  // 5. Configurar intervalo para actualizar timestamp
  setInterval(updateTimestamp, 1000);
  
  console.log("✅ Dashboard inicializado correctamente");
}

// Iniciar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", initializeDashboard);
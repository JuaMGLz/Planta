// assets/js/dashboard.js

// ===== CONFIGURACIÓN SUPABASE =====
const SUPABASE_URL = "https://zgodzbybnfusfwxkjmuw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2R6YnlibmZ1c2Z3eGtqbXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjgyMDIsImV4cCI6MjA3NDg0NDIwMn0.13M6pLC95UqEup2Ct6A5qYyIGp53YHaYnIoJzp0rNZo";

// ===== CONFIGURACIÓN ESP32 =====
let ESP32_IP = "";
let esp32IPDetected = false;

// Variable para el cliente Supabase
let supabaseClient;

// ===== INICIALIZACIÓN SUPABASE =====
function initializeSupabase() {
    try {
        console.log("🔄 Inicializando Supabase...");
        
        if (typeof supabase === 'undefined') {
            console.error("❌ Librería Supabase no cargada");
            return false;
        }
        
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase inicializado correctamente");
        return true;
    } catch (error) {
        console.error("❌ Error inicializando Supabase:", error);
        return false;
    }
}

// ===== OBTENER IP DEL ESP32 DESDE SUPABASE =====
async function getESP32IPFromSupabase() {
    try {
        console.log("🔍 Obteniendo IP del ESP32 desde Supabase...");
        
        const { data, error } = await supabaseClient
            .from('esp32_ips')
            .select('ip_address, fecha')
            .eq('dispositivo_id', DEVICE_ID)
            .order('fecha', { ascending: false })
            .limit(1);

        if (error) {
            console.error('❌ Error al obtener IP:', error);
            return null;
        }

        if (data && data.length > 0) {
            const ip = data[0].ip_address;
            const fecha = new Date(data[0].fecha).toLocaleString();
            console.log(`✅ IP obtenida desde Supabase: ${ip} (${fecha})`);
            return ip;
        } else {
            console.log('📭 No hay IP guardada en Supabase');
            return null;
        }
    } catch (err) {
        console.error('❌ Error obteniendo IP:', err);
        return null;
    }
}

// ===== DETECCIÓN DE IP MEJORADA =====
async function detectESP32IP() {
    console.log("🕵️‍♂️ Detectando IP del ESP32...");
    
    // 1. Primero intentar obtener la IP desde Supabase
    const ipFromSupabase = await getESP32IPFromSupabase();
    
    if (ipFromSupabase) {
        ESP32_IP = ipFromSupabase;
        esp32IPDetected = true;
        showNotification(`✅ ESP32 detectado en ${ESP32_IP} (desde Supabase)`, 'success');
        updateConnectionStatus();
        return ESP32_IP;
    }
    
    // 2. Si no hay IP en Supabase, intentar detección automática
    console.log("🔍 No se encontró IP en Supabase, escaneando red...");
    
    const commonRanges = [
        "192.168.100",  // Tu rango actual
        "192.168.1",    // Rango común
        "192.168.0",    // Rango común
        "10.0.0",       // Rango común
        "172.16.0"      // Rango común
    ];
    
    const port = 80;
    
    for (const range of commonRanges) {
        // Probar solo algunas IPs comunes para no saturar
        const commonIPs = [1, 100, 136, 150, 200, 254];
        
        for (const lastOctet of commonIPs) {
            const testIP = `${range}.${lastOctet}`;
            const url = `http://${testIP}:${port}/`;
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);
                
                const response = await fetch(url, {
                    method: 'GET',
                    signal: controller.signal,
                    mode: 'no-cors'
                });
                
                clearTimeout(timeoutId);
                
                console.log(`✅ ESP32 detectado en: ${testIP}`);
                ESP32_IP = testIP;
                esp32IPDetected = true;
                
                showNotification(`✅ ESP32 detectado en ${testIP} (escaneo automático)`, 'success');
                updateConnectionStatus();
                return testIP;
                
            } catch (error) {
                // Continuar con la siguiente IP
                continue;
            }
        }
    }
    
    // 3. Si todo falla, usar IP por defecto
    console.warn("⚠️ No se pudo detectar el ESP32, usando IP por defecto");
    showNotification("⚠️ No se detectó el ESP32. Usando IP por defecto.", 'warning');
    
    ESP32_IP = "192.168.100.136";
    esp32IPDetected = true;
    updateConnectionStatus();
    
    return ESP32_IP;
}

// ===== ACTUALIZAR ESTADO DE CONEXIÓN EN EL UI =====
function updateConnectionStatus() {
    const statusElement = document.querySelector('#dashboard-content [style*="color: #10b981"]');
    
    if (statusElement && esp32IPDetected) {
        statusElement.textContent = `● Conectado (${ESP32_IP})`;
        statusElement.style.color = '#10b981';
    }
}

// ===== FUNCIÓN PARA CONTROLAR EL RELAY DESDE WEB =====
async function waterPlant() {
    try {
        console.log("💧 Iniciando riego desde web...");
        
        // Si no hemos detectado la IP, intentar detectarla primero
        if (!esp32IPDetected) {
            showNotification("🔍 Detectando ESP32...", 'info');
            await detectESP32IP();
        }
        
        const button = document.getElementById("waterButton");
        const originalText = button.innerHTML;
        
        // 1. Mostrar estado de "regando"
        button.innerHTML = "⏳ Regando...";
        button.disabled = true;
        
        // 2. Enviar comando al ESP32
        const success = await sendWaterCommandToESP32();
        
        if (success) {
            showNotification(`💧 Comando enviado a ${ESP32_IP} - Regando planta por 5 segundos`, 'success');
            
            // 3. Simular efecto visual inmediato en el frontend
            const plant = plantData[currentPlant];
            const simulatedHumidity = Math.min(85, plant.minHumidity + 20 + Math.random() * 15);
            currentHumidity = parseFloat(formatNumber(simulatedHumidity));
            updatePlantStatus();
            
            // 4. Restaurar botón después de 2 segundos
            setTimeout(() => {
                button.innerHTML = "✅ Regada";
                button.style.background = "linear-gradient(135deg, #10b981, #059669)";
                
                // 5. Cargar datos reales después de que termine el riego
                setTimeout(() => {
                    loadLatestData(); // Sincronizar con datos reales del sensor
                    button.innerHTML = originalText;
                    button.style.background = "";
                    button.disabled = false;
                }, 4000);
                
            }, 2000);
            
        } else {
            throw new Error(`No se pudo contactar al ESP32 en ${ESP32_IP}`);
        }
        
    } catch (err) {
        console.error('❌ Error en riego:', err);
        showNotification('Error durante el riego: ' + err.message, 'error');
        
        // Restaurar botón en caso de error
        const button = document.getElementById("waterButton");
        button.innerHTML = "💧 Regar Planta";
        button.disabled = false;
        
        // Intentar redetectar la IP si falla
        esp32IPDetected = false;
    }
}

// Función para enviar comando al ESP32
async function sendWaterCommandToESP32() {
    if (!ESP32_IP) {
        console.error("❌ No hay IP configurada para el ESP32");
        return false;
    }
    
    const url = `http://${ESP32_IP}/water`;
    
    try {
        console.log(`📡 Enviando comando a: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command: "water", duration: 5000 }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("✅ Comando enviado al ESP32:", data);
        return true;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error("❌ Timeout: El ESP32 no respondió en 5 segundos");
            showNotification("⏰ Timeout: El ESP32 no respondió", 'error');
        } else {
            console.error("❌ No se pudo enviar comando al ESP32:", error.message);
            showNotification(`❌ Error conectando a ${ESP32_IP}`, 'error');
        }
        
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
    
    if (num % 1 === 0) {
        return num.toString();
    }
    
    return num.toFixed(decimals);
}

// ===== FUNCIONES DE TELEMETRÍA =====
async function loadLatestData() {
  try {
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
async function initializeDashboard() {
    console.log("🚀 Inicializando dashboard...");
    
    // 1. Inicializar Supabase
    if (!initializeSupabase()) {
        console.error("❌ No se pudo inicializar Supabase");
        showNotification("Error: No se puede conectar a la base de datos", "error");
        return;
    }

    // 2. Obtener la IP del ESP32 desde Supabase
    console.log("🔍 Obteniendo IP del ESP32 desde Supabase...");
    await detectESP32IP();
    
    // 3. Actualizar estado de conexión en la UI
    updateConnectionStatus();

    // 4. Configurar navegación
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

    // 5. INICIALIZAR LA CARGA AUTOMÁTICA DE DATOS
    startAutoRefresh();
    
    // 6. Inicializar el dashboard
    changePlant();
    updateTimestamp();
    
    // 7. Configurar intervalo para actualizar timestamp
    setInterval(updateTimestamp, 1000);
    
    console.log("✅ Dashboard inicializado correctamente");
    console.log(`📍 ESP32 detectado en: ${ESP32_IP}`);
}

// Iniciar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", initializeDashboard);
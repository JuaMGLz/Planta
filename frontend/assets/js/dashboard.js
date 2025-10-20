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

let currentPlant = "pothos";
let currentHumidity = 35;
let lastUpdateTimestamp = new Date();

// Función para cambiar la planta seleccionada
function changePlant() {
  const selector = document.getElementById("plantSelector");
  currentPlant = selector.value;
  const plant = plantData[currentPlant];

  document.getElementById("plantName").textContent = plant.name;
  document.getElementById("wateringFreq").textContent = plant.wateringFreq;
  document.getElementById("idealHumidity").textContent = plant.idealHumidity;
  document.getElementById("plantCharacteristics").textContent =
    plant.characteristics;

  updatePlantStatus();
}

// Función para actualizar el estado de la planta (LED, Alerta, Próximo Riego)
function updatePlantStatus() {
  const plant = plantData[currentPlant];
  const ledIndicator = document.getElementById("ledIndicator");
  const ledStatus = document.getElementById("ledStatus");
  const currentAlert = document.getElementById("currentAlert");
  const alertMessage = document.getElementById("alertMessage");
  const waterButton = document.getElementById("waterButton");
  const nextWatering = document.getElementById("nextWatering");

  // Determinar estado basado en la planta específica
  if (currentHumidity < plant.minHumidity) {
    ledIndicator.className = "led-indicator led-blue";
    ledStatus.textContent = "Necesita agua";
    currentAlert.className = "alert alert-warning";
    alertMessage.innerHTML = `⚠️ Humedad por debajo del nivel óptimo para ${
      plant.name.split(" ")[1]
    }`;
    waterButton.style.display = "flex";
    nextWatering.innerHTML =
      '<span>Próximo riego:</span><span style="color: #ef4444;">¡Ahora!</span>';
  } else if (currentHumidity > plant.maxHumidity) {
    ledIndicator.className = "led-indicator led-red";
    ledStatus.textContent = "Exceso de agua";
    currentAlert.className = "alert alert-danger";
    alertMessage.innerHTML = `🚨 Demasiada humedad - riesgo de pudrición de raíces`;
    waterButton.style.display = "none";
    nextWatering.innerHTML =
      '<span>Próximo riego:</span><span style="color: #f59e0b;">En 1-2 semanas</span>';
  } else {
    ledIndicator.className = "led-indicator led-green";
    ledStatus.textContent = "Estado óptimo";
    currentAlert.className = "alert alert-success";
    alertMessage.innerHTML = `✅ ${
      plant.name.split(" ")[1]
    } está en condiciones ideales`;
    waterButton.style.display = "none";

    const days =
      currentPlant === "snake" || currentPlant === "aloe"
        ? "7-10 días"
        : currentPlant === "lavender"
        ? "5-7 días"
        : "3-5 días";
    nextWatering.innerHTML = `<span>Próximo riego:</span><span style="color: #10b981;">En ${days}</span>`;
  }

  updateProgressRing();
}

// Función para actualizar el anillo de progreso circular
function updateProgressRing() {
  const progressCircle = document.getElementById("progressCircle");
  const humidityValue = document.getElementById("humidityValue");
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (currentHumidity / 100) * circumference;

  progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
  progressCircle.style.strokeDashoffset = offset;

  humidityValue.textContent = `${currentHumidity}%`;
  document.getElementById("humidity").textContent = `${currentHumidity}%`;

  const plant = plantData[currentPlant];
  if (currentHumidity < plant.minHumidity) {
    progressCircle.style.stroke = "#ef4444";
  } else if (currentHumidity > plant.maxHumidity) {
    progressCircle.style.stroke = "#f59e0b";
  } else {
    progressCircle.style.stroke = "#10b981";
  }
}

// Función simulada de regar la planta
function waterPlant() {
  const plant = plantData[currentPlant];
  currentHumidity = Math.min(
    85,
    plant.minHumidity + Math.random() * (plant.maxHumidity - plant.minHumidity)
  );
  currentHumidity = Math.round(currentHumidity);
  updatePlantStatus();

  const button = document.getElementById("waterButton");
  button.innerHTML = "✅ Regada";
  button.style.background = "linear-gradient(135deg, #10b981, #059669)";

  setTimeout(() => {
    // Vuelve al estado original, que updatePlantStatus ocultará si es óptimo
    button.innerHTML = "💧 Regar Planta";
  }, 2000);
}

// Función para simular el cambio de datos de sensores
function updateSensors() {
  const plant = plantData[currentPlant];
  // Simula que la humedad baja lentamente
  if (currentHumidity > 15) {
    currentHumidity = Math.max(15, currentHumidity - Math.random() * 2);
  }

  currentHumidity = Math.round(currentHumidity);

  // Simulación de otros datos
  document.getElementById("temperature").textContent = `${
    20 + Math.round(Math.random() * 8)
  }°C`;
  document.getElementById("light").textContent = `${
    50 + Math.round(Math.random() * 40)
  }%`;
  document.getElementById("ph").textContent = `${(
    6.0 +
    Math.random() * 1.5
  ).toFixed(1)}`;

  updatePlantStatus();
}

// Función para actualizar la marca de tiempo de la última actualización
function updateTimestamp() {
  const now = new Date();
  const secondsPassed = Math.floor((now - lastUpdateTimestamp) / 1000);
  if (secondsPassed < 60) {
    document.getElementById(
      "lastUpdate"
    ).textContent = `hace ${secondsPassed} seg`;
  } else {
    document.getElementById("lastUpdate").textContent = `hace ${Math.floor(
      secondsPassed / 60
    )} min`;
  }
}

// Función de marcador de posición para añadir planta
function addPlant() {
  alert("Funcionalidad para añadir una nueva planta en desarrollo.");
}

document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".nav-item");
  const contentSections = document.querySelectorAll(".content-section");

  // Lógica para la navegación de la barra lateral
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      // Oculta todas las secciones
      contentSections.forEach((section) => {
        section.classList.remove("active");
      });

      // Desactiva todos los nav items
      navItems.forEach((nav) => {
        nav.classList.remove("active");
      });

      // Muestra la sección correspondiente
      const targetId = item.dataset.target;
      document.getElementById(targetId).classList.add("active");

      // Activa el nav item clicado
      item.classList.add("active");
    });
  });

  const DEVICE_ID = "8a656766-c4f8-4ff9-b362-9418fb794969";
  async function cargarUltimo() {
    const { data, error } = await sb
      .from("telemetria")
      .select("*")
      .eq("dispositivo_id", DEVICE_ID)
      .order("fecha", { ascending: false })
      .limit(1);
    if (data?.length) {
      const t = data[0];
      document.getElementById(
        "soil-humidity"
      ).textContent = `${t.humedad_suelo}%`;
      document.getElementById("temperature").textContent = `${
        t.datos_crudos?.temp_c ?? "--"
      } °C`;
      document.getElementById("ambient-humidity").textContent = `${
        t.datos_crudos?.hum_amb ?? "--"
      } %`;
    }
  }
  setInterval(cargarUltimo, 5000);

  // Inicializar el dashboard y los intervalos de simulación
  //changePlant();
  //updateSensors();
  //setInterval(updateSensors, 8000);
  setInterval(updateTimestamp, 30000);
});

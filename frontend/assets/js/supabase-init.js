// Carga de la librería supabase-js ya la haces en index.html
// Aquí solo inicializamos el cliente con tus credenciales

// URL fija de tu proyecto Supabase
const SUPABASE_URL = "https://zgodzbybnfusfwxkjmuw.supabase.co";

// Clave pública (anon key) de tu proyecto
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2R6YnlibmZ1c2Z3eGtqbXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNjgyMDIsImV4cCI6MjA3NDg0NDIwMn0.13M6pLC95UqEup2Ct6A5qYyIGp53YHaYnIoJzp0rNZo";

// Crear cliente global de Supabase
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

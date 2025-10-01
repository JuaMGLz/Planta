from db import quick_ping

if __name__ == "__main__":
    try:
        info = quick_ping()
        print("✅ Conexión exitosa:")
        for k, v in info.items():
            print(f"  {k}: {v}")
    except Exception as e:
        print("❌ Error de conexión:")
        print(e)

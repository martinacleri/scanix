# 📦 SCANIX - Sistema de Reconocimiento de Productos

> **Proyecto académico para la materia Ingeniería y Calidad de Software**
> **Universidad Tecnológica Nacional FRSF - 2025**

---

## 📖 Descripción del Proyecto

**SCANIX** es una solución integral de Punto de Venta (POS) diseñada para optimizar el proceso de cobro en comercios minoristas.

La innovación principal del sistema reside en su módulo de **Inteligencia Artificial**, capaz de identificar productos automáticamente a través de una cámara o imágenes subidas, agilizando la carga del carrito y reduciendo el error humano. El sistema no solo reconoce el producto, sino que gestiona toda la lógica de negocio asociada: precios, stock y clientes.

## 🚀 Funcionalidades Principales

### 🧠 Módulo de IA y Reconocimiento
* **Detección de Objetos:** Integración con **YOLOv8** para localizar productos en una imagen.
* **Clasificación Semántica:** Uso de **CLIP** para identificar el SKU exacto del producto.
* **Soporte Dual:** Funciona tanto con la cámara del dispositivo en tiempo real como con subida de archivos.

### 🛒 Gestión de Ventas (Cajero)
* **Carrito Dinámico:** Agregado y edición de productos ágil.
* **Precios por Volumen (Tiers):** El sistema detecta automáticamente la cantidad y aplica descuentos mayoristas configurados previamente (ej: *"Llevando 10, pagás $500 c/u en vez de $600"*).
* **Gestión de Clientes:** Búsqueda rápida por DNI y registro de clientes nuevos "al vuelo" sin salir de la pantalla de venta.

### 📦 Gestión de Inventario (Administrador)
* **Catálogo Completo:** ABM (Alta, Baja, Modificación) de productos con soporte para imágenes.
* **Control de Stock:** Descuento automático de unidades en el depósito correspondiente tras cada venta confirmada.
* **Historial:** Generación de tickets con ID único y exportación a **PDF** profesional.

---

## 🛠️ Arquitectura y Tecnologías

El proyecto utiliza una arquitectura híbrida de microservicios para aprovechar lo mejor de dos mundos: la velocidad de Node.js para la web y la potencia de Python para la IA.

### 🎨 Frontend (La Interfaz)
* **React + TypeScript:** Para una experiencia de usuario fluida y robusta.
* **Vite:** Entorno de desarrollo ultrarrápido.
* **Tailwind CSS + Shadcn/ui:** Para un diseño moderno, accesible y responsivo.
* **jsPDF:** Generación de documentos PDF en el cliente.

### ⚙️ Backend (La Lógica)
* **Node.js + Express:** API REST que orquesta todo el sistema.
* **Knex.js:** Query Builder para interactuar con la base de datos y gestionar migraciones de forma segura.
* **SQLite:** Base de datos relacional ligera (archivo local), ideal para prototipado rápido y portabilidad.

### 🤖 Microservicio de IA (El Cerebro)
* **Python + Flask:** Servidor dedicado exclusivamente al procesamiento de imágenes.
* **Ultralytics YOLO + SentenceTransformers:** Stack tecnológico para visión por computadora.

---

## ⚙️ Guía de Instalación y Ejecución

Para correr el sistema completo, necesitarás abrir **3 terminales** diferentes.

### Paso 1: Base de Datos y Backend (Node.js)

```bash
cd backend

# 1. Instalar dependencias
npm install

# 2. Crear las tablas en la base de datos (Migraciones)
npx knex migrate:latest

# 3. Iniciar el servidor (Corre en puerto 5000)
npm run dev
````

### Paso 2: Microservicio de IA (Python)

```bash
cd ai-service

# 1. Instalar librerías de Python
pip install -r requirements.txt

# 2. Iniciar el servidor de IA (Corre en puerto 5001)
python server.py
```

### Paso 3: Cliente Web (Frontend)

```bash
cd frontend

# 1. Instalar dependencias
npm install

# 2. Iniciar la aplicación (Generalmente puerto 5173)
npm run dev
```

## 📂 Estructura del Repositorio

```bash
scanix/
├── backend/           # API Node.js, Controladores, Rutas y DB SQLite
│   ├── src/
│   │   ├── controllers/  # Lógica de negocio
│   │   ├── database/     # Migraciones y conexión
│   │   └── routes/       # Endpoints de la API
├── frontend/          # SPA React
│   ├── src/
│   │   ├── components/   # Modales, UI, Layout
│   │   └── pages/        # Vistas principales (Catálogo, Escáner)
├── ai-service/          # Microservicio Python
│   ├── best.pt           # Modelo entrenado
│   └── server.py         # API Flask
└── README.md          # Documentación
```

## 👥 Equipo de Desarrollo

  * **Martina Cleri**
  * **Andrés Scocco**
  * **Belén Silvano Ruata**
  * **Macarena Varalda**

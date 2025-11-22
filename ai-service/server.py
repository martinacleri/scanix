import os
import json
import pickle
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from ultralytics import YOLO
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# --- Configuración de la App Flask ---
app = Flask(__name__)
CORS(app)  # Habilitar CORS para que el frontend pueda comunicarse

# --- Carga de Recursos Globales (se hace una sola vez al iniciar) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_MODEL_PATH = os.path.join(BASE_DIR, 'best.pt')
KB_PATH = os.path.join(BASE_DIR, 'knowledge_base.pkl')
MAPPING_PATH = os.path.join(BASE_DIR, 'product_mapping.json')

# El entorno configuró certificados personalizados que ya no existen.
# Eliminamos dichas variables para que las bibliotecas usen el store por defecto.
for env_var in ('REQUESTS_CA_BUNDLE', 'CURL_CA_BUNDLE', 'SSL_CERT_FILE', 'PIP_CERT'):
    if os.environ.pop(env_var, None):
        print(f'Se ignoró la variable de certificado {env_var} para evitar errores de TLS.')

try:
    # Cargar el modelo YOLO para detección
    YOLO_MODEL = YOLO(YOLO_MODEL_PATH)

    # Cargar el modelo CLIP para embeddings
    CLIP_MODEL = SentenceTransformer('clip-ViT-B-32', device='cpu')

    # Cargar la Knowledge Base con los embeddings de nuestros productos
    with open(KB_PATH, 'rb') as f:
        KNOWLEDGE_BASE = pickle.load(f)

    # Cargar el mapeo de productos (SKU, nombre, etc.)
    with open(MAPPING_PATH, 'r', encoding='utf-8') as f:
        PRODUCT_MAPPING = json.load(f)
except Exception as e:
    # Si algo falla al cargar, el servidor no podrá iniciar.
    # Es importante registrar este error.
    print(f"Error crítico al cargar modelos: {e}")
    KNOWLEDGE_BASE = None  # Marcar que la carga falló


# --- Lógica de Reconocimiento ---
def identify_product(crop_image):
    """
    Compara el embedding de una imagen recortada contra nuestra knowledge base.
    """
    if not KNOWLEDGE_BASE:
        return None, 0

    # Generar embedding para la imagen recortada
    crop_embedding = CLIP_MODEL.encode(crop_image)

    best_match_key = None
    best_similarity = -1

    # Iterar sobre los productos en nuestra knowledge base (ej. 'sal_celusal_500g')
    for product_key, data in KNOWLEDGE_BASE.items():
        # Usamos el embedding promedio de cada producto para la comparación
        mean_embedding = data.get('mean_embedding')
        if mean_embedding is not None:
            similarity = cosine_similarity(
                crop_embedding.reshape(1, -1),
                mean_embedding.reshape(1, -1)
            )[0][0]

            if similarity > best_similarity:
                best_similarity = similarity
                best_match_key = product_key

    return best_match_key, float(best_similarity)


# --- Endpoint de la API ---
@app.route('/recognize', methods=['POST'])
def recognize():
    if 'photo' not in request.files:
        return jsonify({"error": "No se encontró el archivo 'photo'"}), 400

    file = request.files['photo']

    try:
        image = Image.open(file.stream).convert("RGB")
    except Exception as e:
        return jsonify({"error": f"No se pudo leer la imagen: {e}"}), 400

    # 1. Detección de objetos con YOLO
    detections = YOLO_MODEL.predict(image, conf=0.25, verbose=False)

    identified_products = []

    # 2. Identificación para cada objeto detectado
    if len(detections[0].boxes) > 0:
        for box in detections[0].boxes:
            # Recortar la imagen del producto detectado
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            crop = image.crop((x1, y1, x2, y2))

            # Identificar el producto usando CLIP y nuestra KB
            product_key, confidence = identify_product(crop)

            # Si la confianza es suficientemente alta, añadir a los resultados
            if product_key and confidence > 0.6:
                product_info = PRODUCT_MAPPING.get(product_key, {})
                identified_products.append({
                    'sku': product_info.get('sku', 'Desconocido'),
                    'name': product_info.get('nombre', product_key),
                    'confidence': confidence
                })

    return jsonify(identified_products)


# --- Iniciar el Servidor ---
if __name__ == '__main__':
    if KNOWLEDGE_BASE is None:
        print("El servidor no puede iniciar porque los modelos no se cargaron correctamente.")
    else:
        print("Modelos cargados. Iniciando servidor Flask en el puerto 5001...")
        app.run(host='0.0.0.0', port=5001, debug=True)

import base64
import os
import time
from pathlib import Path
from flask import Flask, jsonify, render_template, request  # type: ignore

current_dir = Path(__file__).resolve().parent

app = Flask(
    __name__,
    template_folder=str(current_dir / 'templates'),
    static_folder=str(current_dir / 'static')
)

app.config['SNAPSHOT_FOLDER'] = os.path.join(current_dir, 'static', 'snapshots')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Maksimal payload 16MB
os.makedirs(app.config['SNAPSHOT_FOLDER'], exist_ok=True)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/save_snapshot', methods=['POST'])
def save_snapshot():
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({'success': False, 'message': 'Data gambar tidak ditemukan'}), 400

        image_data = data['image']
        # Format base64: data:image/png;base64,...
        if ',' in image_data:
            image_data = image_data.split(',')[1]

        image_bytes = base64.b64decode(image_data)
        filename = f"ar_snapshot_{int(time.time())}.png"
        filepath = os.path.join(app.config['SNAPSHOT_FOLDER'], filename)

        with open(filepath, 'wb') as f:
            f.write(image_bytes)

        return jsonify({
            'success': True,
            'message': 'Foto AR berhasil disimpan!',
            'filename': filename,
            'url': f"/static/snapshots/{filename}"
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() in ['true', '1']
    print("=" * 60)
    print("🚀 AR Hand Interactive Web App")
    print(f"Server berjalan di: http://{host if host != '0.0.0.0' else '127.0.0.1'}:{port}")
    print("=" * 60)
    app.run(host=host, port=port, debug=debug)

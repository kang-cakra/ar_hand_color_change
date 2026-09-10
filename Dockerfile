# Gunakan base image Python yang ringan
FROM python:3.12-slim

# Set direktori kerja di dalam container
WORKDIR /app

# Set environment variable agar Python tidak membuat file .pyc dan output langsung di-flush
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_HOST=0.0.0.0 \
    FLASK_PORT=5000 \
    FLASK_DEBUG=false

# Salin file requirements terlebih dahulu untuk memanfaatkan caching Docker layer
COPY requirements.txt .

# Install dependensi Python
RUN pip install --no-cache-dir -r requirements.txt

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Buat folder snapshot jika belum ada
RUN mkdir -p /app/static/snapshots

# Ekspos port yang digunakan aplikasi
EXPOSE 5000

# Jalankan aplikasi menggunakan Python
CMD ["python", "app.py"]

# Gunakan base image Python yang ringan
FROM python:alpine

# Set direktori kerja di dalam container
WORKDIR /app

# Set environment variable agar Python tidak membuat file .pyc dan output langsung di-flush
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_HOST=0.0.0.0 \
    FLASK_PORT=5000 \
    FLASK_DEBUG=false

# Update & upgrade paket Alpine, serta hapus paket sqlite yang tidak dibutuhkan oleh aplikasi (mengatasi CVE-2026-119586)
RUN apk update && apk upgrade --no-cache && \
    (apk del sqlite sqlite-libs 2>/dev/null || apk del sqlite 2>/dev/null || true)

# Salin file requirements terlebih dahulu untuk memanfaatkan caching Docker layer
COPY requirements.txt .

# Install & upgrade pip dan setuptools untuk mengatasi CVE-2025-47273
RUN pip install --no-cache-dir --upgrade pip "setuptools>=78.1.1" && \
    pip install --no-cache-dir -r requirements.txt

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Buat folder snapshot jika belum ada
RUN mkdir -p /app/static/snapshots

# Ekspos port yang digunakan aplikasi
EXPOSE 5000

# Jalankan aplikasi menggunakan Python
CMD ["python", "app.py"]

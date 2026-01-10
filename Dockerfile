# Node.js resmi imajını kullan
FROM node:18-alpine

# Çalışma dizinini ayarla
WORKDIR /usr/src/app

# Package dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --only=production

# Uygulama dosyalarını kopyala
COPY . .

# Port tanımla
EXPOSE 3000

# Uygulamayı doğrudan node ile başlat (npm SIGTERM sorununu önler)
CMD ["node", "server.js"]


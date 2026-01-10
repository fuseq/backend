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

# Port tanımla (CapRover otomatik olarak PORT env var'ı atar)
EXPOSE 3001

# Uygulamayı başlat
CMD ["npm", "start"]


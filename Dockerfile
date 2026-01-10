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

# Port tanımla (CapRover PORT 80 kullanır)
EXPOSE 80

# Uygulamayı başlat
CMD ["npm", "start"]


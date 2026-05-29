# ==========================================
# STAGE 1: Build the NestJS application
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

# Salin berkas paket dan konfigurasi database
COPY package*.json ./
COPY prisma ./prisma/

# Instal dependensi pembangunan (termasuk devDependencies)
RUN npm install

# Generate Prisma Client untuk tipe database
RUN npx prisma generate

# Salin seluruh kode sumber ke dalam container
COPY . .

# Compile TypeScript menjadi JavaScript (menghasilkan folder dist)
RUN npm run build

# Pangkas dependensi pembangunan agar menyisakan dependensi produksi saja
RUN npm prune --production

# ==========================================
# STAGE 2: Runner image untuk produksi
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Salin folder dist dan node_modules produksi dari stage builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port aplikasi (3090)
EXPOSE 3090

# Jalankan backend NestJS
CMD ["node", "dist/src/main"]

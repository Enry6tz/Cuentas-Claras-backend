FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
ENV DATABASE_URL="postgresql://placeholder:5432/placeholder"
ENV DIRECT_URL="postgresql://placeholder:5432/placeholder"
RUN npx prisma generate
RUN node --max-old-space-size=512 ./node_modules/.bin/nest build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3001
CMD ["node", "dist/main"]

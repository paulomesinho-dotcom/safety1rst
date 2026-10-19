FROM node:20-alpine

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and prisma schema first for layer caching
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy application source
COPY . .

# Generate Prisma Client and build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# Production runtime configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

CMD ["npm", "run", "start"]

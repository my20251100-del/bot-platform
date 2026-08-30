# =============================================================
# WhatsApp Bot backend — Docker image (Render / Back4App / any)
# -------------------------------------------------------------
# Node 22 (native WebSocket for Supabase) + Chromium + deps
# required by whatsapp-web.js, then runs the Express server.
# =============================================================
FROM node:22-slim

# Chromium system dependencies (needed by puppeteer on a slim base)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node deps first (better layer caching).
COPY package.json package-lock.json ./
RUN npm install --omit=dev && npx puppeteer browsers install chrome

# Copy application source.
COPY src ./src
COPY .env.example ./

# Render/Back4App inject the real PORT env; this just guarantees a sane default.
# IMPORTANT: do NOT hardcode PORT here. The platform routes external traffic to
# the port set in its dashboard settings, so the app must honor process.env.PORT
# (server.js does: `Number(process.env.PORT) || 3000`). A hardcoded value here
# can mismatch the platform's routing port and cause external 404s.
ENV NODE_ENV=production

EXPOSE ${PORT:-10000}

CMD ["node", "src/server.js"]

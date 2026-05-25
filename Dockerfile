FROM mcr.microsoft.com/playwright:v1.40.1-jammy

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm ci --only=production && \
    npx playwright install

COPY . .

RUN npm run build

ENV HEADLESS=true
ENV SCREENSHOT_ON_ERROR=true
ENV NODE_ENV=production

VOLUME ["/app/logs", "/app/sessions", "/app/screenshots"]

ENTRYPOINT ["node", "dist/cli/claim.js"]

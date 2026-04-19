FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV QUIET_LOCALE=1
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WIDGET_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_WIDGET_URL=$NEXT_PUBLIC_WIDGET_URL
RUN node scripts/build-embed.js && npx next build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

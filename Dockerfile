FROM oven/bun:latest AS builder
WORKDIR /app

COPY ./package.json ./
RUN bun install

COPY . .
RUN bun run compile






FROM oven/bun:latest AS runner
WORKDIR /app

COPY --from=builder /app/seekcontrol /app/seekcontrol

# COPY .env.docker ./.env
ENV PORT=3000

CMD ["./seekcontrol"]

FROM node:20-alpine

RUN apk add --no-cache git iptables su-exec

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Initialize git repo so `git apply` works for patches (must happen before chown)
RUN printf 'node_modules/\npackage-lock.json\nsrc/uploads/\n' > .gitignore && \
    git config --global user.email "arena@local" && \
    git config --global user.name "arena" && \
    git init && git add -A && git commit -m "baseline"

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

# Allow git operations regardless of directory ownership (root + appuser)
RUN git config --global --add safe.directory /app
RUN su-exec appuser git config --global --add safe.directory /app

# NOTE: container starts as root so entrypoint can configure iptables; the
# entrypoint drops to appuser via `su-exec appuser` before running the app.
EXPOSE 3000

HEALTHCHECK --interval=3s --timeout=2s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "src/server.js"]

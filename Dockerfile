# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app/v2/frontend

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

COPY v2/frontend/package.json v2/frontend/pnpm-lock.yaml v2/frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY v2/frontend/index.html v2/frontend/vite.config.js ./
COPY v2/frontend/public ./public
COPY v2/frontend/src ./src

ENV VITE_API_BASE=""
RUN pnpm run build

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV FRONTEND_DIST=/app/v2/frontend/dist

WORKDIR /app

RUN python -m pip install --no-cache-dir --upgrade pip

COPY v2/backend/requirements.txt /tmp/v2-backend-requirements.txt
RUN python -m pip install --no-cache-dir -r /tmp/v2-backend-requirements.txt

COPY question_bank.py pdf_recall_question_bank.py validate_question_bank.py ./
COPY v2 ./v2
COPY --from=frontend-builder /app/v2/frontend/dist ./v2/frontend/dist

EXPOSE 8080

CMD ["sh", "-c", "python -m uvicorn v2.backend.app:app --host 0.0.0.0 --port ${PORT:-8080}"]

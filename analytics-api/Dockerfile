# Leagues Match Analytics API Dockerfile
FROM python:3.12-slim

# Install uv package manager (pinned version)
COPY --from=ghcr.io/astral-sh/uv:0.13.9 /uv /bin/uv

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Copy dependency files first for layer caching
COPY pyproject.toml uv.lock ./

# Install frozen dependencies without dev packages
RUN uv sync --frozen --no-dev

# Copy application source, training scripts, trained artifacts, and replay tracking data
COPY app/ ./app/
COPY training/ ./training/
COPY artifacts/ ./artifacts/
COPY data/replay/ ./data/replay/
COPY data/results.db ./data/results.db

# Ensure virtualenv binaries are in PATH
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

# Run uvicorn on configured PORT
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

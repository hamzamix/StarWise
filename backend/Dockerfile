# Stage 1: Build dependencies with Poetry, no virtualenv
FROM python:3.11-slim AS builder

WORKDIR /app

# Install Poetry
RUN pip install poetry==1.8.2

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies globally (not in a virtualenv)
RUN poetry config virtualenvs.create false \
 && poetry install --no-dev --no-interaction --no-root

# Copy application code
COPY ./app /app/app

# Stage 2: Final production image
FROM python:3.11-slim

WORKDIR /app

# Copy installed site-packages and binaries
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy app code
COPY ./app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

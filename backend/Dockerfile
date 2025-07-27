FROM python:3.11-slim

WORKDIR /app

# Install Poetry
RUN pip install poetry==1.8.2

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies globally (not in a virtualenv)
RUN poetry config virtualenvs.create false \
 && poetry install --no-dev --no-interaction --no-root

# Copy app source code
COPY ./app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

FROM python:3.11-slim

WORKDIR /app

RUN pip install poetry==1.8.2

COPY pyproject.toml .

RUN poetry config virtualenvs.create false \
 && poetry install --no-interaction --no-root

COPY ./app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Stage 1: Build the dependency layer
FROM python:3.11-slim as builder

WORKDIR /app

# Install poetry
RUN pip install poetry==1.8.2

# Copy only the dependency definition file
COPY pyproject.toml ./

# Install dependencies into a virtual environment
# This creates a virtual environment in /.venv, which we'll copy to the final stage
# The 'poetry install' command will generate a poetry.lock file here.
RUN poetry config virtualenvs.in-project false && \
    poetry config virtualenvs.path /.venv && \
    poetry install --no-root --no-dev

# Stage 2: Create the final production image
FROM python:3.11-slim

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /.venv /.venv

# Set the PATH to include the virtual environment's bin directory
ENV PATH="/.venv/bin:$PATH"

# Copy the application code
COPY ./app /app/app

# Expose the port the app runs on
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

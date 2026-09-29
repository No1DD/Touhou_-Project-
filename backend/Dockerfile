# Use a slim supported Python runtime for the FastAPI service.
FROM python:3.12-slim

# Keep Python output immediate and prevent bytecode in the image.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install only the system tools required to create a non-root runtime user.
RUN useradd --create-home --shell /usr/sbin/nologin appuser

# Install Python dependencies before copying source for better build caching.
WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application, Alembic configuration and migration history.
COPY --chown=appuser:appuser . .

# Run the service without root privileges.
USER appuser
EXPOSE 8000

# Compose overrides this to run Alembic before serving the API.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

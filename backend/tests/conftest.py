# Import standard path and environment helpers before loading the FastAPI module.
import os
import sys
from pathlib import Path
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

# Ensure pytest can import backend/main.py when started from the repository root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

# Give the global application engine a harmless local URL during module import.
os.environ.setdefault("DATABASE_URL", "sqlite:///./pytest-import-only.db")
os.environ.setdefault("APP_ENV", "test")
# Tests are isolated from a developer's .env and do not require a Redis server.
os.environ["RATE_LIMIT_STORAGE_URI"] = "memory://"
# Pin CORS/cookie settings so a developer's local GitHub Pages configuration
# in backend/.env cannot change how the test suite's cookies/CORS behave.
os.environ["FRONTEND_ORIGIN"] = "http://localhost:5173"
os.environ["API_ORIGIN"] = "http://localhost:8000"
os.environ["SESSION_COOKIE_SAMESITE"] = "strict"
os.environ["SESSION_COOKIE_SECURE"] = "false"

# Import the application after configuring the test process environment.
import main  # noqa: E402


# Build an isolated SQLite database and cookie-aware client for each test.
@pytest.fixture

def client(tmp_path, monkeypatch):
    # Create a unique database file under pytest's temporary directory.
    database_path = tmp_path / f"api-test-{uuid4().hex}.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    test_engine = create_engine(database_url, connect_args={"check_same_thread": False})

    # Enable SQLite foreign keys on every connection used by the fixture.
    @event.listens_for(test_engine, "connect")
    def enable_foreign_keys(connection, _record):
        cursor = connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    # Use a stable test secret and development mode for the lifespan.
    monkeypatch.setattr(main.settings, "app_env", "test")
    monkeypatch.setattr(main.settings, "database_url", database_url)
    monkeypatch.setattr(main.settings, "jwt_secret_key", SecretStr("pytest-only-secret-key-not-for-production"))
    monkeypatch.setattr(main, "OPENAI_API_KEY", "")
    monkeypatch.setattr(main, "AI_PROVIDER", "openai")

    # Replace the production engine-backed session dependency with this test database.
    test_session_factory = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)

    def override_get_db():
        session = test_session_factory()
        try:
            yield session
        finally:
            session.close()

    # Have the FastAPI lifespan create schema only in this isolated database.
    monkeypatch.setattr(main, "create_tables", lambda: main.Base.metadata.create_all(bind=test_engine))
    main.app.dependency_overrides[main.get_db] = override_get_db

    # Use a unique client IP so rate-limit state cannot leak between test cases.
    client_ip = f"192.0.2.{uuid4().int % 254 + 1}"
    with TestClient(
        main.app,
        headers={"Origin": "http://localhost:5173"},
        client=(client_ip, 8000),
    ) as test_client:
        yield test_client

    # Remove dependency overrides and close the temporary database engine.
    main.app.dependency_overrides.clear()
    test_engine.dispose()

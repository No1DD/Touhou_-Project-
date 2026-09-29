"""Alembic environment wired to the application's settings and ORM metadata."""

# Import the logging setup and Alembic runtime helpers.
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Import the same metadata used by FastAPI models and read DATABASE_URL from Pydantic Settings.
from main import Base, settings

# Get the Alembic configuration object.
config = context.config

# Configure logging when an ini file is available.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Supply ORM metadata so `alembic revision --autogenerate` detects model changes.
target_metadata = Base.metadata

# Inject the secret-bearing URL only at runtime; escape percent signs for ConfigParser.
database_url = settings.database_url.replace("%", "%%")
config.set_main_option("sqlalchemy.url", database_url)


# Render SQL without opening a live database connection.
def run_migrations_offline() -> None:
    # Configure Alembic using the Pydantic Settings database URL.
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    # Emit the migration SQL.
    with context.begin_transaction():
        context.run_migrations()


# Run migrations against the configured PostgreSQL, MySQL, or SQLite database.
def run_migrations_online() -> None:
    # Create a short-lived engine from the configured URL.
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    # Share its connection with Alembic for this migration run.
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)
        # Execute the versioned migration scripts.
        with context.begin_transaction():
            context.run_migrations()
    # Release the database connection pool.
    connectable.dispose()


# Select offline SQL generation or online database execution.
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

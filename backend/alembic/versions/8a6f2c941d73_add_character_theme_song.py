"""add character theme song fields

Revision ID: 8a6f2c941d73
Revises: 11c110229789
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "8a6f2c941d73"
down_revision: Union[str, Sequence[str], None] = "11c110229789"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("characters", sa.Column("theme_song", sa.String(length=255), nullable=True))
    op.add_column("characters", sa.Column("theme_song_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("characters", "theme_song_url")
    op.drop_column("characters", "theme_song")

"""migrate origin_anime into work tags

Revision ID: c3f9a17b5e2d
Revises: 8a6f2c941d73
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3f9a17b5e2d"
down_revision: Union[str, Sequence[str], None] = "8a6f2c941d73"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    characters = sa.table("characters", sa.column("id", sa.Integer), sa.column("origin_anime", sa.String))
    # A full Table (with a declared primary key) is required so inserted_primary_key
    # can retrieve the new auto-incremented tag id back from the database driver.
    metadata = sa.MetaData()
    tags = sa.Table(
        "tags",
        metadata,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(length=80)),
        sa.Column("kind", sa.String(length=20)),
        sa.Column("normalized_name", sa.String(length=80)),
    )
    character_tags = sa.table("character_tags", sa.column("character_id", sa.Integer), sa.column("tag_id", sa.Integer))

    normalized_to_id = {
        row.normalized_name: row.id
        for row in conn.execute(sa.select(tags.c.id, tags.c.normalized_name).where(tags.c.kind == "work")).fetchall()
    }
    existing_links = set(conn.execute(sa.select(character_tags.c.character_id, character_tags.c.tag_id)).fetchall())

    rows = conn.execute(sa.select(characters.c.id, characters.c.origin_anime)).fetchall()
    for row in rows:
        if not row.origin_anime:
            continue
        # 舊資料以逗號分隔多個作品名稱，逐一拆解成獨立的作品標籤。
        names = [part.strip() for part in row.origin_anime.split(",") if part.strip()]
        for name in names:
            normalized = name.casefold()
            tag_id = normalized_to_id.get(normalized)
            if tag_id is None:
                result = conn.execute(tags.insert().values(name=name, kind="work", normalized_name=normalized))
                tag_id = result.inserted_primary_key[0]
                normalized_to_id[normalized] = tag_id
            if (row.id, tag_id) not in existing_links:
                conn.execute(character_tags.insert().values(character_id=row.id, tag_id=tag_id))
                existing_links.add((row.id, tag_id))

    with op.batch_alter_table("characters") as batch_op:
        batch_op.drop_column("origin_anime")


def downgrade() -> None:
    with op.batch_alter_table("characters") as batch_op:
        batch_op.add_column(sa.Column("origin_anime", sa.String(length=255), nullable=True))

    conn = op.get_bind()
    characters = sa.table("characters", sa.column("id", sa.Integer), sa.column("origin_anime", sa.String))
    tags = sa.table("tags", sa.column("id", sa.Integer), sa.column("name", sa.String), sa.column("kind", sa.String))
    character_tags = sa.table("character_tags", sa.column("character_id", sa.Integer), sa.column("tag_id", sa.Integer))

    rows = conn.execute(
        sa.select(character_tags.c.character_id, tags.c.name)
        .select_from(character_tags.join(tags, tags.c.id == character_tags.c.tag_id))
        .where(tags.c.kind == "work")
    ).fetchall()
    grouped: dict[int, list[str]] = {}
    for character_id, name in rows:
        grouped.setdefault(character_id, []).append(name)
    for character_id, names in grouped.items():
        conn.execute(
            characters.update().where(characters.c.id == character_id).values(origin_anime=", ".join(names))
        )

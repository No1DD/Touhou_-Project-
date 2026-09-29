# 匯入命令列參數解析工具。
import argparse
# 匯入 SQLite 來源資料庫連線設定工具。
from sqlalchemy import create_engine, func, inspect, select, text
# 匯入應用程式 ORM metadata 和目前設定的目標資料庫 URL。
from main import Base, settings


# 將 SQLite 中現有的所有應用資料表複製到空的 PostgreSQL/MySQL 資料庫。
def migrate(source_url: str, target_url: str) -> None:
    # 只允許 SQLite 作為此工具的來源。
    if not source_url.startswith("sqlite:"):
        raise ValueError("來源必須是 SQLite URL，例如 sqlite:///./characters.db")
    # 不允許把資料複製回相同資料庫。
    if source_url == target_url:
        raise ValueError("來源和目標資料庫 URL 不可相同")
    # 建立來源和目標資料庫 Engine。
    source_engine = create_engine(source_url, connect_args={"check_same_thread": False})
    target_options = {"connect_args": {"check_same_thread": False}} if target_url.startswith("sqlite:") else {}
    target_engine = create_engine(target_url, **target_options)
    try:
        # 確認來源資料庫檔案和資料表存在。
        source_table_names = set(Base.metadata.tables).intersection(inspect(source_engine).get_table_names())
        if "characters" not in source_table_names:
            raise RuntimeError("來源 SQLite 找不到 characters 資料表，請確認 source URL")
        # 先在目標建立目前版本缺少的 schema，不會刪除來源資料。
        Base.metadata.create_all(bind=target_engine)
        # 目標資料庫若已有任一筆應用資料就拒絕執行，防止覆寫或混合資料。
        with target_engine.connect() as target_connection:
            for table in Base.metadata.sorted_tables:
                row_count = target_connection.scalar(select(func.count()).select_from(table)) or 0
                if row_count:
                    raise RuntimeError(f"目標資料庫資料表 {table.name} 非空；請使用新的空資料庫再遷移")
        # 按照外鍵依賴順序逐表複製，每批最多 500 列。
        with source_engine.connect() as source_connection, target_engine.begin() as target_connection:
            for table in Base.metadata.sorted_tables:
                if table.name not in source_table_names:
                    # 舊 SQLite 缺少的新功能資料表維持空表即可。
                    continue
                rows = source_connection.execute(select(table))
                copied_count = 0
                while batch := rows.fetchmany(500):
                    target_connection.execute(table.insert(), [dict(row._mapping) for row in batch])
                    copied_count += len(batch)
                print(f"已複製 {table.name}: {copied_count} 筆")
        # PostgreSQL 需同步自動遞增序列，否則下一筆新資料可能撞到舊 ID。
        if target_engine.dialect.name == "postgresql":
            with target_engine.begin() as target_connection:
                for table in Base.metadata.sorted_tables:
                    primary_keys = list(table.primary_key.columns)
                    if len(primary_keys) != 1:
                        continue
                    primary_key = primary_keys[0]
                    sequence_name = target_connection.scalar(
                        text("SELECT pg_get_serial_sequence(:table_name, :column_name)"),
                        {"table_name": table.name, "column_name": primary_key.name},
                    )
                    if sequence_name is None:
                        continue
                    maximum_id = target_connection.scalar(select(func.max(primary_key)))
                    if maximum_id is not None:
                        target_connection.execute(
                            text("SELECT setval(:sequence_name, :next_id, true)"),
                            {"sequence_name": sequence_name, "next_id": maximum_id},
                        )
        print("遷移完成。原本的 SQLite 檔案未修改，請確認目標資料後再切換 DATABASE_URL。")
    finally:
        # 關閉來源和目標資料庫連線。
        source_engine.dispose()
        target_engine.dispose()


# 定義遷移命令列進入點。
if __name__ == "__main__":
    # 建立遷移工具的命令列介面。
    parser = argparse.ArgumentParser(description="將 SQLite 應用資料複製到 PostgreSQL 或 MySQL")
    # 指定 SQLite 來源 URL，預設讀取 backend/characters.db。
    parser.add_argument("--source-url", default="sqlite:///./characters.db", help="SQLite source URL")
    # 指定目標 URL；未指定時使用 .env 中的 DATABASE_URL。
    parser.add_argument("--target-url", default=settings.database_url, help="PostgreSQL/MySQL target URL")
    # 讀取命令列參數。
    arguments = parser.parse_args()
    # 執行非破壞性複製遷移。
    migrate(arguments.source_url, arguments.target_url)

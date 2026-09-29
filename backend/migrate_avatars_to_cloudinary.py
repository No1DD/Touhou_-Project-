# 匯入命令列參數工具，提供預設安全的遷移預覽模式。
import argparse
# 匯入 SQLAlchemy 查詢工具。
from sqlalchemy import select
# 匯入 ORM 建表函式、角色模型、資料庫 Session 工廠和 Cloudinary 上傳函式。
from main import Character, SessionLocal, create_tables, upload_image_to_cloudinary
# 匯入 Cloudinary uploader，必要時清理未被資料庫引用的上傳資產。
import cloudinary.uploader


# 將 SQLite 中的舊 BLOB 頭像遷移為 Cloudinary 資產。
def migrate(apply_changes: bool) -> None:
    # 確保舊資料庫也有 Cloudinary metadata 表；create_all 不會清空既有資料。
    create_tables()
    # 建立本次遷移專用資料庫 Session。
    db = SessionLocal()
    try:
        # 查詢所有仍有舊 BLOB 頭像的角色。
        statement = select(Character).where(Character.avatar_data.is_not(None))
        characters = db.scalars(statement).all()
        # 排除已經有 Cloudinary metadata 的角色，讓腳本可安全重複執行。
        pending = [character for character in characters if character.cloud_image is None]
        # 預設只顯示待處理數量，不呼叫 Cloudinary 或修改資料庫。
        if not apply_changes:
            print(f"待遷移 {len(pending)} 張舊頭像。使用 --apply 才會開始上傳並更新資料庫。")
            return
        # 逐筆上傳，避免一次把所有圖片載入記憶體。
        for character in pending:
            # 將舊 BLOB 上傳至 Cloudinary，取得 URL 和 public ID。
            cloud_image = upload_image_to_cloudinary(character.avatar_data)
            # 暫存 metadata 並清空舊 BLOB 欄位。
            character.cloud_image = cloud_image
            character.avatar_data = None
            character.avatar_type = None
            try:
                # 每筆圖片各自提交，避免中途失敗回滾已完成項目。
                db.commit()
            except Exception:
                # 先回滾資料庫，保留原本的 BLOB 頭像。
                db.rollback()
                # 清理剛上傳但尚未被資料庫引用的 Cloudinary 資產。
                cloudinary.uploader.destroy(cloud_image.public_id, invalidate=True)
                raise
            # 顯示已完成遷移的角色名稱。
            print(f"已遷移：{character.character_name}")
        # 顯示遷移總數。
        print(f"遷移完成，共 {len(pending)} 張頭像。")
    finally:
        # 無論成功或失敗都關閉資料庫 Session。
        db.close()


# 定義命令列進入點。
if __name__ == "__main__":
    # 建立遷移工具的命令列介面。
    parser = argparse.ArgumentParser(description="將舊角色 BLOB 頭像遷移到 Cloudinary")
    # 只有明確加上此旗標時才實際上傳和修改資料庫。
    parser.add_argument("--apply", action="store_true", help="實際上傳圖片並更新資料庫；預設只預覽")
    # 讀取命令列參數。
    arguments = parser.parse_args()
    # 執行預覽或正式遷移。
    migrate(arguments.apply)

# Touhou_「Project」

English version: [README.en.md](README.en.md). 網站可在右上角切換繁體中文與 English。

它目前是一個可以實際操作的同人資料庫。你可以從名錄認識角色、替喜歡的角色加上收藏，也可以投稿、比較能力值。其實我就單純想要做一個小項目,但是又不想要這麼無聊, 想要做一些自己喜歡的東西, 所以就做了這個, 算是滿足自己的一點小興趣吧。

## 這裡可以做什麼

- **逛角色名錄**：搜尋角色名稱、能力與來源作品；用分頁或無限捲動慢慢探索。
- **留下自己的角色筆記**：登入後投稿，只有建立者可以修改或刪除自己的角色資料。
- **收藏與整理**：在卡片或詳情頁收藏角色，並以作品和屬性標籤建立可共用的分類。
- **比較角色能力**：記錄力量、防禦、速度、魔力、技巧、運氣六項 0–10 評分，透過雷達圖快速比較。
- **記下角色主題曲**：在角色設定填入歌曲名稱與連結，詳情頁即可直接開啟聆聽。
- **看看幻想鄉有多熱鬧**：統計頁整理角色、會員、收藏、近期投稿與來源作品排行。
- **探索角色間的連結**：投稿者可以要求 AI 從既有角色中整理可能的關係，並在互動式關係網裡查看；AI 的推論是探索線索，不是官方設定判定。
- **替角色留一張好看的圖**：支援 JPG、PNG、GIF、WEBP，檔案上限 5 MiB；新圖由 Cloudinary 託管，舊版資料庫頭像也有遷移工具。
- **中英切換**：右上角可切換繁體中文與 English，選擇會保存在目前瀏覽器。

瀏覽器登入使用 HttpOnly Cookie，不把登入 JWT 交給前端 JavaScript；API 也支援 Bearer 驗證，但目前內建登入流程主要提供瀏覽器 Cookie。API 可在 `/docs` 開啟互動式 Swagger 文件。

## 專案結構

```text
touhou_「Project」/
├── backend/
│   ├── main.py              # FastAPI API、SQLAlchemy 模型、驗證與路由
│   ├── requirements.txt     # Python 套件
│   ├── requirements-dev.txt # pytest/coverage/Ruff 開發套件
│   ├── .env.example         # 環境變數範例
│   ├── .dockerignore
│   ├── Dockerfile
│   ├── pyproject.toml        # Ruff 設定
│   ├── migrate_avatars_to_cloudinary.py # 舊資料庫頭像遷移工具
│   ├── migrate_sqlite_to_database.py # SQLite 到 PostgreSQL/MySQL 資料搬移工具
│   ├── alembic.ini
│   ├── alembic/             # env.py、revision 範本與 schema revisions
│   └── tests/               # FastAPI integration tests
├── frontend/
│   ├── index.html           # Vite HTML 入口
│   ├── package.json / package-lock.json # React 與 Vite 相依套件
│   ├── .dockerignore
│   ├── Dockerfile / nginx.conf
│   ├── public/
│   │   └── touhou-character.png # 首頁使用的本機像素角色圖
│   └── src/
│       ├── main.jsx         # React 掛載入口
│       ├── AppRoutes.jsx    # 路由和登入保護
│       ├── auth.jsx         # 全站登入狀態
│       ├── api.js           # API 呼叫共用函式
│       ├── hooks/           # 收藏狀態等共用 React Hooks
│       ├── components/      # 共用導覽和角色卡片
│       ├── pages/           # 首頁、登入、註冊、主頁、詳情和編輯頁
│       └── style.css        # 響應式介面樣式
├── docs/                    # 全端學習指南 TXT 與 PPTX
├── schema.sql               # 舊 MySQL schema 參考
├── pytest.ini
├── .gitignore
├── docker-compose.yml
├── .env.docker.example
└── .github/workflows/ci.yml
```

## 前端頁面

| 網址 | 對應舊 PHP 功能 | 說明 |
| --- | --- | --- |
| `/` | `index.php` | 公開角色名錄與搜尋 |
| `/login` | `login.php` | 使用者登入 |
| `/register` | `register.php` | 建立新帳號 |
| `/dashboard` | `dashboard.php` | 登入者個人主頁與投稿管理 |
| `/statistics` |  全站統計與來源作品排行 |
| `/relationships` |  AI 抽取的互動角色關係網 |
| `/characters/new` | `add_character.php` | 新增角色 |
| `/characters/:id` | `view_character.php` | 單一角色詳情 |
| `/characters/:id/edit` | `dashboard.php` | 編輯自己的角色 |

個人主頁與新增/編輯頁需要登入；登入後會返回原先要求的受保護頁面。
首頁角色列表可切換每頁 12 筆的傳統分頁，或自動追加資料的無限捲動模式。

## 本機啟動

需要 Python 3.10 以上、Node.js 18 以上與 npm。

### 1. 啟動 FastAPI

在 PowerShell 執行：

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
notepad .env
```

在記事本裡設定新的 `JWT_SECRET_KEY`；只有要上傳頭像時才需要填入 Cloudinary Cloud name、API key 和 API secret，儲存後啟動：

```powershell
uvicorn main:app --reload --env-file .env
```

需要新的 JWT 密鑰時，可執行 `py -c "import secrets; print(secrets.token_urlsafe(48))"`，把終端機顯示的值貼進本機 `.env`；不要把值貼到聊天或截圖。**若 Cloudinary API secret 曾出現在終端紀錄/聊天，先到 Cloudinary Dashboard 輪替，再把新值填入 `.env`。** `.env` 已列在 `.gitignore`，不要移除這條忽略規則。

AI 可選 OpenAI 雲端或本機 Ollama；只有按下 AI 分析時才呼叫模型。使用 OpenAI 時才需在 `.env` 填 `OPENAI_API_KEY`；使用 Ollama 時改設 `AI_PROVIDER=ollama` 並填本機模型設定。所有憑證只留在 backend `.env`，不要貼進 React 或提交到 Git。API 位於 `http://localhost:8000`，互動式文件位於 `http://localhost:8000/docs`。開發模式啟動時會以 SQLAlchemy 建立缺少的資料表，不會清空既有角色資料；production 不會自動建表，必須先套用 Alembic migrations。未設定 Cloudinary 時，文字 CRUD 仍可使用，但有附圖片的新增/修改會回傳設定錯誤。

瀏覽器登入 JWT 存於 `HttpOnly; SameSite=Strict` Cookie，不會回傳或存入 `localStorage`；Cookie 寫入請求會驗證 `Origin`。登入最多 10 次/分鐘、註冊 5 次/小時、Tag 建立 30 次/分鐘、AI 關係分析 3 次/小時、角色新增/修改 10 次/分鐘。預設限流狀態存於單機記憶體；正式多 worker 請在 `.env` 設 `RATE_LIMIT_STORAGE_URI=redis://localhost:6379/0` 並部署 Redis，否則各 worker 的計數不共享。

#### 使用本機 Ollama（不使用 OpenAI API key）

安裝 Ollama 桌面程式後，在 PowerShell 下載一次模型：

```powershell
ollama pull qwen3:8b
```

Ollama 執行中時，在 backend 的 `.env` 將 provider 設定如下，然後用前述 `uvicorn ... --env-file .env` 命令重新啟動：

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=qwen3:8b
```

本機推論不會呼叫 OpenAI，也不需要設定 `OPENAI_API_KEY`；模型速度取決於電腦記憶體和 CPU/GPU。若要回到 OpenAI 雲端，將 `AI_PROVIDER` 設為 `openai`，再於 backend 環境設定 `OPENAI_API_KEY`。模型呼叫只在使用者按下關係分析時發生。

如果 SQLite 已有舊 BLOB 頭像，可在 backend 目錄、設定好 Cloudinary 環境變數後先預覽待遷移數量，再執行遷移：

```powershell
python migrate_avatars_to_cloudinary.py
python migrate_avatars_to_cloudinary.py --apply
```

遷移腳本預設只預覽；加上 `--apply` 才會把舊圖片上傳到 Cloudinary，確認雲端資料寫入成功後才清除資料庫內對應的 BLOB。既有頭像在遷移前仍可透過 FastAPI 顯示。

### 2. 啟動 React

另開一個 PowerShell 視窗：

```powershell
cd frontend
npm install
npm run dev
```

開啟 Vite 顯示的網址，通常是 `http://localhost:5173`。前端預設呼叫 `http://localhost:8000`；如 API 網址不同，可在啟動前設定 `VITE_API_URL`。

## 正式環境與資料庫遷移

`APP_ENV=production` 時，FastAPI lifespan 會要求 `JWT_SECRET_KEY` 存在且至少 32 個字元，否則直接中止啟動。development 若未提供 JWT secret，只建立每次重啟都不同的臨時亂數 key，正式或需要保留登入狀態時請放進被 Git 忽略的 backend `.env`。應用程式使用 Pydantic Settings 載入 `.env`，不在程式碼內提供密鑰 fallback。

Production lifespan 不會自動 `create_all`；需先套用 Alembic migration。PostgreSQL 要使用 `sslmode=verify-full`，MySQL 要提供 CA 並設 `ssl_verify_cert=true`。Cookie 登入使用 HttpOnly/SameSite，寫入 API 有 Origin 驗證；登入、註冊、標籤、AI 和角色寫入皆有限流。

先安裝並啟動 PostgreSQL 或 MySQL，建立一個**全新的空資料庫**，再修改 backend `.env`：

```dotenv
APP_ENV=production
JWT_SECRET_KEY=填入至少32字元的隨機密鑰
# 二選一：PostgreSQL
DATABASE_URL=postgresql+psycopg://使用者:密碼@localhost:5432/character_database?sslmode=verify-full
# 或 MySQL（移除上方 PostgreSQL 設定後使用）
# DATABASE_URL=mysql+pymysql://使用者:密碼@localhost:3306/character_database?charset=utf8mb4&ssl_ca=%2Fpath%2Fto%2Fca.pem&ssl_verify_cert=true
```

正式環境必須使用 PostgreSQL `sslmode=verify-full` 或 MySQL CA 憑證驗證，否則 lifespan 會拒絕啟動。如資料庫密碼或憑證路徑包含 `@`、`/`、`#` 等 URL 保留字，需先做 URL encoding。連線字串只放在本機 `.env`，不要提交到 Git。正式環境由 Alembic 管理 schema；請先執行 `alembic upgrade head` 再啟動 API。

### 將現有 SQLite 資料複製到 PostgreSQL/MySQL

1. 先備份 `backend/characters.db`，並確認 `.env` 的 `DATABASE_URL` 指向新建的空 PostgreSQL/MySQL 資料庫。
2. 在 backend 目錄執行遷移工具：

```powershell
python migrate_sqlite_to_database.py
```

工具預設讀取 `sqlite:///./characters.db` 作為來源，目標使用 `.env` 中的 `DATABASE_URL`。它會拒絕非空目標資料庫、依外鍵順序複製目前支援的資料表，並同步 PostgreSQL 自動遞增序列；不會修改或刪除原 SQLite 檔案。資料複製後，在 backend 目錄執行 `alembic stamp head` 標記現有 schema，再切換正式服務，避免重新建立已存在的資料表。

3. 確認遷移輸出的各表筆數、能登入並能讀寫角色後，再以新的 `DATABASE_URL` 啟動 FastAPI。若需指定來源檔，可加 `--source-url sqlite:///另一個檔案.db`。

遷移工具支援本專案目前的角色、使用者、頭像 BLOB/Cloudinary metadata、能力值、Tag 多對多、收藏和 AI 關係表。若原 SQLite 缺少新版資料表，目標會建立空表；不會自動推測或補造舊資料。

### Alembic 日常操作

在 backend 目錄設定好 `.env` 後，可用以下命令檢視版本、產生新 revision 和升級資料庫：

```powershell
alembic current
alembic revision --autogenerate -m "describe schema change"
alembic upgrade head
```

產生 revision 後先檢查 `alembic/versions/` 的差異，再提交 migration 檔；回退前先確認 downgrade 不會丟失需要保留的資料。

若既有開發用 SQLite 是由舊版 `create_all` 建立、尚無 Alembic 版本紀錄，先停止 API 並備份 `backend/characters.db`，確認 backend `.env` 指向該資料庫後，在 backend 目錄執行 `alembic stamp 11c110229789`，再執行 `alembic upgrade head`。這會把舊 schema 標記為初始版本，再只套用後續增量 migration；不要對空資料庫執行這個 stamp。

## Docker Compose

需要 Docker Desktop。先在 repository root 複製環境範例、填入 JWT key 和 PostgreSQL 密碼：

```powershell
Copy-Item .env.docker.example .env
notepad .env
docker compose up --build
```

Compose 會啟動 FastAPI、PostgreSQL、Redis、Nginx 和 React；API 在資料庫 healthy 後執行 `alembic upgrade head` 再啟動。首頁是 `http://localhost:5173`，API 文件是 `http://localhost:8000/docs`。停止服務用 `docker compose down`；不要加 `-v`，除非確定要刪除資料 volume。根目錄 `.env` 已被 Git 忽略，不要提交。

## 自動化測試與 CI

在 repository root 執行：

```powershell
cd backend
pip install -r requirements-dev.txt
cd ..
pytest
ruff check backend
```

pytest 每個案例使用獨立暫存 SQLite；目前覆蓋註冊/登入、HttpOnly Cookie/JWT 無效情境、Origin/CSRF、角色 owner 權限、輸入驗證和 stats。GitHub Actions 會在 push 和 pull request 自動執行 pytest/coverage、Ruff lint 和 React build。

## 舊資料遷移

`schema.sql` 是舊 MySQL 結構參考。新 API 對應保留 `users`、`characters`、`created_by` 外鍵、建立時間及頭像欄位，但不會自動匯入舊 MySQL 資料。遷移既有帳號時，請確認舊密碼雜湊格式是否相容；不要把資料庫密碼或正式 JWT 密鑰提交到 Git。

## API 路由

| 方法 | 路徑 | 說明 | 權限 |
| --- | --- | --- | --- |
| POST | `/auth/register` | 註冊帳號 | 公開 |
| POST | `/auth/login` | 登入並設定 HttpOnly Cookie | 公開 |
| GET | `/auth/me` | 取得目前登入者 | 登入 |
| GET | `/stats/site` | 全站統計摘要 | 公開 |
| GET | `/tags?kind=work` | 搜尋作品或屬性標籤 | 公開 |
| POST | `/tags` | 建立作品/屬性標籤 | 登入 |
| GET | `/characters?search=...` | 搜尋角色 | 公開 |
| GET | `/characters/page?search=...&offset=0&limit=12` | 分頁角色列表與總筆數 | 公開 |
| GET | `/characters/mine` | 目前登入者的投稿 | 登入 |
| GET | `/favorites` | 目前登入者的收藏 | 登入 |
| POST | `/characters/{id}/favorite` | 收藏角色 | 登入 |
| DELETE | `/characters/{id}/favorite` | 取消收藏 | 登入 |
| POST | `/characters/{id}/analyze-relationships` | AI 抽取角色關係 | 角色建立者 |
| GET | `/relationships/graph?character_id=...` | 取得全站或指定角色關係網 | 公開 |
| GET | `/characters/{id}` | 角色詳細資料 | 公開 |
| GET | `/characters/{id}/avatar` | 取得角色頭像 | 公開 |
| POST | `/characters` | 新增角色與頭像 | 登入 |
| PATCH | `/characters/{id}` | 修改自己的角色 | 建立者 |
| DELETE | `/characters/{id}` | 刪除自己的角色 | 建立者 |
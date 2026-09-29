// 匯入 React 狀態 Hook 與路由導覽。
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
// 匯入圖片裁切器和套件預設樣式。
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
// 匯入 API、登入資料和頭像預覽元件。
import { apiRequest } from "../api.js";
import { useAuth } from "../auth.jsx";
import { CharacterAvatar } from "../components/CharacterCard.jsx";
// 匯入能力雷達圖。
import AbilityRadar from "../components/LazyAbilityRadar.jsx";
// 匯入可搜尋並建立標籤的多選欄位。
import TagPicker from "../components/TagPicker.jsx";
import { useLanguage } from "../language.jsx";

// 定義表單欄位初始值。
const EMPTY_FORM = { character_name: "", abilities: "", biography: "", origin_anime: "", reference_url: "", theme_song: "", theme_song_url: "" };
// 定義新角色的六項能力預設值。
const DEFAULT_STATS = { power: "5", defense: "5", speed: "5", magic: "5", technique: "5", luck: "5" };
// 定義能力表單顯示文字。
const STAT_LABELS = { power: "Strength", defense: "Defense", speed: "Speed", magic: "Magic", technique: "Technique", luck: "Luck" };
// 固定輸出 512 x 512 的 JPEG 頭像，讓列表和詳情頁使用一致比例。
const AVATAR_OUTPUT_SIZE = 512;

// 依圓形裁切器提供的像素範圍，輸出實際裁切後的正方形圖片。
async function createCroppedAvatar(imageSource, croppedArea) {
  // 建立瀏覽器圖片物件以解碼原始上傳圖片。
  const image = new Image();
  image.src = imageSource;
  await image.decode();
  // 建立固定解析度的頭像畫布。
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  // 繪製裁切範圍並使用高品質縮放。
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser cannot process this image");
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    croppedArea.x,
    croppedArea.y,
    croppedArea.width,
    croppedArea.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );
  // 將畫布轉成可送給 FastAPI 的 JPEG Blob。
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Crop failed; please try again"));
    }, "image/jpeg", 0.92);
  });
}

// 以獨立網址建立或修改角色資料。
export default function CharacterFormPage() {
  const { t } = useLanguage();
  // 有 ID 時進入編輯模式，無 ID 時進入新增模式。
  const { id } = useParams();
  const isEditing = Boolean(id);
  // 保存欄位、圖片和頁面狀態。
  const [form, setForm] = useState(EMPTY_FORM);
  const [stats, setStats] = useState(isEditing ? { power: "", defense: "", speed: "", magic: "", technique: "", luck: "" } : DEFAULT_STATS);
  const [workTagOptions, setWorkTagOptions] = useState([]);
  const [attributeTagOptions, setAttributeTagOptions] = useState([]);
  const [selectedWorkTags, setSelectedWorkTags] = useState([]);
  const [selectedAttributeTags, setSelectedAttributeTags] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [cropSource, setCropSource] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropping, setCropping] = useState(false);
  const [existingCharacter, setExistingCharacter] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // 取得登入狀態；受保護 API 使用瀏覽器 HttpOnly Cookie。
  const { user } = useAuth();
  const navigate = useNavigate();

  // 清除裁切原圖網址，避免每次選圖都留在瀏覽器記憶體。
  useEffect(() => {
    return () => { if (cropSource) URL.revokeObjectURL(cropSource); };
  }, [cropSource]);

  // 清除裁切預覽網址，避免表單離開後累積圖片記憶體。
  useEffect(() => {
    return () => { if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl); };
  }, [avatarPreviewUrl]);

  // 分別載入可選的作品與屬性標籤。
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest("/tags?kind=work"), apiRequest("/tags?kind=attribute")])
      .then(([workTags, attributeTags]) => {
        if (!active) return;
        setWorkTagOptions(workTags.map((tag) => ({ value: tag.id, label: tag.name })));
        setAttributeTagOptions(attributeTags.map((tag) => ({ value: tag.id, label: tag.name })));
      })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, []);

  // 裁切對話框開啟時鎖定背景捲動，並支援 Escape 關閉。
  useEffect(() => {
    if (!cropSource) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event) {
      if (event.key === "Escape") setCropSource("");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [cropSource]);

  // 編輯頁先載入原有角色資料。
  useEffect(() => {
    if (!isEditing) return;
    let active = true;
    apiRequest(`/characters/${id}`)
      .then((character) => {
        if (!active) return;
        setExistingCharacter(character);
        setForm({
          character_name: character.character_name || "",
          abilities: character.abilities || "",
          biography: character.biography || "",
          origin_anime: character.origin_anime || "",
          reference_url: character.reference_url || "",
          theme_song: character.theme_song || "",
          theme_song_url: character.theme_song_url || "",
        });
        setStats(character.stats
          ? Object.fromEntries(Object.entries(character.stats).map(([key, value]) => [key, String(value)]))
          : { power: "", defense: "", speed: "", magic: "", technique: "", luck: "" });
        const selectedWork = character.tags.filter((tag) => tag.kind === "work").map((tag) => ({ value: tag.id, label: tag.name }));
        const selectedAttributes = character.tags.filter((tag) => tag.kind === "attribute").map((tag) => ({ value: tag.id, label: tag.name }));
        setSelectedWorkTags(selectedWork);
        setSelectedAttributeTags(selectedAttributes);
        setWorkTagOptions((current) => mergeTagOptions(current, selectedWork));
        setAttributeTagOptions((current) => mergeTagOptions(current, selectedAttributes));
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, isEditing]);

  // 將使用者新輸入的標籤存到後端並立即加入目前選取清單。
  async function createTag(name, kind) {
    try {
      const tag = await apiRequest("/tags", { method: "POST", body: JSON.stringify({ name, kind }) });
      const option = { value: tag.id, label: tag.name };
      if (kind === "work") {
        setWorkTagOptions((current) => mergeTagOptions(current, [option]));
        setSelectedWorkTags((current) => mergeTagOptions(current, [option]));
      } else {
        setAttributeTagOptions((current) => mergeTagOptions(current, [option]));
        setSelectedAttributeTags((current) => mergeTagOptions(current, [option]));
      }
      setError("");
    } catch (tagError) {
      setError(tagError.message);
    }
  }

  // 選圖後開啟固定圓形裁切視窗，而不是立即上傳原始圖片。
  function handleAvatarSelection(event) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError(t("Avatar must be 5 MiB or smaller"));
      return;
    }
    setError("");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropSource(URL.createObjectURL(selectedFile));
  }

  // 將使用者確認的圓形裁切結果轉成正式上傳檔案和表單預覽。
  async function applyAvatarCrop() {
    if (!cropSource || !croppedAreaPixels) return;
    setCropping(true);
    setError("");
    try {
      const croppedBlob = await createCroppedAvatar(cropSource, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], "character-avatar.jpg", { type: "image/jpeg" });
      setAvatar(croppedFile);
      setAvatarPreviewUrl(URL.createObjectURL(croppedBlob));
      setCropSource("");
    } catch (cropError) {
      setError(t(cropError.message));
    } finally {
      setCropping(false);
    }
  }

  // 傳送角色欄位和可選頭像至 FastAPI。
  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      Object.entries(stats).forEach(([key, value]) => { if (value !== "") body.append(key, value); });
      const selectedTagIds = [...selectedWorkTags, ...selectedAttributeTags].map((tag) => tag.value);
      body.append("tag_ids", selectedTagIds.join(","));
      if (isEditing) body.append("tag_ids_set", "true");
      if (avatar) body.append("avatar", avatar);
      const method = isEditing ? "PATCH" : "POST";
      const path = isEditing ? `/characters/${id}` : "/characters";
      const character = await apiRequest(path, { method, body });
      navigate(isEditing ? `/characters/${character.id}` : "/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  }

  // 能力輸入完整時建立雷達圖數值，保留未完成編輯的空狀態。
  const previewStats = Object.values(stats).every((value) => value !== "")
    ? Object.fromEntries(Object.entries(stats).map(([key, value]) => [key, Number(value)]))
    : null;

  // 編輯資料尚未載入時顯示載入狀態。
  if (loading) return <section className="workspace-section"><p className="page-state">{t("Loading character details…")}</p></section>;

  return (
    <section className="workspace-section editor-page">
      <div className="editor-page-heading">
        <p className="eyebrow eyebrow-dark">{isEditing ? t("EDIT CHARACTER") : t("NEW CONTRIBUTION")}</p>
        <h1>{isEditing ? t("Edit character entry") : t("New character contribution")}</h1>
        <p>{t("Add a character name, abilities, and background to the public archive.")}</p>
      </div>
      {error && <p className="page-alert" role="alert">{error}</p>}
      <div className="editor-layout">
        <form className="editor-panel" onSubmit={handleSubmit}>
          <label className="field-label">{t("Character name")} <span>*</span>
            <input required maxLength="100" value={form.character_name} onChange={(event) => setForm({ ...form, character_name: event.target.value })} placeholder={t("e.g. Reimu Hakurei")} />
          </label>
          <div className="field-pair">
            <label className="field-label">{t("Abilities")}
              <input maxLength="255" value={form.abilities} onChange={(event) => setForm({ ...form, abilities: event.target.value })} placeholder={t("e.g. Manipulates boundaries")} />
            </label>
            <label className="field-label">{t("Source work name")}
              <input maxLength="255" value={form.origin_anime} onChange={(event) => setForm({ ...form, origin_anime: event.target.value })} placeholder={t("e.g. Embodiment of Scarlet Devil")} />
            </label>
          </div>
          <div className="tag-picker-grid">
            <TagPicker label={t("Work tags")} kind="work" options={workTagOptions} value={selectedWorkTags} onChange={setSelectedWorkTags} onCreate={createTag} />
            <TagPicker label={t("Attribute tags")} kind="attribute" options={attributeTagOptions} value={selectedAttributeTags} onChange={setSelectedAttributeTags} onCreate={createTag} />
          </div>
          <fieldset className="stat-fieldset">
            <legend>{t("Character ability scores")} <span>0–10</span></legend>
            <p>{t("Rate the character based on your interpretation. Scores appear in the detail radar chart.")}</p>
            <div className="stat-input-grid">
              {Object.entries(STAT_LABELS).map(([key, label]) => (
                <label className="field-label stat-field" key={key}>{t(label)}
                  <input type="number" min="0" max="10" step="1" value={stats[key]} onChange={(event) => setStats({ ...stats, [key]: event.target.value })} placeholder="0–10" />
                </label>
              ))}
            </div>
          </fieldset>
          <label className="field-label">{t("Character biography")}
            <textarea rows="6" value={form.biography} onChange={(event) => setForm({ ...form, biography: event.target.value })} placeholder={t("Add background, story, and spell card details…")} />
          </label>
          <label className="field-label">{t("Reference URL")}
            <input type="url" maxLength="500" value={form.reference_url} onChange={(event) => setForm({ ...form, reference_url: event.target.value })} placeholder="https://" />
          </label>
          <div className="field-pair">
            <label className="field-label">{t("Theme song")}
              <input maxLength="255" value={form.theme_song} onChange={(event) => setForm({ ...form, theme_song: event.target.value })} placeholder={t("e.g. Maiden's Capriccio ~ Dream Battle")} />
            </label>
            <label className="field-label">{t("Track URL")}
              <input type="url" maxLength="500" value={form.theme_song_url} onChange={(event) => setForm({ ...form, theme_song_url: event.target.value })} placeholder="https://" />
            </label>
          </div>
          <label className="field-label">{t("Character portrait")}
            <input className="file-input" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleAvatarSelection} />
            <small>{t("Choose an image, drag to position, and zoom to crop a square portrait. Only the circular crop is uploaded. JPG, PNG, GIF, or WEBP, up to 5 MiB.")}</small>
            {avatar && <span className="crop-ready-label">{t("✓ Circular portrait ready")}</span>}
          </label>
          <div className="form-actions">
            <button className="button button-red" type="submit" disabled={busy}>{busy ? t("Saving…") : isEditing ? t("Save changes") : t("Create character")}</button>
            <Link className="button button-quiet" to={isEditing ? `/characters/${id}` : "/dashboard"}>{t("Cancel")}</Link>
          </div>
        </form>
        <aside className="editor-aside">
          <p className="eyebrow">{t("PREVIEW")}</p>
          {avatarPreviewUrl ? (
            <img className="character-avatar character-avatar-large" src={avatarPreviewUrl} alt={`${form.character_name || t("Character")} ${t("avatar crop preview")}`} />
          ) : existingCharacter ? (
            <CharacterAvatar character={existingCharacter} large />
          ) : (
            <div className="preview-placeholder">{form.character_name.slice(0, 1) || "?"}</div>
          )}
          <h2>{form.character_name || t("Character name")}</h2>
          <p>{form.abilities || t("Ability not provided")}</p>
          <span>{form.origin_anime || t("Source work name")}</span>
          <div className="editor-radar-preview">
            <p className="eyebrow">{t("ABILITY PREVIEW")}</p>
            <AbilityRadar stats={previewStats} compact />
          </div>
          <div className="aside-rule" />
          <p className="preview-help">{t("Your contribution will appear in the public archive. Please verify the information and respect the source work's content guidelines.")}</p>
        </aside>
      </div>
      {cropSource && (
        <div className="crop-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCropSource(""); }}>
          <section className="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-title">
            <header className="crop-dialog-heading">
              <div>
                <p className="eyebrow eyebrow-dark">{t("AVATAR EDITOR")}</p>
                <h2 id="crop-title">{t("Adjust portrait crop")}</h2>
              </div>
              <button className="crop-close" type="button" aria-label={t("Close crop dialog")} onClick={() => setCropSource("")}>×</button>
            </header>
            <p className="crop-instructions">{t("Drag the image to position it, then use the slider to zoom. Areas outside the circle will not be uploaded.")}</p>
            <div className="crop-stage">
              <Cropper
                image={cropSource}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                restrictPosition
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            </div>
            <label className="crop-zoom-control">
              <span>{t("Zoom")}</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
              <output>{zoom.toFixed(1)}×</output>
            </label>
            <footer className="crop-dialog-actions">
              <button className="button button-quiet" type="button" onClick={() => setCropSource("")}>{t("Cancel")}</button>
              <button className="button button-red" type="button" disabled={!croppedAreaPixels || cropping} onClick={applyAvatarCrop}>{cropping ? t("Cropping…") : t("Use this crop")}</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

// 合併 Autocomplete 選項並以資料庫 ID 去重。
function mergeTagOptions(current, additions) {
  const options = new Map(current.map((option) => [option.value, option]));
  additions.forEach((option) => options.set(option.value, option));
  return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label, "zh-Hant"));
}

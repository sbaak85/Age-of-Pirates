# 波賽頓高面數雕塑原稿

狀態：等待使用者檢視造型；未減面，未整合主地圖。2026-09-26。

預覽：`/game/poseidon-sculpt-preview.html`。

目前完整雕像 579,694 三角面、17 個網格，包含基座及三叉戟；最高點為戟尖 17m。基座直徑8m。此為原稿，不以面數多寡代表造型已獲確認。

人體、頭部、頭髮、鬍鬚由 `tools/build-poseidon-sculpt.py` 的隱式曲面重建，positions/indices 二進位檔為高密度原始曲面。披布、三叉戟與基座由 `game/poseidon-sculpt.js` 建構。材質只有輕微石紋，主要形體細節來自幾何。

`master/scene.json` 與同目錄二進位檔保存本次完整網格快照，包含所有程序產生的披布、三叉戟及基座；不可在減面作業中覆寫這份原稿。標準材質已保存；額外程序石紋見 JS 原始碼。

`node tools/verify-poseidon-sculpt.mjs` 檢查索引、有限頂點值、面數及整體尺度。`node tools/export-poseidon-master.mjs` 生成完整快照。Python作者端需numpy、scipy、scikit-image；使用與頭骨相同的本機套件目錄，瀏覽器不需要這些套件。

已在預覽檢查正面、側面、背面、臉部與持戟手部。遊戲碰撞與鏡頭遮擋尚未配置。只有使用者確認造型後，才另存約5,000面版本，與本原稿對照；不得自動把高面數原稿標記為approved。

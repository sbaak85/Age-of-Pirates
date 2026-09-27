# 沉眠巨獸：正式 5k 成品

- 完整獸骨：**4,929 三角面**，68 顆牙齒。
- 後腦／眼窩寬度最大為原本 145%，平滑收束至鼻端；長度與高度不變。
- 下排左右最前端各兩顆牙齒已移除。
- 成品根節點線性尺寸為原版 60%（2026-09-26 由 80% 調整），船隻參考尺寸維持不變。
- 附帶原樣的島地、植被與骨骼風化材質；4,929 面不含環境。

正式載入方式：`import {createBeastSkull} from './beast-skull-model.js'`。此入口直接載入本目錄的 `scene.json` 與二進位緩衝，不建立或下載原始高面數模型。加寬與牙齒修正已寫入成品頂點，不需執行期再次變形。

以 `game/beast-skull-preview.html` 檢視成品；主地圖目前尚未放置獸骨。

高面數來源與候選版本封存於 `archive/beast-skull/2026-09-26/`，不屬於遊戲執行期資產。重新輸出執行 `node tools/build-beast-skull-final.mjs`，驗證執行 `node tools/verify-beast-skull-final.mjs`。

二進位檔記錄於 `scene.json` 的 `beastSkull.files`，包含 byte length 與 SHA-256。幾何屬性保留位置、法線、顏色及 UV，材質程式位於 `game/beast-skull-materials.js`。

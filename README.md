# 海戰紀元 · Age of Pirates

使用 Three.js 製作的海戰動作 RPG 單機初版，包含五區環狀峽灣、慣性航行、側舷四砲齊射、海怪、寶箱與港口整備。

## 主專案

- 本機主工作目錄：`C:\Users\sbaak.fang\ChatGPT\Age of Pirates`
- GitHub：<https://github.com/sbaak85/Age-of-Pirates>
- 主分支：`main`

## 啟動

安裝 Node.js 20 或更新版本後，在 Windows 執行 `啟動海戰紀元.cmd`，或執行：

```sh
node preview-server.mjs
```

- 主遊戲：<http://127.0.0.1:4317/game/>
- 五區地圖預覽：<http://127.0.0.1:4317/game/archipelago-preview.html>

遊戲已隨附 Three.js 0.180.0，位於納入 Git 追蹤的 `vendor/three`，包含主遊戲與各預覽頁使用的模組及授權。一般啟動不需要執行 npm／pnpm 安裝，也不需要連網下載套件；本機 HTTP 伺服器仍需要 Node.js。

開發與執行 Node 測試時，先使用 `pnpm install --frozen-lockfile` 安裝已鎖定的相依套件。更新 Three.js 或新增 addon 後，執行 `node scripts/vendor-three.mjs` 更新隨附檔案與雜湊清單，並一起提交至 Git。

## 測試與文件

```sh
node --test game/*.test.mjs
```

詳細玩法、操作與目前限制請參閱 [A2 製作摘要](docs/A2-環狀峽灣-製作摘要.md) 及 [遊戲說明](game/README.md)。目前尚未實作四人連線。

`Assets` 包含美術參考與規劃圖，來源作品的權利屬原作者；參考圖不代表已授權作為遊戲發行素材。

套件目錄、快取、日誌與本機備份不納入 Git。

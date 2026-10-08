# 拾火創意 PIKHUO 官網首頁 v3

這是一個可直接部署到 GitHub Pages 的純靜態網站，不需要 npm、Next.js 或 GitHub Actions 建置。

## 檔案

- `index.html`：網站內容與結構
- `styles.css`：完整視覺與響應式排版
- `app.js`：Canvas 粒子 Logo、滾動轉換及表單狀態
- `assets/logo-targets.json`：PIKHUO Logo 粒子定位資料

## GitHub Pages

將 `index.html`、`styles.css`、`app.js`、`assets` 與 `README.md` 直接放在 repository 根目錄。

進入 GitHub：

1. `Settings`
2. `Pages`
3. `Source` 選擇 `Deploy from a branch`
4. Branch 選擇 `main`
5. Folder 選擇 `/(root)`
6. 儲存

## 聯絡表單

目前表單僅提供欄位驗證，不會傳送資料，也不會顯示虛構的成功訊息。正式上線前需要串接實際收件服務。

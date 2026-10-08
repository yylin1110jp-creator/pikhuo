# 拾火創意 PIKHUO 官網首頁

以繁體中文為主的完整行銷工作室首頁。視覺核心沿用已確認的 PIKHUO v5 粒子 Logo，並整合今晚定稿的定位、流程、服務、合作對象、合作方式與聯絡內容。

## 技術與結構

- Next.js 15 / React 19
- React Three Fiber / Three.js / GLSL
- 14,000 個 Logo 精確粒子目標點
- HTML、樣式與互動元件分離，可繼續增加內頁
- 靜態匯出，可部署到 GitHub Pages
- 支援行動版與 `prefers-reduced-motion`
- Hero 離開畫面後暫停 WebGL 更新，並限制像素倍率以降低負載

## 本機預覽

```bash
npm install
npm run dev
```

瀏覽 `http://localhost:3000`。

## 產生靜態網站

```bash
npm run build
```

輸出位於 `out/`。若部署於 GitHub 專案子路徑，可使用：

```bash
NEXT_PUBLIC_BASE_PATH=/你的-repository-name npm run build
```

專案內已附 `.github/workflows/deploy.yml`，推送到 `main` 後可由 GitHub Pages 自動建置與部署。

## 上線前必做

聯絡表單目前只做瀏覽器端欄位驗證，沒有虛構成功訊息，也不會傳送資料。正式上線前請串接實際表單端點或後端服務；確認真實電子郵件、電話或 LINE 資料後再加入頁面。

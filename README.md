# 拾火創意 PIKHUO 官網首頁

以繁體中文為主的單頁行銷工作室官網，HTML、CSS、JavaScript 已分離，可直接部署至 GitHub Pages。

## 檔案

- `index.html`：網站內容與語意結構
- `styles.css`：視覺、響應式版面與減少動態效果支援
- `script.js`：粒子動畫、流程滾動、導覽與表單狀態

## 本機預覽

在專案資料夾執行：

```bash
python3 -m http.server 8000
```

瀏覽 `http://localhost:8000`。

## GitHub Pages

將三個網站檔案放在儲存庫根目錄，至 Settings → Pages，選擇從主要分支根目錄部署。

## 上線前必要設定

目前未提供真實電子郵件、電話或 LINE，因此沒有寫入任何虛構聯絡資訊。表單會驗證欄位，但不會顯示已成功送出。正式上線前，請在 `script.js` 串接實際表單端點，再將提示文字改為真實結果。

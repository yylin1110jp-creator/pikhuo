# PIKHUO 拾火創意官網 v2

三頁網站，HTML、CSS、JavaScript 與圖片分開管理。無需 npm、建置或外部依賴。

## 開啟預覽
先完整解壓縮，再用 Chrome 或 Edge 開啟 index.html。請保留 assets 資料夾的位置。

## 檔案說明
- index.html：首頁、粒子互動、品牌介紹與六項服務摘要。
- services.html：服務對象、工作範圍、交付內容、合作流程與常見問題。
- contact.html：聯絡資料與合作需求整理工具。
- assets/css/main.css：共用配色、排版、元件與響應式規則。
- assets/css/pages.css：三頁個別版面。
- assets/js/main.js：共用選單、頁尾年份。
- assets/js/particles.js：首頁專用粒子動畫。
- assets/js/contact.js：合作需求複製、下載、服務預選。
- assets/images/favicon.svg：瀏覽器圖示。
- .nojekyll：GitHub Pages 設定。

## 上傳 GitHub
1. 打開你剛建立的 pikhuo repository。
2. 空白儲存庫點 uploading an existing file；已有檔案則點 Add file → Upload files。
3. 把本資料夾內的三個 HTML、整個 assets 資料夾、README.md 與 .nojekyll 拖入。
4. 不要只上傳 ZIP，也不要把外層資料夾一起包進去。index.html 必須在根目錄。
5. 點 Commit changes。
6. Settings → Pages → Source: Deploy from a branch。
7. Branch 選 main，資料夾選 /(root)，Save。
8. 等待部署完成，以 Pages 畫面提供的網址為準。

官方說明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 聯絡方式與服務
本版沿用林元一／0912-635-636。若需修改，搜尋 contact.html 的姓名與電話（包含 tel 連結）。
六項服務為提案文案，發布前請確認實際承接範圍。
需求工具只在瀏覽器記憶體整理文字，不自動儲存、不自動傳送；電話按鈕可開啟支援裝置的撥號工具。
尚未提供正式 Email、LINE 連結或收件後端，因此沒有虛構表單送出成功流程。

## 設計與驗證
黑、暖白、火光橘；文字式 PIKHUO 品牌標記，非正式向量 Logo。
首頁粒子支援滑鼠擾動、點擊散開回聚、暫停動畫、減少動態偏好、離開視窗暫停。
未加入未授權客戶案例、推薦語或虛構成效。
已驗證檔案路徑、頁面連結、獨立標題與描述、JavaScript 語法及主要互動邏輯。
本次環境未提供可用的網站瀏覽器測試能力，尚未完成實機視覺驗證；請先開啟確認桌機及手機效果。
取得正式網域後再加入對應 canonical URL、sitemap 與 Search Console 設定，避免放入錯誤網址。

# 🎌 Fukuoka Travel App (福岡 7天6夜專屬旅遊助手)

> 一款專為福岡（Fukuoka） 7 天 6 夜自由行打造的個人化行動優先 Web 應用程式 (未來可升級為 PWA )，結合了行程地圖、機票預訂管理與記帳功能，讓您的九州之旅更輕鬆！

## ✨ 核心功能 (Features)

*   🗺 **視覺化行程與互動地圖 (Visual Itinerary & Map)**
    *   每日景點時間軸排列（Day 1 ~ Day 7）。
    *   整合地圖功能，標註當天預計前往的景點，路線不再繞路。
*   ✈️ **航班與住宿資訊樞紐 (Flight & Accommodation Hub)**
    *   集中管理去回程機票、航廈資訊及飯店預訂資訊。
    *   省去在信箱、相簿裡翻找訂房憑證的麻煩。
*   💰 **個人旅遊記帳本 (Travel Expense Tracker)**
    *   快速紀錄每筆花費。
    *   即時「日圓轉台幣」匯率換算計算。
    *   多類別消費統計（交通、飲食、購物等）。
*   🎒 **行前準備與備忘錄 (Checklist & Documents)** *(規劃中)*
    *   客製化行李清單確認。
    *   數位化備忘錄（可存放入境 QR Code、電子交通票等）。

## 🛠 技術棧 (Tech Stack)

此專案採用現代化 Web 開發技術，強調快速開發與流暢的手機端互動體驗：

*   **前端框架**：[React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **介面與樣式**：[Tailwind CSS](https://tailwindcss.com/) (打造現代感、玻璃擬物或日系簡約介面)
*   **部署/架構策略**：Mobile-first 網頁，第一階段即可於瀏覽器無縫操作，具備未來升級為 PWA (Progressive Web App) 甚至打包為原生 APP 的彈性。

## 🚀 開發計畫 (Roadmap)

- [ ] **Phase 1: 基礎架構** - 建立 React + Vite 專案，設定 Tailwind CSS 與路由。
- [ ] **Phase 2: 核心 UI 開發** - 刻出底部選單導覽（主頁、行程、記帳）、首頁儀表板。
- [ ] **Phase 3: 實作地圖與行程** - 串接開源地圖 (如 Leaflet) 或 Google Maps API。
- [ ] **Phase 4: 記帳與資料儲存** - 實作 LocalStorage 儲存花費紀錄，完成記帳邏輯。
- [ ] **Phase 5: PWA 體驗升級** - 加入 PWA 設定，實現在手機桌面安裝 APP 圖示及支援基本離線存取。

## 🤝 授權與宣告 (License)

此專案為個人旅行客製化之用。未來預計上傳至 GitHub，透過自動化部署工具（如 Vercel 或 GitHub Pages）即時發布版本。

---
*Developed with ❤️ for an unforgettable trip to Fukuoka!*

# Bandcamp Purchases Exporter

A lightweight web application built with **Next.js**, **Material UI (MUI)**, and **Lucide Icons** that allows you to scrape, review, and export your Bandcamp purchase history.

## 🚀 Features

- **Auth via Cookie**: No password required. Uses your Bandcamp `identity` cookie to securely proxy requests.
- **Progressive Scraping**: Fetches your collection page-by-page, allowing you to see results as they come in.
- **Smart Preorder Detection**: Automatically flags items that are preorders and identifies if they are still unreleased.
- **High-Res Previews**: A detailed side drawer shows high-resolution album art and raw metadata for every item.
- **Local Persistence**: Saves your scraped data to browser storage so you don't lose your work on refresh.
- **Multi-Format Export**: Export your collection to **CSV** (for spreadsheets) or **JSON** (full metadata).
- **MUI X Data Grid**: Powerful table view with sorting, filtering, and quick search capabilities.

## 🛠 Getting Started

### Prerequisites

- Node.js 18+
- A Bandcamp account with purchases

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Run the development server**:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🍪 How to get your Identity Cookie

To scrape your collection, this app needs your Bandcamp `identity` cookie. This cookie is used only for the current session and is never stored on any server.

1. Go to [bandcamp.com](https://bandcamp.com) and log in.
2. Open your browser's **Developer Tools** (F12 or Right Click > Inspect).
3. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox).
4. In the sidebar, under **Cookies**, select `https://bandcamp.com`.
5. Find the cookie named `identity`.
6. Double-click its **Value**, copy it, and paste it into the app.

## 📝 Project Structure

- `/src/app/api`: Next.js Route Handlers for proxying Bandcamp endpoints.
- `/src/hooks`: Custom hooks like `useBandcampScraper` for core logic.
- `/src/components`: UI components (ReviewTable, ScrapeControls, etc.).
- `/src/services`: Utility functions for data normalization and deduplication.
- `/src/types`: TypeScript interfaces reflecting Bandcamp's API and our internal data model.

## 🛡 Privacy

- **No Passwords**: We never ask for your password.
- **No Server Storage**: Your identity cookie is held only in memory and sent over HTTPS to proxy routes. It is never logged or stored.
- **Local Data Only**: Your scraped purchase data is stored in your own browser's `localStorage`.

## ⚖ License

MIT

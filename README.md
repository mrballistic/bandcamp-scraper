# Bandcamp Purchases Exporter

A powerful web application built with **Next.js**, **Material UI (MUI)**, and **Puppeteer** that allows you to scrape, review, and export your entire Bandcamp purchase history, including hidden items.

## 🚀 Features

- **Authenticated Scraping**: Uses **Puppeteer** (headless Chrome) to maintain a secure, authenticated session via your Bandcamp `identity` cookie.
- **Hidden Items Support**: Automatically discovers and scrapes items you've "hidden" in your collection—no entry is left behind.
- **Dual-Strategy Discovery**: Smart auto-discovery of your username slug from the homepage, with a manual override for faster, more reliable scraping.
- **Accurate Metadata Extraction**: Correctly identifies purchase dates, high-resolution artwork, and preorder statuses (including unreleased vs. partially released).
- **Multi-Format Export**: One-click export to **CSV** (includes "Hidden" flag and preorder status) or **JSON** (full raw metadata).
- **Responsive Metadata Drawer**: Review every detail of your purchases, including raw API responses, in a beautiful, dark-mode-ready slide-out drawer.
- **Local Persistence**: Results are saved to browser storage, ensuring you can review and export your data even after a page refresh.

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

## 🧪 Testing

This project includes a comprehensive test suite using **Vitest** and **React Testing Library**, covering core hook logic, data normalization, and component interactions.

### Run Tests

```bash
npm test
```

### Recent Test Results

```text
 Test Files  4 passed (4)
      Tests  13 passed (13)
   Duration  1.39s
```

## 🍪 Configuration

To scrape your collection, this app needs your Bandcamp `identity` cookie:

1. Go to [bandcamp.com](https://bandcamp.com) and log in.
2. Open your browser's **Developer Tools** (F12 or Right Click > Inspect).
3. Go to the **Application** tab (Chrome/Edge) or **Storage** tab (Firefox).
4. In the sidebar, under **Cookies**, select `https://bandcamp.com`.
5. Find the <code>identity</code> cookie and copy its **Value**.
6. (Optional) Provide your **Username Slug** (e.g., `mrballistic`) to bypass auto-discovery.

## 🛡 Privacy

- **No Passwords**: We never ask for your password.
- **No Server Storage**: Your identity cookie is held only in memory and sent over HTTPS to proxy routes. It is never logged or stored.
- **Local Data Only**: Your scraped purchase data is stored in your own browser's `localStorage`.

## ⚖ License

MIT

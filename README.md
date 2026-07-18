# Focus Tree

專注於「你已經完成了什麼」的心靈成長 App。目標樹、Micro-Log、無焦慮回顧。

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4（響應式 Web）
- **Backend:** Next.js API Routes, MongoDB + Mongoose
- **Auth:** bcrypt 密碼雜湊、JWT（httpOnly Cookie）

## Getting Started

### 1. 環境變數

```bash
cp .env.example .env.local
```

編輯 `.env.local`：

| 變數 | 說明 |
|------|------|
| `MONGODB_URI` | MongoDB 連線字串 |
| `JWT_SECRET` | 至少 32 字元的隨機密鑰（production 必換） |
| `JWT_EXPIRES_IN` | Token 有效期，預設 `7d` |

### 2. 啟動 MongoDB

本機需有 MongoDB 運行中，或使用 MongoDB Atlas 連線字串。

### 3. 開發伺服器

```bash
npm install
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)，未登入會導向 `/login`。

## Auth 安全設計

- 密碼以 **bcrypt**（12 rounds）雜湊儲存，明文永不入庫
- Session 以 **JWT** 簽發，存放於 **httpOnly + SameSite=Lax** Cookie
- Production 環境 Cookie 自動加上 `Secure` flag
- API 回應僅返回 `SafeUser`（不含 `passwordHash`）
- Middleware 保護所有頁面與 API（`/login`、`/register` 除外）

## 專案結構

```
src/
├── app/
│   ├── (auth)/          # 登入、註冊
│   ├── (protected)/     # 需登入的頁面
│   └── api/auth/        # 認證 API
├── components/
├── lib/auth/            # bcrypt, JWT, session
├── models/              # Mongoose schemas
└── middleware.ts        # 路由保護
```

## Scripts

- `npm run dev` — 開發模式
- `npm run build` — 正式建置
- `npm run start` — 正式伺服器
- `npm run lint` — ESLint

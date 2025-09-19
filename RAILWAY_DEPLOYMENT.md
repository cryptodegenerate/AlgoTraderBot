# Railway Deployment Guide - Goose Alpha Trading Bot

## 🚀 Quick Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/your-template-id)

## Required APIs and Accounts

### 1. **Railway Account** (Free tier available)
- **URL**: https://railway.com
- **Purpose**: Cloud hosting platform
- **Cost**: $0-$19+/month
- **Setup**: Sign up with GitHub account

### 2. **Database** (Railway PostgreSQL - Recommended)
- **Purpose**: Store trading data, bot settings, equity history
- **Setup**: Auto-provisioned through Railway
- **Environment Variable**: `DATABASE_URL` (auto-injected)

### 3. **Exchange API Keys** (Choose your preferred exchanges)

#### **Bybit API** (Recommended for beginners)
- **URL**: https://www.bybit.com/en/help-center/HelpCenterKnowledge/bybitHC_Article?language=en_US&id=000001857
- **Purpose**: Cryptocurrency trading
- **Required**: 
  - `BYBIT_API_KEY`
  - `BYBIT_API_SECRET`
- **Permissions**: Read + Trade (NOT Withdraw)
- **Cost**: Free account, trading fees apply

#### **OKX API** (Advanced features)
- **URL**: https://www.okx.com/docs/en/#overview
- **Purpose**: Cryptocurrency trading with advanced order types
- **Required**:
  - `OKX_API_KEY`
  - `OKX_API_SECRET`
- **Permissions**: Read + Trade (NOT Withdraw)
- **Cost**: Free account, trading fees apply

#### **Kraken API** (Regulated markets)
- **URL**: https://docs.kraken.com/rest/
- **Purpose**: Regulated cryptocurrency trading
- **Required**:
  - `KRAKEN_API_KEY`
  - `KRAKEN_API_SECRET`
- **Permissions**: Query + Trade (NOT Withdraw)
- **Cost**: Free account, trading fees apply

### 4. **Telegram Bot API** (Optional - Recommended for alerts)
- **URL**: https://core.telegram.org/bots#6-botfather
- **Purpose**: Real-time trade alerts and notifications
- **Required**:
  - `TELEGRAM_BOT_TOKEN` (from @BotFather)
  - `TELEGRAM_CHAT_ID` (your chat ID or group ID)
- **Setup**: 
  1. Message @BotFather on Telegram
  2. Create new bot with `/newbot`
  3. Get your Chat ID by messaging @userinfobot
- **Cost**: Free

### 5. **Session Security**
- **Required**: `SESSION_SECRET`
- **Purpose**: Secure user sessions
- **Setup**: Generate random 64-character string

## Environment Variables Setup

Set these in Railway's environment variables:

```env
# Required
NODE_ENV=production
DATABASE_URL=postgresql://... (auto-injected by Railway)
SESSION_SECRET=your-random-64-char-string

# Exchange APIs (at least one required)
BYBIT_API_KEY=your-bybit-key
BYBIT_API_SECRET=your-bybit-secret

# Optional but recommended
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
ADMIN_TOKEN=your-admin-token
```

## Deployment Steps

### 1. **Fork/Clone Repository**
```bash
git clone your-repository
cd goose-alpha-trading-bot
```

### 2. **Connect to Railway**
- Go to [Railway](https://railway.com)
- Click "Deploy from GitHub repo"
- Select your repository
- Railway will auto-detect and deploy

### 3. **Add PostgreSQL Database**
- In Railway dashboard, click "Add Database"
- Select "PostgreSQL"
- Database will auto-connect via `DATABASE_URL`

### 4. **Configure Environment Variables**
- Go to your Railway project
- Click "Variables" tab
- Add all required environment variables listed above

### 5. **Deploy and Monitor**
- Railway auto-deploys on git push
- Monitor logs in Railway dashboard
- Health check available at: `your-app.railway.app/api/health`

## Cost Breakdown

| Service | Free Tier | Paid Plans | Recommended |
|---------|-----------|------------|-------------|
| **Railway** | 500 hours/month | $19+/month | Core ($19/month) |
| **Exchanges** | Free accounts | Trading fees (0.1-0.5%) | Start with one |
| **Telegram** | Completely free | N/A | Free |
| **Total Monthly** | ~$0 | $19+ | $19/month |

## Security Best Practices

1. **API Key Permissions**:
   - ✅ Enable: Read, Trade
   - ❌ Disable: Withdraw, Admin
   
2. **IP Whitelist**: Consider restricting API keys to Railway's IP ranges

3. **Environment Variables**: Never commit secrets to git

4. **Two-Factor Auth**: Enable 2FA on all exchange accounts

## Performance Optimization

Railway automatically provides:
- ✅ Auto-scaling (up to 50 replicas)
- ✅ Health checks and restart policies
- ✅ Global CDN for static assets
- ✅ 90-day log retention
- ✅ Metrics monitoring

## Support

- **Railway Support**: https://railway.com/help
- **Trading Bot Issues**: Create GitHub issue
- **Exchange API Issues**: Check exchange documentation

## Quick Links

- [Railway Dashboard](https://railway.com/dashboard)
- [Bybit API Docs](https://bybit-exchange.github.io/docs/)
- [OKX API Docs](https://www.okx.com/docs/en/)
- [Kraken API Docs](https://docs.kraken.com/rest/)
- [Telegram Bot Tutorial](https://core.telegram.org/bots#6-botfather)
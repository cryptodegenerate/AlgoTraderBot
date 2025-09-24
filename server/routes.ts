import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTradeSchema, insertEquitySchema, insertBotStatusSchema, insertBotSettingsSchema, insertPositionSchema } from "@shared/schema";
import { z } from "zod";

// Optional authentication middleware for protected endpoints
const optionalAdminAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const adminToken = process.env.ADMIN_TOKEN;
  
  // If no admin token is configured, allow access (development mode)
  if (!adminToken) {
    console.log("⚠️ No ADMIN_TOKEN configured - allowing unrestricted access");
    return next();
  }
  
  // If admin token is configured but no auth header provided, deny access
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }
  
  const token = authHeader.substring(7);
  if (token !== adminToken) {
    return res.status(403).json({ error: "Invalid admin token" });
  }
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  console.log(`🔗 Registering API routes...`);
  
  // Health check endpoint for Railway
  app.get("/api/health", (req, res) => {
    const healthData = {
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      port: process.env.PORT || "5000",
      pid: process.pid,
      memory: process.memoryUsage(),
      platform: process.platform
    };
    
    console.log("🏥 Health check requested:", healthData);
    res.status(200).json(healthData);
  });

  // Bot status endpoints
  app.get("/api/bot/status", async (req, res) => {
    try {
      const status = await storage.getBotStatus();
      res.json(status || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot status" });
    }
  });

  app.post("/api/bot/status", optionalAdminAuth, async (req, res) => {
    try {
      const data = insertBotStatusSchema.parse(req.body);
      const status = await storage.updateBotStatus(data);
      res.json(status);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update bot status" });
      }
    }
  });

  // Bot settings endpoints
  app.get("/api/bot/settings", async (req, res) => {
    try {
      const settings = await storage.getBotSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot settings" });
    }
  });

  app.put("/api/bot/settings", optionalAdminAuth, async (req, res) => {
    try {
      // Validate request body with partial schema since some fields are optional
      const validateData = insertBotSettingsSchema.deepPartial().parse(req.body);
      const settings = await storage.updateBotSettings(validateData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update bot settings" });
      }
    }
  });

  // Bot control endpoints
  app.post("/api/bot/start", optionalAdminAuth, async (req, res) => {
    try {
      const status = await storage.updateBotStatus({
        isRunning: true,
        lastUpdate: Date.now(),
      });
      res.json({ success: true, status });
    } catch (error) {
      res.status(500).json({ error: "Failed to start bot" });
    }
  });

  app.post("/api/bot/pause", optionalAdminAuth, async (req, res) => {
    try {
      const status = await storage.updateBotStatus({
        isRunning: false,
        lastUpdate: Date.now(),
      });
      res.json({ success: true, status });
    } catch (error) {
      res.status(500).json({ error: "Failed to pause bot" });
    }
  });

  app.post("/api/bot/kill", optionalAdminAuth, async (req, res) => {
    try {
      const status = await storage.updateBotStatus({
        isRunning: false,
        lastUpdate: Date.now(),
      });
      // Clear all positions
      const positions = await storage.getPositions();
      for (const position of positions) {
        await storage.deletePosition(position.id);
      }
      res.json({ success: true, status });
    } catch (error) {
      res.status(500).json({ error: "Failed to kill bot" });
    }
  });

  // Trades endpoints
  app.get("/api/trades", async (req, res) => {
    try {
      const { limit, symbol, status } = req.query;
      const trades = await storage.getTrades(
        limit ? parseInt(limit as string) : undefined,
        symbol as string,
        status as string
      );
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Failed to get trades" });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const data = insertTradeSchema.parse(req.body);
      const trade = await storage.createTrade(data);
      res.json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create trade" });
      }
    }
  });

  // Positions endpoints
  app.get("/api/positions", async (req, res) => {
    try {
      const positions = await storage.getPositions();
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get positions" });
    }
  });

  app.post("/api/positions", async (req, res) => {
    try {
      const data = insertPositionSchema.parse(req.body);
      const position = await storage.createPosition(data);
      res.json(position);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create position" });
      }
    }
  });

  // Equity endpoints
  app.get("/api/equity", async (req, res) => {
    try {
      const { limit } = req.query;
      const equity = await storage.getEquityHistory(
        limit ? parseInt(limit as string) : undefined
      );
      res.json(equity);
    } catch (error) {
      res.status(500).json({ error: "Failed to get equity history" });
    }
  });

  app.get("/api/equity/latest", async (req, res) => {
    try {
      const equity = await storage.getLatestEquity();
      res.json(equity || { equity: 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to get latest equity" });
    }
  });

  app.post("/api/equity", async (req, res) => {
    try {
      const data = insertEquitySchema.parse(req.body);
      const equity = await storage.createEquity(data);
      res.json(equity);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create equity record" });
      }
    }
  });

  // OHLCV data endpoints
  app.get("/api/ohlcv/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { limit } = req.query;
      const data = await storage.getOHLCVData(
        symbol,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to get OHLCV data" });
    }
  });

  // Telegram endpoints
  app.post("/api/telegram/send", optionalAdminAuth, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (!botToken || !chatId) {
        return res.status(400).json({ error: "Telegram bot token or chat ID not configured" });
      }
      
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      
      if (!telegramResponse.ok) {
        const errorData = await telegramResponse.json();
        console.error('Telegram API error:', errorData);
        return res.status(500).json({ error: "Failed to send telegram message", details: errorData });
      }
      
      res.json({ success: true, message: "Alert sent successfully" });
    } catch (error) {
      console.error('Telegram send error:', error);
      res.status(500).json({ error: "Failed to send telegram alert" });
    }
  });

  app.post("/api/telegram/test", optionalAdminAuth, async (req, res) => {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (!botToken || !chatId) {
        return res.status(400).json({ error: "Telegram bot token or chat ID not configured" });
      }
      
      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const testMessage = "🤖 Goose Alpha Bot Test\n\nTelegram connection is working! Your bot is ready to send trading alerts.";
      
      const telegramResponse = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: testMessage,
          parse_mode: 'HTML'
        })
      });
      
      if (!telegramResponse.ok) {
        const errorData = await telegramResponse.json();
        console.error('Telegram API error:', errorData);
        return res.status(500).json({ error: "Telegram connection test failed", details: errorData });
      }
      
      res.json({ success: true, message: "Telegram connection test successful" });
    } catch (error) {
      console.error('Telegram test error:', error);
      res.status(500).json({ error: "Telegram connection test failed" });
    }
  });

  console.log(`🌐 Creating HTTP server...`);
  const httpServer = createServer(app);

  // WebSocket server for real-time updates - temporarily disabled for Railway debugging
  // const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  console.log(`✅ Server setup complete, returning HTTP server`);

  /* Temporarily disabled for Railway debugging
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now()
    }));

    // Simulate real-time updates
    const priceInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send mock price updates
        ws.send(JSON.stringify({
          type: 'price_update',
          data: {
            symbol: 'BTC/USDT',
            price: 43000 + (Math.random() - 0.5) * 1000,
            timestamp: Date.now()
          }
        }));
      }
    }, 2000);

    // Simulate bot status updates every 15 seconds
    const statusInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'bot_status_update',
          data: {
            status: Math.random() > 0.7 ? 'paused' : 'running',
            lastActivity: new Date().toLocaleString(),
            uptime: Math.floor(Math.random() * 86400000), // Random uptime in ms
            tradesToday: Math.floor(Math.random() * 10),
          },
          timestamp: Date.now()
        }));
      }
    }, 15000);

    // Simulate position updates every 20 seconds
    const positionInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const hasPosition = Math.random() > 0.6;
        ws.send(JSON.stringify({
          type: 'position_update',
          data: hasPosition ? {
            id: 'pos_' + Math.random().toString(36).substr(2, 9),
            symbol: 'BTC/USDT',
            side: Math.random() > 0.5 ? 'long' : 'short',
            size: Math.random() * 0.1 + 0.01,
            entryPrice: 43000 + (Math.random() - 0.5) * 500,
            unrealizedPnl: (Math.random() - 0.5) * 200,
            percentage: (Math.random() - 0.5) * 5
          } : null,
          timestamp: Date.now()
        }));
      }
    }, 20000);

    // Simulate trade updates occasionally  
    const tradeInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN && Math.random() > 0.85) { // 15% chance
        ws.send(JSON.stringify({
          type: 'trade_update',
          data: {
            id: 'trade_' + Math.random().toString(36).substr(2, 9),
            symbol: 'BTC/USDT',
            side: Math.random() > 0.5 ? 'buy' : 'sell',
            amount: Math.random() * 0.1 + 0.01,
            price: 43000 + (Math.random() - 0.5) * 1000,
            pnl: (Math.random() - 0.5) * 150,
            timestamp: Date.now(),
            status: 'completed'
          },
          timestamp: Date.now()
        }));
      }
    }, 8000);

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clearInterval(priceInterval);
      clearInterval(statusInterval);
      clearInterval(positionInterval);
      clearInterval(tradeInterval);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(priceInterval);
      clearInterval(statusInterval);
      clearInterval(positionInterval);
      clearInterval(tradeInterval);
    });
  });
  */ // End temporary WebSocket disable

  return httpServer;
}

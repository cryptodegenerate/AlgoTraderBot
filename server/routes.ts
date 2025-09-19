import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertTradeSchema, insertEquitySchema, insertBotStatusSchema, insertBotSettingsSchema, insertPositionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Bot status endpoints
  app.get("/api/bot/status", async (req, res) => {
    try {
      const status = await storage.getBotStatus();
      res.json(status || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot status" });
    }
  });

  app.post("/api/bot/status", async (req, res) => {
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

  app.put("/api/bot/settings", async (req, res) => {
    try {
      const settings = await storage.updateBotSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update bot settings" });
    }
  });

  // Bot control endpoints
  app.post("/api/bot/start", async (req, res) => {
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

  app.post("/api/bot/pause", async (req, res) => {
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

  app.post("/api/bot/kill", async (req, res) => {
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
  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // In a real implementation, this would send to Telegram
      // For now, just return success
      res.json({ success: true, message: "Alert sent successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to send telegram alert" });
    }
  });

  app.post("/api/telegram/test", async (req, res) => {
    try {
      // In a real implementation, this would test the Telegram connection
      res.json({ success: true, message: "Telegram connection test successful" });
    } catch (error) {
      res.status(500).json({ error: "Telegram connection test failed" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    // Send initial data
    ws.send(JSON.stringify({
      type: 'connected',
      timestamp: Date.now()
    }));

    // Simulate real-time updates
    const interval = setInterval(() => {
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

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      clearInterval(interval);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clearInterval(interval);
    });
  });

  return httpServer;
}

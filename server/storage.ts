import { type Trade, type InsertTrade, type Equity, type InsertEquity, type BotStatus, type InsertBotStatus, type BotSettings, type InsertBotSettings, type Position, type InsertPosition, type OHLCVData, type InsertOHLCV } from "@shared/schema";
import { randomUUID } from "crypto";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

export interface IStorage {
  // Trades
  getTrades(limit?: number, symbol?: string, status?: string): Promise<Trade[]>;
  getTradeById(id: string): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, trade: Partial<Trade>): Promise<Trade>;
  
  // Equity
  getEquityHistory(limit?: number): Promise<Equity[]>;
  getLatestEquity(): Promise<Equity | undefined>;
  createEquity(equity: InsertEquity): Promise<Equity>;
  
  // Bot Status
  getBotStatus(): Promise<BotStatus | undefined>;
  updateBotStatus(status: InsertBotStatus): Promise<BotStatus>;
  
  // Bot Settings
  getBotSettings(): Promise<BotSettings | undefined>;
  updateBotSettings(settings: Partial<BotSettings>): Promise<BotSettings>;
  
  // Positions
  getPositions(): Promise<Position[]>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, position: Partial<Position>): Promise<Position>;
  deletePosition(id: string): Promise<void>;
  
  // OHLCV Data
  getOHLCVData(symbol: string, limit?: number): Promise<OHLCVData[]>;
  createOHLCVData(data: InsertOHLCV): Promise<OHLCVData>;
}

export class MemStorage implements IStorage {
  private trades: Map<string, Trade>;
  private equityHistory: Map<string, Equity>;
  private botStatus: BotStatus | undefined;
  private botSettings: BotSettings | undefined;
  private positions: Map<string, Position>;
  private ohlcvData: Map<string, OHLCVData>;

  constructor() {
    this.trades = new Map();
    this.equityHistory = new Map();
    this.positions = new Map();
    this.ohlcvData = new Map();
    this.initializeDefaults();
  }

  private initializeDefaults() {
    // Initialize default bot status
    this.botStatus = {
      id: randomUUID(),
      isRunning: false,
      lastUpdate: Date.now(),
      exchange: "binance",
      symbols: "BTC/USDT,ETH/USDT,SOL/USDT,ASTER/USDT,PEPE/USDT,DOGE/USDT,SHIB/USDT,WIF/USDT",
      timeframe: "1m",
      dryRun: true,
    };

    // Initialize default bot settings
    this.botSettings = {
      id: randomUUID(),
      exchange: "binance",
      symbols: "BTC/USDT,ETH/USDT,SOL/USDT,ASTER/USDT,PEPE/USDT,DOGE/USDT,SHIB/USDT,WIF/USDT",
      timeframe: "1m",
      riskPerTrade: 0.015,
      dailyMaxDD: 0.03,
      maxConcurrentPos: 2,
      hhvLen: 35,
      atrLen: 12,
      atrMultSL: 1.5,
      atrMultTrail: 2.0,
      volZMin: 1.5,
      lookback: 150,
      dryRun: true,
      telegramBotToken: null,
      telegramChatId: null,
      adminToken: null,
    };

    // Initialize default equity
    const initialEquity: Equity = {
      id: randomUUID(),
      ts: Date.now(),
      equity: 10000.0,
    };
    this.equityHistory.set(initialEquity.id, initialEquity);
  }

  async getTrades(limit: number = 100, symbol?: string, status?: string): Promise<Trade[]> {
    let result = Array.from(this.trades.values());
    
    if (symbol) {
      result = result.filter(t => t.symbol === symbol);
    }
    
    if (status) {
      result = result.filter(t => t.status === status);
    }
    
    return result
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);
  }

  async getTradeById(id: string): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    const trade: Trade = { 
      ...insertTrade, 
      id,
      sl: insertTrade.sl ?? null,
      trail: insertTrade.trail ?? null,
      pnl: insertTrade.pnl ?? null,
      exitPrice: insertTrade.exitPrice ?? null,
      exitTime: insertTrade.exitTime ?? null
    };
    this.trades.set(id, trade);
    return trade;
  }

  async updateTrade(id: string, updateData: Partial<Trade>): Promise<Trade> {
    const existing = this.trades.get(id);
    if (!existing) {
      throw new Error(`Trade with id ${id} not found`);
    }
    const updated = { ...existing, ...updateData };
    this.trades.set(id, updated);
    return updated;
  }

  async getEquityHistory(limit: number = 100): Promise<Equity[]> {
    return Array.from(this.equityHistory.values())
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);
  }

  async getLatestEquity(): Promise<Equity | undefined> {
    const history = await this.getEquityHistory(1);
    return history[0];
  }

  async createEquity(insertEquity: InsertEquity): Promise<Equity> {
    const id = randomUUID();
    const equity: Equity = { ...insertEquity, id };
    this.equityHistory.set(id, equity);
    return equity;
  }

  async getBotStatus(): Promise<BotStatus | undefined> {
    return this.botStatus;
  }

  async updateBotStatus(status: InsertBotStatus): Promise<BotStatus> {
    const id = this.botStatus?.id || randomUUID();
    this.botStatus = { 
      ...this.botStatus,
      ...status, 
      id
    };
    return this.botStatus;
  }

  async getBotSettings(): Promise<BotSettings | undefined> {
    return this.botSettings;
  }

  private getExchangePresets(exchange: string): Partial<BotSettings> {
    const presets: Record<string, Partial<BotSettings>> = {
      binance: {
        riskPerTrade: 0.015,
        dailyMaxDD: 0.03,
        hhvLen: 35,
        atrLen: 12,
        atrMultSL: 1.5,
        atrMultTrail: 2.0,
        volZMin: 1.5,
        lookback: 150,
        symbols: "BTC/USDT,ETH/USDT,SOL/USDT,ASTER/USDT,PEPE/USDT,DOGE/USDT,SHIB/USDT,WIF/USDT"
      }
    };
    
    return presets[exchange] || presets.binance;
  }

  async updateBotSettings(updateData: Partial<BotSettings>): Promise<BotSettings> {
    // If exchange is being changed, apply exchange-specific presets
    if (updateData.exchange && updateData.exchange !== this.botSettings?.exchange) {
      const exchangePresets = this.getExchangePresets(updateData.exchange);
      this.botSettings = { 
        ...this.botSettings!, 
        ...exchangePresets,
        ...updateData 
      };
      
      // Also update bot status to reflect the new exchange
      if (this.botStatus) {
        this.botStatus = {
          ...this.botStatus,
          exchange: updateData.exchange,
          symbols: exchangePresets.symbols || this.botStatus.symbols,
          lastUpdate: Date.now()
        };
      }
    } else {
      this.botSettings = { 
        ...this.botSettings!, 
        ...updateData 
      };
    }
    
    return this.botSettings;
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const id = randomUUID();
    const position: Position = { 
      ...insertPosition, 
      id,
      sl: insertPosition.sl ?? null,
      trail: insertPosition.trail ?? null,
      currentPrice: insertPosition.currentPrice ?? null,
      unrealizedPnl: insertPosition.unrealizedPnl ?? null,
      duration: insertPosition.duration ?? null,
      openTime: insertPosition.openTime ?? null
    };
    this.positions.set(id, position);
    return position;
  }

  async updatePosition(id: string, updateData: Partial<Position>): Promise<Position> {
    const existing = this.positions.get(id);
    if (!existing) {
      throw new Error(`Position with id ${id} not found`);
    }
    const updated = { ...existing, ...updateData };
    this.positions.set(id, updated);
    return updated;
  }

  async deletePosition(id: string): Promise<void> {
    this.positions.delete(id);
  }

  async getOHLCVData(symbol: string, limit: number = 100): Promise<OHLCVData[]> {
    return Array.from(this.ohlcvData.values())
      .filter(d => d.symbol === symbol)
      .sort((a, b) => b.time - a.time)
      .slice(0, limit);
  }

  async createOHLCVData(insertData: InsertOHLCV): Promise<OHLCVData> {
    const id = randomUUID();
    const data: OHLCVData = { ...insertData, id };
    this.ohlcvData.set(id, data);
    return data;
  }
}

export const storage = new MemStorage();

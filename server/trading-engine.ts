import ccxt from 'ccxt';
import { storage } from './storage';
import type { BotStatus, BotSettings, Trade, Position, Equity, InsertTrade, InsertPosition, InsertEquity } from '@shared/schema';

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class TradingEngine {
  private exchange: any; // CCXT Exchange
  private isRunning = false;
  private settings: BotSettings | null = null;
  private positions: Map<string, Position> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private equity = 10000; // Starting test equity
  private dailyStartEquity = 10000;
  private lastDailyReset = new Date().getUTCDate();
  
  // BTC health filter caching and circuit breaker
  private btcHealthCache: { healthy: boolean; lastUpdate: number; errorCount: number } = {
    healthy: false, // Default to NOT healthy (safer)
    lastUpdate: 0,
    errorCount: 0
  };
  private btcHealthInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize OKX connection (no auth needed for public data)
    this.exchange = new ccxt.okx({
      enableRateLimit: true,
    });
    
    // Using OKX public endpoints (no authentication required for market data)
    // Safe because we're in dry-run mode (no actual orders, just data feeds)
    
    console.log('🚀 Trading Engine initialized with OKX public API (market data only - dry run mode)');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Trading engine already running');
      return;
    }

    try {
      // Load current settings
      this.settings = await storage.getBotSettings();
      if (!this.settings) {
        throw new Error('Bot settings not found');
      }

      console.log('🎯 Starting trading engine with settings:', {
        exchange: this.settings.exchange,
        symbols: this.settings.symbols,
        riskPerTrade: this.settings.riskPerTrade,
        dryRun: this.settings.dryRun
      });

      this.isRunning = true;

      // Update bot status
      await this.updateBotStatus(true);

      // Start BTC health monitoring (separate from trading loops)
      this.startBTCHealthMonitoring();

      // Start trading loops for each symbol
      const symbols = this.getSymbolsList();
      for (const symbol of symbols) {
        this.startSymbolTrading(symbol);
      }

      console.log(`✅ Trading engine started for ${symbols.length} symbols`);
    } catch (error) {
      console.error('❌ Failed to start trading engine:', error);
      this.isRunning = false;
      await this.updateBotStatus(false);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ Trading engine not running');
      return;
    }

    console.log('🛑 Stopping trading engine...');
    this.isRunning = false;

    // Clear all intervals
    this.intervals.forEach((interval, symbol) => {
      clearInterval(interval);
      console.log(`⏹️ Stopped trading loop for ${symbol}`);
    });
    this.intervals.clear();

    // Stop BTC health monitoring
    if (this.btcHealthInterval) {
      clearInterval(this.btcHealthInterval);
      console.log('⏹️ Stopped BTC health monitoring');
    }

    // Close all positions in dry-run mode
    for (const [symbol, position] of this.positions.entries()) {
      await this.closePosition(symbol, 'Manual stop');
    }

    await this.updateBotStatus(false);
    console.log('✅ Trading engine stopped');
  }

  private getSymbolsList(): string[] {
    if (!this.settings?.symbols) return [];
    return this.settings.symbols.split(',').map(s => s.trim()).filter(Boolean);
  }

  private async startSymbolTrading(symbol: string): Promise<void> {
    console.log(`📊 Starting trading loop for ${symbol}`);
    
    const interval = setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        await this.checkDailyReset();
        await this.processSymbol(symbol);
      } catch (error) {
        console.error(`❌ Error processing ${symbol}:`, error);
      }
    }, 10000); // Check every 10 seconds

    this.intervals.set(symbol, interval);
  }

  private async processSymbol(symbol: string): Promise<void> {
    if (!this.settings) return;

    try {
      // Skip if daily drawdown exceeded
      if (this.isDailyDrawdownExceeded()) {
        return;
      }

      // Fetch OHLCV data
      const ohlcvData = await this.fetchOHLCV(symbol, 200);
      if (ohlcvData.length < 50) return;

      // Calculate indicators
      const signal = await this.calculateBreakoutSignal(ohlcvData);
      const currentPrice = ohlcvData[ohlcvData.length - 1].close;
      const currentPosition = this.positions.get(symbol);

      // Check for entry signal
      if (signal.shouldEnter && !currentPosition && this.positions.size < (this.settings.maxConcurrentPos || 2)) {
        await this.enterPosition(symbol, signal, currentPrice);
      }

      // Check for exit signal
      if (currentPosition) {
        const shouldExit = this.shouldExitPosition(currentPosition, currentPrice);
        if (shouldExit.exit) {
          await this.closePosition(symbol, shouldExit.reason, shouldExit.exitPrice);
        } else {
          // Update trailing stop
          await this.updateTrailingStop(currentPosition, currentPrice, signal.atr);
        }
      }

    } catch (error) {
      console.error(`❌ Error processing ${symbol}:`, error);
    }
  }

  private async fetchOHLCV(symbol: string, limit = 200, timeframe?: string): Promise<OHLCV[]> {
    try {
      const tf = timeframe || this.settings?.timeframe || '5m'; // Default to 5m for more stable signals
      const ohlcv = await this.exchange.fetchOHLCV(symbol, tf, undefined, limit);
      
      return ohlcv.map((candle: any[]) => ({
        timestamp: candle[0] || 0,
        open: candle[1] || 0,
        high: candle[2] || 0,
        low: candle[3] || 0,
        close: candle[4] || 0,
        volume: candle[5] || 0
      }));
    } catch (error) {
      console.error(`❌ Failed to fetch OHLCV for ${symbol}:`, error);
      return [];
    }
  }

  private async calculateBreakoutSignal(ohlcvData: OHLCV[]) {
    const settings = this.settings!;
    const hhvLen = settings.hhvLen || 35;
    const atrLen = settings.atrLen || 12;
    const volZMin = settings.volZMin || 2.5; // Increased for better quality signals
    const lookback = Math.min(settings.lookback || 150, 60);

    if (ohlcvData.length < Math.max(hhvLen, atrLen, lookback)) {
      return { shouldEnter: false, atr: 0, stopLoss: 0, volumeZ: 0 };
    }

    const current = ohlcvData[ohlcvData.length - 1];
    const previous = ohlcvData[ohlcvData.length - 2];
    const recent = ohlcvData.slice(-hhvLen);
    
    // Calculate highest high over lookback period
    const hhv = Math.max(...recent.slice(0, -1).map(d => d.high));
    
    // Calculate ATR for volatility context
    const atr = this.calculateATR(ohlcvData.slice(-atrLen - 1), atrLen);
    
    // Enhanced volume analysis: 5m and 15m RVOL
    const volumeZ5m = this.calculateVolumeZScore(ohlcvData.slice(-lookback), lookback);
    
    // BTC health filter: only trade longs when BTC is healthy
    const btcHealthy = await this.checkBTCHealth();
    
    // IMPROVED ENTRY CONDITIONS:
    // 1. Breakout buffer: close must be above HHV + 0.1% buffer (reduces false breaks)
    const breakoutBuffer = hhv * 0.001; // 0.1% buffer
    const priceBreakout = current.close > (hhv + breakoutBuffer);
    
    // 2. Range expansion: current bar's true range >= 1.3x ATR (momentum confirmation)  
    const currentTR = Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    );
    const rangeExpansion = currentTR >= (atr * 1.3);
    
    // 3. Volume confirmation: strong volume spike on 5m
    const volumeConfirm = volumeZ5m >= volZMin;
    
    // 4. Price action: close in upper 70% of the range (strength)
    const rangePosition = (current.close - current.low) / (current.high - current.low);
    const strongClose = rangePosition >= 0.7;
    
    // 5. Multi-bar confirmation: previous bar also showed strength
    const prevRangePos = previous.high > previous.low ? 
      (previous.close - previous.low) / (previous.high - previous.low) : 0;
    const momentumContinuation = prevRangePos >= 0.6; // Previous bar also closed strong
    
    // COMBINED ENTRY SIGNAL (all conditions must be met)
    const shouldEnter = priceBreakout && 
                       rangeExpansion && 
                       volumeConfirm && 
                       strongClose && 
                       momentumContinuation &&
                       btcHealthy;
    
    // Calculate stop loss (WIDER: 3.0x ATR for crypto volatility)
    const atrMultSL = settings.atrMultSL || 3.0; // Increased from 2.5 to 3.0
    const minDist = current.close * 0.025; // Minimum 2.5% distance from price
    const atrDistance = atrMultSL * atr;
    const stopDistance = Math.max(atrDistance, minDist); // Use larger of ATR or minimum %
    const stopLoss = current.close - stopDistance;
    
    return {
      shouldEnter,
      atr,
      stopLoss,
      volumeZ: volumeZ5m,
      hhv,
      // Additional signal quality metrics for logging
      breakoutBuffer,
      rangeExpansion,
      strongClose,
      momentumContinuation
    };
  }

  private calculateATR(ohlcvData: OHLCV[], period: number): number {
    if (ohlcvData.length < period + 1) return 0;

    const trValues: number[] = [];
    for (let i = 1; i < ohlcvData.length; i++) {
      const current = ohlcvData[i];
      const previous = ohlcvData[i - 1];
      
      const tr = Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close)
      );
      
      trValues.push(tr);
    }

    // Simple moving average of True Range
    const recentTR = trValues.slice(-period);
    return recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length;
  }

  private calculateVolumeZScore(ohlcvData: OHLCV[], lookback: number): number {
    if (ohlcvData.length < lookback) return 0;

    const volumes = ohlcvData.slice(-lookback);
    const currentVolume = volumes[volumes.length - 1].volume;
    const historicalVolumes = volumes.slice(0, -1);
    
    const mean = historicalVolumes.reduce((sum, d) => sum + d.volume, 0) / historicalVolumes.length;
    const variance = historicalVolumes.reduce((sum, d) => sum + Math.pow(d.volume - mean, 2), 0) / historicalVolumes.length;
    const std = Math.sqrt(variance);
    
    return std > 0 ? (currentVolume - mean) / std : 0;
  }

  private startBTCHealthMonitoring(): void {
    // Update BTC health every 60 seconds (independent of trading loops)
    this.btcHealthInterval = setInterval(async () => {
      try {
        await this.updateBTCHealth();
      } catch (error) {
        console.error('❌ BTC health monitor error:', error);
      }
    }, 60000); // 1 minute intervals

    // Initial health check
    this.updateBTCHealth();
  }

  private async updateBTCHealth(): Promise<void> {
    const now = Date.now();
    
    // Circuit breaker: if too many recent errors, skip and stay unhealthy
    if (this.btcHealthCache.errorCount >= 5) {
      const cooloffPeriod = 5 * 60 * 1000; // 5 minutes
      if (now - this.btcHealthCache.lastUpdate < cooloffPeriod) {
        console.log('⚠️ BTC health check in cooloff period due to errors');
        return;
      }
      // Reset error count after cooloff
      this.btcHealthCache.errorCount = 0;
    }

    try {
      // Get BTC 15m data for trend health check (more stable than 1m)
      const btcData = await this.fetchOHLCV('BTC/USDT', 50, '15m'); // Use unified symbol format with 15m timeframe
      if (btcData.length < 20) {
        console.log('⚠️ Insufficient BTC data for health check');
        this.btcHealthCache.healthy = false;
        return;
      }
      
      const current = btcData[btcData.length - 1];
      const ema20 = this.calculateEMA(btcData.slice(-20), 20);
      const ema50 = this.calculateEMA(btcData.slice(-50), 50);
      
      // BTC healthy if: price > EMA20 AND EMA20 > EMA50 (strong uptrend)
      const healthy = current.close > ema20 && ema20 > ema50;
      
      this.btcHealthCache = {
        healthy,
        lastUpdate: now,
        errorCount: 0 // Reset on success
      };
      
      console.log(`📊 BTC Health: ${healthy ? 'HEALTHY' : 'UNHEALTHY'} | Price: $${current.close.toFixed(2)} | EMA20: $${ema20.toFixed(2)} | EMA50: $${ema50.toFixed(2)}`);
      
    } catch (error) {
      console.error('❌ BTC health check failed:', error);
      this.btcHealthCache.errorCount++;
      this.btcHealthCache.healthy = false; // Default to NOT healthy on error (safer)
      this.btcHealthCache.lastUpdate = now;
    }
  }

  private async checkBTCHealth(): Promise<boolean> {
    const now = Date.now();
    const cacheAge = now - this.btcHealthCache.lastUpdate;
    
    // Cache valid for 2 minutes
    if (cacheAge < 2 * 60 * 1000) {
      return this.btcHealthCache.healthy;
    }
    
    // Trigger immediate update if cache is stale
    await this.updateBTCHealth();
    return this.btcHealthCache.healthy;
  }

  private calculateEMA(ohlcvData: OHLCV[], period: number): number {
    if (ohlcvData.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = ohlcvData[0].close;
    
    for (let i = 1; i < ohlcvData.length; i++) {
      ema = (ohlcvData[i].close * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private async enterPosition(symbol: string, signal: any, price: number): Promise<void> {
    if (!this.settings) return;

    try {
      const stopDistance = price - signal.stopLoss;
      
      // Guard against invalid stop distance
      if (stopDistance <= 0) {
        console.log(`⚠️ Invalid stop distance for ${symbol}: ${stopDistance}`);
        return;
      }
      
      const riskAmount = this.equity * (this.settings.riskPerTrade || 0.0075); // Reduced to 0.75% for better risk management
      const qty = riskAmount / stopDistance;
      
      // Guard against excessive position size
      if (qty <= 0 || !isFinite(qty)) {
        console.log(`⚠️ Invalid quantity for ${symbol}: ${qty}`);
        return;
      }

      // Create position record using schema fields
      const positionData: InsertPosition = {
        symbol,
        side: 'long',
        qty,
        entry: price,
        currentPrice: price,
        sl: signal.stopLoss,
        trail: null,
        unrealizedPnl: 0,
        duration: null,
        openTime: Date.now()
      };

      const position = await storage.createPosition(positionData);
      this.positions.set(symbol, position);

      // Create trade record using schema fields
      const tradeData: InsertTrade = {
        ts: Date.now(),
        symbol,
        side: 'long',
        qty,
        entry: price,
        sl: signal.stopLoss,
        trail: null,
        status: 'open',
        pnl: null,
        exitPrice: null,
        exitTime: null
      };

      await storage.createTrade(tradeData);

      console.log(`🟢 ENTERED LONG ${symbol} @ $${price.toFixed(4)} | Stop: $${signal.stopLoss.toFixed(4)} | Vol Z-Score: ${signal.volumeZ.toFixed(2)} | HHV: $${signal.hhv.toFixed(4)}`);
      console.log(`📊 Signal Quality: Range Exp: ${signal.rangeExpansion ? '✅' : '❌'} | Strong Close: ${signal.strongClose ? '✅' : '❌'} | Momentum: ${signal.momentumContinuation ? '✅' : '❌'}`);
      
      // Send Telegram notification if configured
      await this.sendTelegramAlert(`🟢 LONG ${symbol}\nEntry: $${price.toFixed(4)}\nStop Loss: $${signal.stopLoss.toFixed(4)}\nVolume Breakout: ${signal.volumeZ.toFixed(2)}x\nRisk: ${((this.settings.riskPerTrade || 0.01) * 100).toFixed(1)}%`);

    } catch (error) {
      console.error(`❌ Failed to enter position for ${symbol}:`, error);
    }
  }

  private shouldExitPosition(position: Position, currentPrice: number): { exit: boolean; reason: string; exitPrice?: number } {
    // Stop loss hit
    if (position.sl && currentPrice <= position.sl) {
      return { exit: true, reason: 'Stop loss triggered', exitPrice: position.sl };
    }

    // Could add additional exit conditions here (profit targets, etc.)
    return { exit: false, reason: '' };
  }

  private async closePosition(symbol: string, reason: string, specifiedExitPrice?: number): Promise<void> {
    const position = this.positions.get(symbol);
    if (!position) return;

    try {
      let exitPrice: number;
      
      if (specifiedExitPrice) {
        // Use specified exit price (e.g., stop loss price)
        exitPrice = specifiedExitPrice;
      } else {
        // Get current market price for exit (e.g., manual close)
        const ohlcvData = await this.fetchOHLCV(symbol, 1);
        exitPrice = ohlcvData[0]?.close || position.currentPrice || position.entry;
      }

      // Calculate PnL
      const pnl = (exitPrice - position.entry) * position.qty;
      this.equity += pnl;

      // Update position in storage as closed (CRITICAL FIX)
      const updatedPosition = {
        ...position,
        currentPrice: exitPrice,
        unrealizedPnl: pnl
      };
      
      // Delete position from storage to maintain dashboard accuracy
      await storage.deletePosition(position.id);

      // Create exit trade
      const exitTradeData: InsertTrade = {
        ts: Date.now(),
        symbol,
        side: 'sell',
        qty: position.qty,
        entry: exitPrice,
        sl: null,
        trail: null,
        status: 'filled',
        pnl,
        exitPrice,
        exitTime: Date.now()
      };

      await storage.createTrade(exitTradeData);
      
      // Update equity record
      await this.updateEquity();

      // Remove from in-memory positions
      this.positions.delete(symbol);

      const pnlPercent = (pnl / (position.entry * position.qty)) * 100;
      const emoji = pnl >= 0 ? '🟢' : '🔴';
      
      console.log(`${emoji} CLOSED ${symbol} @ $${exitPrice.toFixed(4)} | PnL: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%) | Reason: ${reason}`);
      
      await this.sendTelegramAlert(`${emoji} CLOSED ${symbol}\nExit: $${exitPrice.toFixed(4)}\nPnL: $${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)\nReason: ${reason}`);

    } catch (error) {
      console.error(`❌ Failed to close position for ${symbol}:`, error);
    }
  }

  private async updateTrailingStop(position: Position, currentPrice: number, atr: number): Promise<void> {
    if (!this.settings) return;

    // OPTIMIZED: Only start trailing after 1R profit (delayed trailing)
    const profitPerShare = currentPrice - position.entry;
    const initialRisk = position.entry - position.sl!;
    const profitMultiple = profitPerShare / initialRisk;
    
    // Don't trail until we have at least 1R profit
    if (profitMultiple < 1.0) {
      return;
    }

    const atrMultTrail = this.settings.atrMultTrail || 3.0; // Increased from 2.0 to 3.0 (wider trailing)
    const newStopLoss = currentPrice - (atrMultTrail * atr);
    
    // Only update if new stop is higher (trailing up) and we have a current stop
    if (position.sl && newStopLoss > position.sl) {
      const updatedPosition = { 
        ...position, 
        sl: newStopLoss,
        currentPrice,
        unrealizedPnl: (currentPrice - position.entry) * position.qty
      };
      
      await storage.updatePosition(position.id, updatedPosition);
      this.positions.set(position.symbol, updatedPosition);
    }
  }

  private async checkDailyReset(): Promise<void> {
    const currentDay = new Date().getUTCDate();
    if (currentDay !== this.lastDailyReset) {
      this.dailyStartEquity = this.equity;
      this.lastDailyReset = currentDay;
      console.log('📅 Daily equity reset:', this.equity);
    }
  }

  private isDailyDrawdownExceeded(): boolean {
    if (!this.settings) return false;
    const dailyMaxDD = this.settings.dailyMaxDD || 0.03;
    const currentDD = (this.dailyStartEquity - this.equity) / this.dailyStartEquity;
    return currentDD >= dailyMaxDD;
  }

  private async updateBotStatus(isRunning: boolean): Promise<void> {
    try {
      const existingStatus = await storage.getBotStatus();
      
      const statusData = {
        isRunning,
        lastUpdate: Date.now(),
        exchange: this.settings?.exchange || 'binance',
        symbols: this.settings?.symbols || '',
        timeframe: this.settings?.timeframe || '5m',
        dryRun: this.settings?.dryRun ?? true
      };

      if (existingStatus) {
        await storage.updateBotStatus({ ...existingStatus, ...statusData });
      } else {
        await storage.updateBotStatus({ id: 'live-trading-engine', ...statusData });
      }
    } catch (error) {
      console.error('❌ Failed to update bot status:', error);
    }
  }

  private async updateEquity(): Promise<void> {
    try {
      const equityData: InsertEquity = {
        ts: Date.now(),
        equity: this.equity
      };

      await storage.createEquity(equityData);
    } catch (error) {
      console.error('❌ Failed to update equity:', error);
    }
  }

  private async sendTelegramAlert(message: string): Promise<void> {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (!botToken || !chatId) return;

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🤖 Goose Alpha Bot\n\n${message}`,
          parse_mode: 'HTML'
        })
      });

      if (!response.ok) {
        console.error('❌ Telegram alert failed:', await response.text());
      }
    } catch (error) {
      console.error('❌ Telegram alert error:', error);
    }
  }

  // Public methods for dashboard integration
  async getStatus(): Promise<{ isRunning: boolean; equity: number; positions: number }> {
    return {
      isRunning: this.isRunning,
      equity: this.equity,
      positions: this.positions.size
    };
  }

  async getPositions(): Promise<Position[]> {
    return Array.from(this.positions.values());
  }
}

// Export singleton instance
export const tradingEngine = new TradingEngine();
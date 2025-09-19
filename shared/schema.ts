import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ts: integer("ts").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  qty: real("qty").notNull(),
  entry: real("entry").notNull(),
  sl: real("sl"),
  trail: real("trail"),
  status: text("status").notNull(),
  pnl: real("pnl").default(0.0),
  exitPrice: real("exit_price"),
  exitTime: integer("exit_time"),
});

export const equity = pgTable("equity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ts: integer("ts").notNull(),
  equity: real("equity").notNull(),
});

export const botStatus = pgTable("bot_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  isRunning: boolean("is_running").default(false),
  lastUpdate: integer("last_update"),
  exchange: text("exchange"),
  symbols: text("symbols"),
  timeframe: text("timeframe"),
  dryRun: boolean("dry_run").default(true),
});

export const botSettings = pgTable("bot_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  exchange: text("exchange").default("bybit"),
  symbols: text("symbols").default("BTC/USDT,ETH/USDT,SOL/USDT"),
  timeframe: text("timeframe").default("1m"),
  riskPerTrade: real("risk_per_trade").default(0.0075),
  dailyMaxDD: real("daily_max_dd").default(0.05),
  maxConcurrentPos: integer("max_concurrent_pos").default(2),
  hhvLen: integer("hhv_len").default(50),
  atrLen: integer("atr_len").default(14),
  atrMultSL: real("atr_mult_sl").default(1.8),
  atrMultTrail: real("atr_mult_trail").default(2.2),
  volZMin: real("vol_z_min").default(2.0),
  lookback: integer("lookback").default(200),
  dryRun: boolean("dry_run").default(true),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  adminToken: text("admin_token"),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  qty: real("qty").notNull(),
  entry: real("entry").notNull(),
  currentPrice: real("current_price"),
  sl: real("sl"),
  trail: real("trail"),
  unrealizedPnl: real("unrealized_pnl").default(0),
  duration: text("duration"),
  openTime: integer("open_time"),
});

export const ohlcvData = pgTable("ohlcv_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  time: integer("time").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume").notNull(),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
});

export const insertEquitySchema = createInsertSchema(equity).omit({
  id: true,
});

export const insertBotStatusSchema = createInsertSchema(botStatus).omit({
  id: true,
});

export const insertBotSettingsSchema = createInsertSchema(botSettings).omit({
  id: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
});

export const insertOHLCVSchema = createInsertSchema(ohlcvData).omit({
  id: true,
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type Equity = typeof equity.$inferSelect;
export type InsertEquity = z.infer<typeof insertEquitySchema>;

export type BotStatus = typeof botStatus.$inferSelect;
export type InsertBotStatus = z.infer<typeof insertBotStatusSchema>;

export type BotSettings = typeof botSettings.$inferSelect;
export type InsertBotSettings = z.infer<typeof insertBotSettingsSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

export type OHLCVData = typeof ohlcvData.$inferSelect;
export type InsertOHLCV = z.infer<typeof insertOHLCVSchema>;

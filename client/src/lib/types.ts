export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface WebSocketMessage {
  type: 'connected' | 'price_update' | 'trade_update' | 'position_update' | 'bot_status_update';
  data?: any;
  timestamp: number;
}

export interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeStats {
  winRate: number;
  avgHoldTime: string;
  maxDrawdown: number;
  tradesToday: number;
  totalTrades: number;
  profitFactor: number;
}

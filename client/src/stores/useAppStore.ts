import { create } from 'zustand';
import { BotStatus, BotSettings, Trade, Position, Equity } from '@shared/schema';
import { TradeStats } from '../lib/types';

interface AppState {
  // Bot state
  botStatus: BotStatus | null;
  botSettings: BotSettings | null;
  
  // Trading data
  trades: Trade[];
  positions: Position[];
  equityHistory: Equity[];
  currentEquity: number;
  
  // UI state
  isSettingsModalOpen: boolean;
  selectedSymbol: string;
  selectedTimeframe: string;
  
  // Stats
  tradeStats: TradeStats;
  
  // Actions
  setBotStatus: (status: BotStatus) => void;
  setBotSettings: (settings: BotSettings) => void;
  setTrades: (trades: Trade[]) => void;
  setPositions: (positions: Position[]) => void;
  setEquityHistory: (equity: Equity[]) => void;
  setCurrentEquity: (equity: number) => void;
  setIsSettingsModalOpen: (open: boolean) => void;
  setSelectedSymbol: (symbol: string) => void;
  setSelectedTimeframe: (timeframe: string) => void;
  updateTradeStats: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  botStatus: null,
  botSettings: null,
  trades: [],
  positions: [],
  equityHistory: [],
  currentEquity: 0,
  isSettingsModalOpen: false,
  selectedSymbol: 'BTC/USDT',
  selectedTimeframe: '1m',
  tradeStats: {
    winRate: 0,
    avgHoldTime: '0m',
    maxDrawdown: 0,
    tradesToday: 0,
    totalTrades: 0,
    profitFactor: 0,
  },

  // Actions
  setBotStatus: (status) => set({ botStatus: status }),
  setBotSettings: (settings) => set({ botSettings: settings }),
  setTrades: (trades) => {
    set({ trades });
    get().updateTradeStats();
  },
  setPositions: (positions) => set({ positions }),
  setEquityHistory: (equity) => set({ equityHistory: equity }),
  setCurrentEquity: (equity) => set({ currentEquity: equity }),
  setIsSettingsModalOpen: (open) => set({ isSettingsModalOpen: open }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  setSelectedTimeframe: (timeframe) => set({ selectedTimeframe: timeframe }),
  
  updateTradeStats: () => {
    const { trades } = get();
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrades = trades.filter(t => t.ts >= today.getTime() / 1000);
    
    const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winPnl = winningTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const lossPnl = Math.abs(closedTrades.filter(t => (t.pnl || 0) < 0).reduce((sum, t) => sum + (t.pnl || 0), 0));
    
    set({
      tradeStats: {
        winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
        avgHoldTime: calculateAvgHoldTime(closedTrades),
        maxDrawdown: calculateMaxDrawdown(get().equityHistory),
        tradesToday: todayTrades.length,
        totalTrades: trades.length,
        profitFactor: lossPnl > 0 ? winPnl / lossPnl : 0,
      }
    });
  },
}));

function calculateAvgHoldTime(trades: Trade[]): string {
  if (trades.length === 0) return '0m';
  
  const totalDuration = trades.reduce((sum, trade) => {
    if (trade.exitTime) {
      return sum + (trade.exitTime - trade.ts);
    }
    return sum;
  }, 0);
  
  const avgSeconds = totalDuration / trades.length;
  const hours = Math.floor(avgSeconds / 3600);
  const minutes = Math.floor((avgSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function calculateMaxDrawdown(equityHistory: Equity[]): number {
  if (equityHistory.length < 2) return 0;
  
  let maxDrawdown = 0;
  let peak = equityHistory[0].equity;
  
  for (const record of equityHistory) {
    if (record.equity > peak) {
      peak = record.equity;
    }
    const drawdown = ((peak - record.equity) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

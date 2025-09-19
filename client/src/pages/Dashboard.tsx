import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { PositionsGrid } from "../components/PositionsGrid";
import { PriceChart } from "../components/PriceChart";
import { RiskDashboard } from "../components/RiskDashboard";
import { TradeHistoryTable } from "../components/TradeHistoryTable";
import { TelegramPanel } from "../components/TelegramPanel";
import { SettingsModal } from "../components/SettingsModal";
import { useAppStore } from "../stores/useAppStore";
import { useWebSocket } from "../hooks/useWebSocket";

export default function Dashboard() {
  const {
    setBotStatus,
    setBotSettings,
    setTrades,
    setPositions,
    setEquityHistory,
    setCurrentEquity,
  } = useAppStore();

  const { isConnected } = useWebSocket();

  // Fetch bot status
  const { data: botStatus } = useQuery({
    queryKey: ['/api/bot/status'],
    refetchInterval: 5000,
  });

  // Fetch bot settings
  const { data: botSettings } = useQuery({
    queryKey: ['/api/bot/settings'],
  });

  // Fetch trades
  const { data: trades } = useQuery({
    queryKey: ['/api/trades'],
    refetchInterval: 10000,
  });

  // Fetch positions
  const { data: positions } = useQuery({
    queryKey: ['/api/positions'],
    refetchInterval: 2000,
  });

  // Fetch equity
  const { data: equity } = useQuery({
    queryKey: ['/api/equity'],
    refetchInterval: 5000,
  });

  const { data: latestEquity } = useQuery({
    queryKey: ['/api/equity/latest'],
    refetchInterval: 2000,
  });

  // Update store with fetched data
  useEffect(() => {
    if (botStatus) setBotStatus(botStatus);
  }, [botStatus, setBotStatus]);

  useEffect(() => {
    if (botSettings) setBotSettings(botSettings);
  }, [botSettings, setBotSettings]);

  useEffect(() => {
    if (trades) setTrades(trades);
  }, [trades, setTrades]);

  useEffect(() => {
    if (positions) setPositions(positions);
  }, [positions, setPositions]);

  useEffect(() => {
    if (equity) setEquityHistory(equity);
  }, [equity, setEquityHistory]);

  useEffect(() => {
    if (latestEquity && 'equity' in latestEquity) setCurrentEquity(latestEquity.equity);
  }, [latestEquity, setCurrentEquity]);

  return (
    <div className="bg-background text-foreground font-sans min-h-screen">
      <Header />
      
      <div className="flex h-[calc(100vh-80px)]">
        <Sidebar />
        
        <main className="flex-1 p-6 overflow-auto">
          <PositionsGrid />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <PriceChart />
            <RiskDashboard />
          </div>
          
          <TradeHistoryTable />
          <TelegramPanel />
        </main>
      </div>
      
      <SettingsModal />
    </div>
  );
}

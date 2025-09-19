import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "../stores/useAppStore";

export function TradeHistoryTable() {
  const { trades } = useAppStore();
  const [selectedSymbol, setSelectedSymbol] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredTrades = trades.filter(trade => {
    if (selectedSymbol !== "all" && trade.symbol !== selectedSymbol) return false;
    if (selectedStatus !== "all" && trade.status !== selectedStatus) return false;
    if (selectedDate) {
      const tradeDate = new Date(trade.ts * 1000).toISOString().split('T')[0];
      if (tradeDate !== selectedDate) return false;
    }
    return true;
  });

  const paginatedTrades = filteredTrades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'CLOSED': 'bg-chart-1 text-white',
      'OPEN': 'bg-primary text-primary-foreground',
      'STOPPED': 'bg-destructive text-destructive-foreground'
    };
    
    return (
      <Badge className={variants[status] || 'bg-secondary'}>
        {status}
      </Badge>
    );
  };

  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No trades found. Bot will display trade history once trading begins.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Trade History</CardTitle>
          <div className="flex space-x-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-32" data-testid="filter-symbol">
                <SelectValue placeholder="All Symbols" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Symbols</SelectItem>
                <SelectItem value="BTC/USDT">BTC/USDT</SelectItem>
                <SelectItem value="ETH/USDT">ETH/USDT</SelectItem>
                <SelectItem value="SOL/USDT">SOL/USDT</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-32" data-testid="filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="STOPPED">Stopped</SelectItem>
              </SelectContent>
            </Select>
            
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
              data-testid="filter-date"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground">Time</th>
                <th className="text-left py-2 text-muted-foreground">Symbol</th>
                <th className="text-left py-2 text-muted-foreground">Side</th>
                <th className="text-right py-2 text-muted-foreground">Quantity</th>
                <th className="text-right py-2 text-muted-foreground">Entry</th>
                <th className="text-right py-2 text-muted-foreground">Exit</th>
                <th className="text-right py-2 text-muted-foreground">P&L</th>
                <th className="text-center py-2 text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTrades.map((trade) => (
                <tr 
                  key={trade.id} 
                  className="border-b border-border hover:bg-secondary/50"
                  data-testid={`trade-row-${trade.id}`}
                >
                  <td className="py-2 font-mono">{formatTime(trade.ts)}</td>
                  <td className="py-2 font-mono">{trade.symbol}</td>
                  <td className="py-2">
                    <span className={trade.side === 'LONG' ? 'trade-long' : 'trade-short'}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">{trade.qty.toFixed(4)}</td>
                  <td className="py-2 text-right font-mono">${trade.entry.toFixed(2)}</td>
                  <td className="py-2 text-right font-mono">
                    {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                  </td>
                  <td className={`py-2 text-right font-mono ${(trade.pnl || 0) >= 0 ? 'profit' : 'loss'}`}>
                    {trade.pnl ? 
                      `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}` : 
                      '-'
                    }
                  </td>
                  <td className="py-2 text-center">
                    {getStatusBadge(trade.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <div data-testid="pagination-info">
            Showing {paginatedTrades.length} of {filteredTrades.length} trades
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              data-testid="button-previous-page"
            >
              Previous
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

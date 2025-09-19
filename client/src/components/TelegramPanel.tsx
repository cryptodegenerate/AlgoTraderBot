import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "../stores/useAppStore";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function TelegramPanel() {
  const [message, setMessage] = useState("");
  const [isConnected] = useState(true); // Mock connection status
  const { toast } = useToast();
  
  // Mock recent alerts - in real app this would come from WebSocket or API
  const recentAlerts = [
    {
      id: 1,
      type: "long",
      time: "12:34:56",
      message: "LONG BTC/USDT @ $43,250.00"
    },
    {
      id: 2,
      type: "exit",
      time: "11:45:23",
      message: "EXIT ETH/USDT @ $2,298.00 (Stop Loss)"
    }
  ];

  const handleSendAlert = async () => {
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('POST', '/api/telegram/send', { message });
      toast({
        title: "Success",
        description: "Alert sent successfully",
      });
      setMessage("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send telegram alert",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    try {
      await apiRequest('POST', '/api/telegram/test');
      toast({
        title: "Success",
        description: "Telegram connection test successful",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Telegram connection test failed",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="text-[#0088cc] text-lg" />
            <CardTitle>Telegram Integration</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`status-dot ${isConnected ? 'status-online' : 'status-offline'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Recent Alerts</h3>
            <ScrollArea className="h-32 bg-secondary rounded p-2">
              <div className="space-y-2">
                {recentAlerts.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No recent alerts
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className="bg-card rounded p-2 text-sm"
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={alert.type === 'long' ? 'text-chart-1' : 'text-destructive'}>
                          {alert.type === 'long' ? '🟢' : '🔴'}
                        </span>
                        <span className="font-mono text-xs">{alert.time}</span>
                      </div>
                      <div>{alert.message}</div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Send Manual Alert</h3>
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter message to send..."
                rows={3}
                className="resize-none"
                data-testid="input-telegram-message"
              />
              <div className="flex space-x-2">
                <Button 
                  onClick={handleSendAlert}
                  className="bg-[#0088cc] hover:bg-[#0088cc]/80 text-white flex-1"
                  data-testid="button-send-alert"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Alert
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleTestConnection}
                  data-testid="button-test-connection"
                >
                  Test
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

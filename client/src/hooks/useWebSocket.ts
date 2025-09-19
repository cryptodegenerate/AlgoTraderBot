import { useEffect, useRef, useState } from 'react';
import { WebSocketMessage, PriceUpdate } from '../lib/types';
import { useAppStore } from '../stores/useAppStore';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setCurrentEquity } = useAppStore();

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case 'price_update':
              handlePriceUpdate(message.data as PriceUpdate);
              break;
            case 'trade_update':
              handleTradeUpdate(message.data);
              break;
            case 'position_update':
              handlePositionUpdate(message.data);
              break;
            case 'bot_status_update':
              handleBotStatusUpdate(message.data);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const handlePriceUpdate = (priceUpdate: PriceUpdate) => {
    // Update current prices in the store or trigger re-fetch
    console.log('Price update received:', priceUpdate);
  };

  const handleTradeUpdate = (trade: any) => {
    console.log('Trade update received:', trade);
    // In a real app, this would update the trades list in the store
    // and trigger notifications or UI updates
  };

  const handlePositionUpdate = (position: any) => {
    console.log('Position update received:', position);
    // Update current positions in the store
  };

  const handleBotStatusUpdate = (status: any) => {
    console.log('Bot status update received:', status);
    // Update bot status in the store
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}

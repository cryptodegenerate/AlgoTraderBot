from pydantic import BaseModel
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    EXCHANGE: str = "bybit"
    API_KEY: str | None = None
    API_SECRET: str | None = None

    SYMBOLS: str = "BTC/USDT,ETH/USDT"
    TIMEFRAME: str = "1m"

    RISK_PER_TRADE: float = 0.0075
    DAILY_MAX_DD: float = 0.05
    MAX_CONCURRENT_POS: int = 2

    HHV_LEN: int = 50
    ATR_LEN: int = 14
    ATR_MULT_SL: float = 1.8
    ATR_MULT_TRAIL: float = 2.2
    VOL_Z_MIN: float = 2.0
    LOOKBACK: int = 200

    DRY_RUN: bool = True
    DB_PATH: str = "data/bot.db"

    TELEGRAM_BOT_TOKEN: str | None = None
    TELEGRAM_CHAT_ID: str | None = None
    ADMIN_TOKEN: str | None = None

    class Config:
        env_file = ".env"

    @property
    def symbols_list(self) -> List[str]:
        return [s.strip() for s in self.SYMBOLS.split(",") if s.strip()]

settings = Settings()

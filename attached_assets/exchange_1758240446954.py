import ccxt
from .config import settings

def create_exchange():
    ex_name = settings.EXCHANGE.lower()
    klass = getattr(ccxt, ex_name)
    params = {
        'apiKey': settings.API_KEY,
        'secret': settings.API_SECRET,
        'enableRateLimit': True,
    }
    ex = klass(params)
    return ex

def unify_symbol(symbol: str, ex) -> str:
    # ccxt unified format is already like BTC/USDT; let ccxt handle mapping
    return symbol

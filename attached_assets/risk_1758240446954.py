from .config import settings

def position_size(equity: float, stop_distance: float) -> float:
    risk_amount = equity * settings.RISK_PER_TRADE
    if stop_distance <= 0:
        return 0.0
    return risk_amount / stop_distance

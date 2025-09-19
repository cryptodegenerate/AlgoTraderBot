import numpy as np
import pandas as pd
from .config import settings

def compute_atr(df: pd.DataFrame, n: int) -> pd.Series:
    high = df['high']
    low = df['low']
    close = df['close']
    tr = pd.concat([
        (high - low),
        (high - close.shift()).abs(),
        (low - close.shift()).abs()
    ], axis=1).max(axis=1)
    return tr.rolling(n).mean()

def volume_zscore(vol: pd.Series, lookback: int = 50) -> pd.Series:
    mean = vol.rolling(lookback).mean()
    std = vol.rolling(lookback).std().replace(0, np.nan)
    return (vol - mean) / std

def breakout_signal(df: pd.DataFrame) -> pd.DataFrame:
    # df columns: time, open, high, low, close, volume
    df = df.copy()
    df['atr'] = compute_atr(df, settings.ATR_LEN)
    df['vol_z'] = volume_zscore(df['volume'], min(settings.LOOKBACK, 60))
    df['hhv'] = df['high'].rolling(settings.HHV_LEN).max()
    df['long'] = (df['close'] > df['hhv']) & (df['vol_z'] > settings.VOL_Z_MIN)
    return df

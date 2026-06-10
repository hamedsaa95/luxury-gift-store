/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";
import { CurrencyConfig } from "../types";

const DB_DIR = path.join(process.cwd(), ".data");
const RATES_FILE = path.join(DB_DIR, "live_rates.json");

// Default initial rates relative to 1 USD
export const DEFAULT_CURRENCIES: CurrencyConfig[] = [
  { code: "USD", rate: 1.0, symbol: "$", label: "US Dollar (Base)" },
  { code: "KWD", rate: 0.307, symbol: "KD", label: "Kuwaiti Dinar" },
  { code: "JOD", rate: 0.709, symbol: "JD", label: "Jordanian Dinar" },
  { code: "EGP", rate: 47.50, symbol: "EGP", label: "Egyptian Pound" },
  { code: "SYP", rate: 13000.0, symbol: "S.P", label: "Syrian Pound" },
  { code: "EUR", rate: 0.92, symbol: "€", label: "Euro Zone" },
  { code: "SAR", rate: 3.75, symbol: "SR", label: "Saudi Riyal" },
  { code: "AED", rate: 3.672, symbol: "AED", label: "UAE Dirham" },
  // Crypto assets
  { code: "USDT", rate: 1.0, symbol: "USDT", label: "USDT (TRC20)" },
  { code: "TRX", rate: 7.14, symbol: "TRX", label: "Tron (TRX)" },
  { code: "BPay", rate: 1.0, symbol: "BPAY", label: "Binance Pay" }
];

interface RatesCache {
  rates: { [code: string]: number };
  lastUpdated: string;
}

export class CurrencyService {
  private currencies: CurrencyConfig[] = [...DEFAULT_CURRENCIES];
  private lastFetchTime: number = 0;

  constructor() {
    this.loadRatesFromCache();
    // Proactively refresh rates
    this.refreshRates();
    // Schedule an hourly job (3600000 ms)
    setInterval(() => {
      this.refreshRates();
    }, 3600000);
  }

  private loadRatesFromCache() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(RATES_FILE)) {
      try {
        const cacheData = JSON.parse(fs.readFileSync(RATES_FILE, "utf8")) as RatesCache;
        if (cacheData && cacheData.rates) {
          this.currencies = DEFAULT_CURRENCIES.map(curr => {
            if (cacheData.rates[curr.code] !== undefined) {
              return { ...curr, rate: cacheData.rates[curr.code] };
            }
            return curr;
          });
          this.lastFetchTime = new Date(cacheData.lastUpdated).getTime();
          logger.info(`[CURRENCY SERVICE] Extracted cached exchange rates from ${cacheData.lastUpdated}`);
        }
      } catch (err: any) {
        logger.error(`[CURRENCY SERVICE] Failed parsing rate cache file. Reverting to default values: ${err.message}`);
      }
    }
  }

  private saveRatesToCache(rates: { [code: string]: number }) {
    try {
      const cacheData: RatesCache = {
        rates,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(RATES_FILE, JSON.stringify(cacheData, null, 2), "utf8");
    } catch (err: any) {
      logger.error(`[CURRENCY SERVICE] Failed archiving rates conversion metadata: ${err.message}`);
    }
  }

  public async refreshRates(): Promise<boolean> {
    try {
      logger.info("[CURRENCY SERVICE] Connecting to public exchange rates API...");
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) {
        throw new Error(`Exchange rate provider returned status: ${res.status}`);
      }
      const data = await res.json();
      if (data && data.rates) {
        const liveRates: { [code: string]: number } = {};
        
        // Update fiat rates
        this.currencies = this.currencies.map(curr => {
          let updatedRate = curr.rate;
          
          if (curr.code === "USDT" || curr.code === "BPay") {
            updatedRate = 1.0; // Crypto USD equivalents stable rates
          } else if (curr.code === "TRX") {
            // Check if API has TRX, if not, keep hardcoded benchmark
            updatedRate = data.rates["TRX"] || 7.14; 
          } else if (data.rates[curr.code] !== undefined) {
            updatedRate = Number(data.rates[curr.code]);
          }
          
          liveRates[curr.code] = updatedRate;
          return { ...curr, rate: updatedRate };
        });

        this.lastFetchTime = Date.now();
        this.saveRatesToCache(liveRates);
        logger.info("[CURRENCY SERVICE] Successfully updated and saved live currency conversions from external API.");
        return true;
      }
      return false;
    } catch (err: any) {
      logger.warn(`[CURRENCY SERVICE] Live API fetch error: ${err.message}. Using active operational pool.`);
      return false;
    }
  }

  public getCurrencies(): CurrencyConfig[] {
    return this.currencies;
  }

  public convert(amountUSD: number, targetCurrency: string): { amount: number; rate: number } {
    const target = this.currencies.find(c => c.code.toUpperCase() === targetCurrency.toUpperCase()) || this.currencies[0];
    const convertedAmount = Number((amountUSD * target.rate).toFixed(2));
    return {
      amount: convertedAmount,
      rate: target.rate
    };
  }

  public validateConversion(amountUSD: number, calculatedTarget: number, targetCurrency: string): boolean {
    const target = this.currencies.find(c => c.code.toUpperCase() === targetCurrency.toUpperCase());
    if (!target) return false;
    
    // Check with a direct buffer threshold (0.05 tolerance to prevent rounding flags)
    const exactConversion = amountUSD * target.rate;
    const offset = Math.abs(exactConversion - calculatedTarget);
    return offset <= 0.05;
  }
}

export const currencyService = new CurrencyService();

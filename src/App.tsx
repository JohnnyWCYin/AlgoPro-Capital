/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { 
  Calculator, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  RefreshCcw,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Table as TableIcon,
  Settings
} from "lucide-react";

// Types
interface GridStep {
  stepNo: number;
  buyPrice: number;
  margin: number;
  cumulativeMargin: number;
  pnl: number;
  cumulativePnl: number;
}

interface CalculationResults {
  steps: GridStep[];
  equity: number;
  investment: number;
  marginLevel: number;
  floatingPnl: number;
  drawdown: number;
}

const RISK_LEVELS = [
  { label: "Very Low", cap: 2000 },
  { label: "Low", cap: 1200 },
  { label: "Low-Med", cap: 800 },
  { label: "Medium", cap: 600 },
  { label: "Med-High", cap: 500 },
  { label: "High", cap: 400 },
  { label: "Very High", cap: 300 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"grid" | "profit">("grid");

  // Shared Inputs
  const [leverage, setLeverage] = useState<number>(200);

  // Grid Inputs
  const [balance, setBalance] = useState<number>(0);
  const [lotSize, setLotSize] = useState<number>(0);
  const [initialPrice, setInitialPrice] = useState<number>(2730);
  const [gridDistance, setGridDistance] = useState<number>(0);
  const [stepNo, setStepNo] = useState<number>(1);

  // Profit/Risk Inputs
  const [buyPrice, setBuyPrice] = useState<number>(2730);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [baseCapital, setBaseCapital] = useState<number>(0);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch Live Gold Price
  const fetchLiveGoldPrice = async () => {
    setIsFetchingPrice(true);
    try {
      // Primary Source: Public Gold API (Fast & Direct)
      const apiResponse = await fetch("https://api.gold-api.com/price/XAU");
      if (apiResponse.ok) {
        const data = await apiResponse.json();
        if (data && data.price) {
          setInitialPrice(data.price);
          setBuyPrice(data.price);
          setLastUpdated(new Date().toLocaleTimeString());
          setIsFetchingPrice(false);
          return;
        }
      }

      // Fallback Source: Gemini Search (Robust but slower)
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "undefined") {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "What is the current live gold price per ounce in USD? Return ONLY the numeric value.",
          config: { tools: [{ googleSearch: {} }] },
        });
        
        const price = parseFloat(response.text.replace(/[^0-9.]/g, ''));
        if (!isNaN(price) && price > 0) {
          setInitialPrice(price);
          setBuyPrice(price);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (error) {
      console.error("Gold price sync failed:", error);
    } finally {
      setIsFetchingPrice(false);
    }
  };

  useEffect(() => {
    fetchLiveGoldPrice();
    // Auto-update every 60 seconds
    const interval = setInterval(fetchLiveGoldPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Derived Calculations for Grid
  const gridResults = useMemo((): CalculationResults => {
    const steps: GridStep[] = [];
    let cumulativeMargin = 0;
    let cumulativePnl = 0;
    const currentPrice = initialPrice - (stepNo - 1) * gridDistance;

    for (let i = 1; i <= stepNo; i++) {
      const bPrice = initialPrice - (i - 1) * gridDistance;
      const margin = (lotSize * 100 * bPrice) / leverage;
      cumulativeMargin += margin;
      const pnl = (currentPrice - bPrice) * lotSize * 100;
      cumulativePnl += pnl;

      steps.push({
        stepNo: i,
        buyPrice: bPrice,
        margin,
        cumulativeMargin,
        pnl,
        cumulativePnl,
      });
    }

    const equity = balance + cumulativePnl;
    const marginLevel = (equity / cumulativeMargin) * 100;
    const drawdown = (cumulativePnl / balance) * 100;

    return {
      steps,
      equity,
      investment: cumulativeMargin,
      marginLevel,
      floatingPnl: cumulativePnl,
      drawdown,
    };
  }, [balance, lotSize, initialPrice, gridDistance, stepNo, leverage]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#D4AF37] font-sans selection:bg-[#D4AF37] selection:text-[#0A0A0A]">
      {/* Header */}
      <header className="border-b border-[#D4AF37]/30 bg-[#111111] shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.ibb.co/h1LvCP7D/generated-image.png" 
              alt="AlgoPro Capital Logo" 
              className="w-10 h-10 object-contain"
              onError={(e) => {
                // Fallback if the image doesn't exist at the expected path
                e.currentTarget.src = "https://picsum.photos/seed/algopro/100/100";
              }}
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tighter uppercase italic font-serif text-[#D4AF37]">
                AlgoPro Capital
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isFetchingPrice ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
                <p className="text-[8px] uppercase tracking-[0.2em] font-bold text-[#D4AF37]/60">
                  {isFetchingPrice ? "Syncing Live Data..." : lastUpdated ? `Live: ${lastUpdated}` : "Premium Risk Management Suite"}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex bg-[#0A0A0A] border border-[#D4AF37]/30 p-1 rounded-sm">
            <button
              onClick={() => setActiveTab("grid")}
              className={`px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-all flex items-center gap-2 ${
                activeTab === "grid" 
                  ? "bg-[#D4AF37] text-[#0A0A0A]" 
                  : "text-[#D4AF37]/60 hover:text-[#D4AF37]"
              }`}
            >
              <LayoutDashboard className="w-3 h-3" />
              Grid Analyzer
            </button>
            <button
              onClick={() => setActiveTab("profit")}
              className={`px-4 py-2 text-[10px] uppercase font-bold tracking-widest transition-all flex items-center gap-2 ${
                activeTab === "profit" 
                  ? "bg-[#D4AF37] text-[#0A0A0A]" 
                  : "text-[#D4AF37]/60 hover:text-[#D4AF37]"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Profit & Risk
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === "grid" ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Inputs */}
              <div className="lg:col-span-4 space-y-6">
                <section className="border border-[#D4AF37]/40 p-6 bg-[#161616] backdrop-blur-sm shadow-2xl shadow-gold/5">
                  <div className="flex items-center gap-2 mb-6 border-b border-[#D4AF37]/30 pb-2">
                    <Settings className="w-4 h-4 text-[#D4AF37]" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Grid Parameters</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <InputGroup label="Account Balance ($)" value={balance} onChange={setBalance} icon="$" example="11000" />
                    <InputGroup label="Fixed Lot Size" value={lotSize} onChange={setLotSize} step={0.01} icon="L" example="Based on your risk level calculate from Profit & Risk" />
                    <InputGroup 
                      label="Initial Gold Price ($)" 
                      value={initialPrice} 
                      onChange={setInitialPrice} 
                      icon="P" 
                      example="4700" 
                      onFetchLive={fetchLiveGoldPrice}
                      isFetching={isFetchingPrice}
                    />
                    <InputGroup label="Grid Distance ($)" value={gridDistance} onChange={setGridDistance} icon="D" example="4" />
                    <InputGroup label="Current Step No" value={stepNo} onChange={setStepNo} min={1} max={100} icon="#" />
                    
                    <div className="pt-4">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-2 block text-[#D4AF37]">
                        Leverage (1:X)
                      </label>
                      <div className="flex gap-2">
                        {[100, 200, 500, 2000].map((l) => (
                          <button
                            key={l}
                            onClick={() => setLeverage(l)}
                            className={`flex-1 py-2 text-xs font-mono border border-[#D4AF37]/30 transition-all ${
                              leverage === l 
                                ? "bg-[#D4AF37] text-[#0A0A0A] shadow-[0_0_15px_rgba(212,175,55,0.3)]" 
                                : "text-[#D4AF37]/60 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                            }`}
                          >
                            1:{l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="border border-[#D4AF37]/30 p-4 bg-[#D4AF37] text-[#0A0A0A] shadow-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 mt-0.5 shrink-0" />
                    <p className="text-[11px] leading-relaxed font-mono italic font-bold">
                      Current price is estimated at Step {stepNo} (${(initialPrice - (stepNo - 1) * gridDistance).toLocaleString()}).
                    </p>
                  </div>
                </section>
              </div>

              {/* Right Column: Results */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ResultCard label="Equity" value={gridResults.equity} isCurrency isNegative={gridResults.equity < 0} />
                  <ResultCard label="Investment" value={gridResults.investment} isCurrency />
                  <ResultCard label="Margin Level" value={gridResults.marginLevel} isPercentage isNegative={gridResults.marginLevel < 100} warning={gridResults.marginLevel < 100} />
                  <ResultCard label="Drawdown" value={gridResults.drawdown} isPercentage isNegative={gridResults.drawdown < 0} />
                </div>

                <div className={`border border-[#D4AF37]/30 p-6 flex justify-between items-center transition-all bg-[#111111] shadow-xl ${
                  gridResults.floatingPnl < 0 ? "border-red-900/50" : "border-green-900/50"
                }`}>
                  <div>
                    <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-60 mb-1 text-[#D4AF37]/70">Floating P&L</h3>
                    <p className={`text-4xl font-serif italic font-bold tracking-tighter ${
                      gridResults.floatingPnl < 0 ? "text-red-500" : "text-green-500"
                    }`}>
                      {gridResults.floatingPnl < 0 ? "-" : "+"}${Math.abs(gridResults.floatingPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {gridResults.floatingPnl < 0 ? (
                    <TrendingDown className="w-12 h-12 text-red-500 opacity-20" />
                  ) : (
                    <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
                  )}
                </div>

                <section className="border border-[#D4AF37]/30 bg-[#111111] overflow-hidden shadow-2xl">
                  <div className="p-4 border-b border-[#D4AF37]/30 flex justify-between items-center bg-[#1A1A1A] text-[#D4AF37]">
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-4 h-4" />
                      <h2 className="text-xs font-bold uppercase tracking-widest">Step Analysis</h2>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">Showing {gridResults.steps.length} steps</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#D4AF37]/20 bg-[#1A1A1A]">
                          <th className="p-3 text-[10px] uppercase font-bold tracking-wider font-serif italic border-r border-[#D4AF37]/10 text-[#D4AF37]/80">Step</th>
                          <th className="p-3 text-[10px] uppercase font-bold tracking-wider font-serif italic border-r border-[#D4AF37]/10 text-[#D4AF37]/80">Buy @</th>
                          <th className="p-3 text-[10px] uppercase font-bold tracking-wider font-serif italic border-r border-[#D4AF37]/10 text-[#D4AF37]/80">Margin</th>
                          <th className="p-3 text-[10px] uppercase font-bold tracking-wider font-serif italic border-r border-[#D4AF37]/10 text-[#D4AF37]/80">Cum. Margin</th>
                          <th className="p-3 text-[10px] uppercase font-bold tracking-wider font-serif italic text-[#D4AF37]/80">Cum. P&L</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[11px]">
                        {gridResults.steps.map((step) => (
                          <tr key={step.stepNo} className={`border-b border-[#D4AF37]/5 hover:bg-[#D4AF37]/10 transition-colors group ${step.stepNo === stepNo ? "bg-[#D4AF37]/5" : ""}`}>
                            <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/60 group-hover:text-[#D4AF37]">{step.stepNo.toString().padStart(2, '0')}</td>
                            <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/90 group-hover:text-[#D4AF37]">${step.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/90 group-hover:text-[#D4AF37]">${step.margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/90 group-hover:text-[#D4AF37]">${step.cumulativeMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className={`p-3 font-bold ${step.cumulativePnl < 0 ? "text-red-500" : "text-green-500"}`}>
                              ${step.cumulativePnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="profit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Inputs */}
              <div className="lg:col-span-4 space-y-6">
                <section className="border border-[#D4AF37]/40 p-6 bg-[#161616] backdrop-blur-sm shadow-2xl shadow-gold/5">
                  <div className="flex items-center gap-2 mb-6 border-b border-[#D4AF37]/30 pb-2">
                    <RefreshCcw className="w-4 h-4 text-[#D4AF37]" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Calculation Inputs</h2>
                  </div>
                  <div className="space-y-4">
                    <InputGroup 
                      label="Buy Price ($)" 
                      value={buyPrice} 
                      onChange={setBuyPrice} 
                      icon="B" 
                      example="4700" 
                      onFetchLive={fetchLiveGoldPrice}
                      isFetching={isFetchingPrice}
                    />
                    <InputGroup label="Sell Price ($)" value={sellPrice} onChange={setSellPrice} icon="S" example="5005" />
                    <InputGroup label="Base Capital ($)" value={baseCapital} onChange={setBaseCapital} icon="C" example="1000" />
                    
                    <div className="pt-4">
                      <label className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-2 block text-[#D4AF37]">
                        Leverage (1:X)
                      </label>
                      <div className="flex gap-2">
                        {[100, 200, 500, 2000].map((l) => (
                          <button
                            key={l}
                            onClick={() => setLeverage(l)}
                            className={`flex-1 py-2 text-xs font-mono border border-[#D4AF37]/30 transition-all ${
                              leverage === l 
                                ? "bg-[#D4AF37] text-[#0A0A0A] shadow-[0_0_15px_rgba(212,175,55,0.3)]" 
                                : "text-[#D4AF37]/60 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                            }`}
                          >
                            1:{l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="border border-[#D4AF37]/30 p-4 bg-[#111111] shadow-xl">
                  <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37] mb-3">Quick Summary</h3>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="opacity-60">Price Diff:</span>
                      <span className="font-bold">${(sellPrice - buyPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Points:</span>
                      <span className="font-bold">{((sellPrice - buyPrice) * 100).toLocaleString()}</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Tables */}
              <div className="lg:col-span-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profit/Loss Table */}
                  <section className="border border-[#D4AF37]/30 bg-[#111111] overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-[#D4AF37]/30 bg-[#1A1A1A] text-[#D4AF37]">
                      <h2 className="text-xs font-bold uppercase tracking-widest">Profit / (Loss) by Risk</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#D4AF37]/20 bg-[#1A1A1A] text-[10px] uppercase font-bold tracking-wider">
                            <th className="p-3 border-r border-[#D4AF37]/10">Level</th>
                            <th className="p-3 border-r border-[#D4AF37]/10">Lot</th>
                            <th className="p-3 border-r border-[#D4AF37]/10">P/L ($)</th>
                            <th className="p-3">Margin ($)</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-[11px]">
                          {RISK_LEVELS.map((risk) => {
                            const ratio = baseCapital / risk.cap;
                            const lot = ratio / 100;
                            const pl = (sellPrice - buyPrice) * lot * 100;
                            const margin = (buyPrice * lot * 100) / leverage;
                            return (
                              <tr key={risk.label} className="border-b border-[#D4AF37]/5 hover:bg-[#D4AF37]/5 transition-colors">
                                <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/60 font-serif italic">{risk.label}</td>
                                <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/90">{lot.toFixed(2)}</td>
                                <td className={`p-3 border-r border-[#D4AF37]/10 font-bold ${pl < 0 ? "text-red-500" : "text-green-500"}`}>
                                  {pl < 0 ? "-" : "+"}${Math.abs(pl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td className="p-3 text-[#D4AF37]/90">${margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Risk Level Table */}
                  <section className="border border-[#D4AF37]/30 bg-[#111111] overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-[#D4AF37]/30 bg-[#1A1A1A] text-[#D4AF37]">
                      <h2 className="text-xs font-bold uppercase tracking-widest">Risk Level Analysis</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#D4AF37]/20 bg-[#1A1A1A] text-[10px] uppercase font-bold tracking-wider">
                            <th className="p-3 border-r border-[#D4AF37]/10">Level</th>
                            <th className="p-3 border-r border-[#D4AF37]/10">Capital</th>
                            <th className="p-3 border-r border-[#D4AF37]/10">Ratio</th>
                            <th className="p-3">Lot</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-[11px]">
                          {RISK_LEVELS.map((risk) => {
                            const ratio = baseCapital / risk.cap;
                            const lot = ratio / 100;
                            return (
                              <tr key={risk.label} className="border-b border-[#D4AF37]/5 hover:bg-[#D4AF37]/5 transition-colors">
                                <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/60 font-serif italic">{risk.label}</td>
                                <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/90">${risk.cap.toLocaleString()}</td>
                                <td className="p-3 border-r border-[#D4AF37]/10 text-[#D4AF37]/40">{ratio.toFixed(2)}</td>
                                <td className="p-3 font-bold text-[#D4AF37]">{lot.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 bg-[#D4AF37]/5 text-[10px] italic opacity-60 leading-relaxed">
                      * Ratio calculated as Base Capital / Required Capital. 
                      Recommended lot sizes are based on standard conservative risk parameters.
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-6 border-t border-[#D4AF37]/20 mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono opacity-40 uppercase tracking-[0.3em] text-[#D4AF37]">
        <div>© 2026 Premium Risk Systems // Gold Grid Suite</div>
        <div className="flex gap-6">
          <span>Contract: 100oz</span>
          <span>Leverage: 1:{leverage}</span>
        </div>
      </footer>
    </div>
  );
}

function InputGroup({ 
  label, 
  value, 
  onChange, 
  step = 1, 
  min = 0, 
  max = 1000000,
  icon,
  example,
  onFetchLive,
  isFetching
}: { 
  label: string; 
  value: number; 
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  icon: string;
  example?: string;
  onFetchLive?: () => void;
  isFetching?: boolean;
}) {
  const isLongExample = example && example.length > 20;

  return (
    <div className="group">
      <div className="flex justify-between items-center mb-1.5">
        <label className="text-[10px] uppercase font-bold tracking-widest opacity-80 block group-focus-within:opacity-100 transition-opacity text-[#D4AF37]">
          {label}
        </label>
        {onFetchLive && (
          <button 
            onClick={onFetchLive}
            disabled={isFetching}
            className="text-[8px] uppercase font-bold tracking-wider text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 hover:bg-[#D4AF37] hover:text-[#0A0A0A] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isFetching ? (
              <RefreshCcw className="w-2 h-2 animate-spin" />
            ) : (
              <RefreshCcw className="w-2 h-2" />
            )}
            Live
          </button>
        )}
      </div>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-[#D4AF37]/50 group-focus-within:text-[#D4AF37]">
          {icon}
        </div>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
          className={`w-full bg-[#222222] border border-[#D4AF37]/40 py-2.5 pl-8 ${example && !isLongExample ? "pr-16" : "pr-3"} text-sm font-mono text-[#D4AF37] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all placeholder-[#D4AF37]/20`}
        />
        {example && !isLongExample && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[#D4AF37]/30 pointer-events-none">
            EX: {example}
          </div>
        )}
      </div>
      {example && isLongExample && (
        <div className="mt-1 text-[8px] font-mono text-[#D4AF37]/40 uppercase leading-tight italic">
          * {example}
        </div>
      )}
    </div>
  );
}

function ResultCard({ 
  label, 
  value, 
  isCurrency = false, 
  isPercentage = false,
  isNegative = false,
  warning = false
}: { 
  label: string; 
  value: number; 
  isCurrency?: boolean; 
  isPercentage?: boolean;
  isNegative?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`border border-[#D4AF37]/30 p-4 bg-[#111111] relative overflow-hidden shadow-lg ${
      warning ? "ring-1 ring-red-500 ring-inset border-red-500/50" : ""
    }`}>
      <h4 className="text-[9px] uppercase font-bold tracking-widest opacity-50 mb-2 text-[#D4AF37]/80">{label}</h4>
      <div className={`text-lg font-mono font-bold tracking-tighter ${
        isNegative ? "text-red-500" : "text-[#D4AF37]"
      }`}>
        {isCurrency && "$"}
        {value.toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}
        {isPercentage && "%"}
      </div>
      {warning && (
        <div className="absolute top-1 right-1">
          <AlertTriangle className="w-3 h-3 text-red-500" />
        </div>
      )}
      <div className="absolute bottom-0 right-0 w-12 h-12 bg-[#D4AF37]/5 rounded-tl-full -mr-6 -mb-6" />
    </div>
  );
}

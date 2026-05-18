'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface Portfolio {
  id: number;
  name: string;
  created_at: string;
}

interface PortfolioContextValue {
  portfolios: Portfolio[];
  activePortfolioId: number;
  setActivePortfolioId: (id: number) => void;
  refreshPortfolios: () => Promise<void>;
}

const PortfolioContext = createContext<PortfolioContextValue>({
  portfolios: [],
  activePortfolioId: 1,
  setActivePortfolioId: () => {},
  refreshPortfolios: async () => {},
});

export function usePortfolio() {
  return useContext(PortfolioContext);
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioId] = useState(1);

  const refreshPortfolios = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolios');
      const data = await res.json() as Portfolio[];
      setPortfolios(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refreshPortfolios();
  }, [refreshPortfolios]);

  return (
    <PortfolioContext.Provider value={{ portfolios, activePortfolioId, setActivePortfolioId, refreshPortfolios }}>
      {children}
    </PortfolioContext.Provider>
  );
}

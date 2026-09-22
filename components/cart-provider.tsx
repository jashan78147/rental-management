"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/domain/types";

const STORAGE_KEY = "bandobast-cart";

interface CartState {
  startsAt: string;
  endsAt: string;
  items: CartItem[];
}

interface CartApi extends CartState {
  ready: boolean;
  count: number;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setWindow: (startsAt: string, endsAt: string) => void;
  has: (productId: string) => boolean;
}

const CartContext = createContext<CartApi | null>(null);

function defaultWindow(): { startsAt: string; endsAt: string } {
  const start = new Date();
  start.setDate(start.getDate() + 3);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  return { startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export function CartProvider({ children }: { children: ReactNode }) {
  // The server and the first client paint must agree, so the stored cart is
  // read in an effect rather than during render.
  const [state, setState] = useState<CartState>(() => ({ ...defaultWindow(), items: [] }));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed?.startsAt && parsed?.endsAt && Array.isArray(parsed.items)) {
          setState(parsed);
        }
      }
    } catch {
      // Private mode or blocked storage. The default window is fine.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Nothing to do; the cart still works for this session.
    }
  }, [state, ready]);

  const add = useCallback((productId: string, quantity = 1) => {
    setState((prev) => {
      const existing = prev.items.find((i) => i.productId === productId);
      const items = existing
        ? prev.items.map((i) =>
            i.productId === productId ? { ...i, quantity: i.quantity + quantity } : i,
          )
        : [...prev.items, { productId, quantity }];
      return { ...prev, items };
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setState((prev) => ({
      ...prev,
      items:
        quantity <= 0
          ? prev.items.filter((i) => i.productId !== productId)
          : prev.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
    }));
  }, []);

  const remove = useCallback((productId: string) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.productId !== productId) }));
  }, []);

  const clear = useCallback(() => {
    setState((prev) => ({ ...prev, items: [] }));
  }, []);

  const setWindow = useCallback((startsAt: string, endsAt: string) => {
    setState((prev) => ({ ...prev, startsAt, endsAt }));
  }, []);

  const value = useMemo<CartApi>(
    () => ({
      ...state,
      ready,
      count: state.items.reduce((sum, i) => sum + i.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      setWindow,
      has: (productId: string) => state.items.some((i) => i.productId === productId),
    }),
    [state, ready, add, setQuantity, remove, clear, setWindow],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

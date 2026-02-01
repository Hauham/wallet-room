/**
 * Application Context
 * Provides global state management for the application
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import type { AppMode, WalletInfo, AppConfig } from '@/types';

/** Application state */
interface AppState {
  mode: AppMode;
  isUnlocked: boolean;
  isLoading: boolean;
  wallets: WalletInfo[];
  selectedWalletId: string | null;
  config: AppConfig;
  error: string | null;
}

/** Action types */
type AppAction =
  | { type: 'SET_MODE'; payload: AppMode }
  | { type: 'SET_UNLOCKED'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_WALLETS'; payload: WalletInfo[] }
  | { type: 'ADD_WALLET'; payload: WalletInfo }
  | { type: 'UPDATE_WALLET'; payload: { id: string; updates: Partial<WalletInfo> } }
  | { type: 'DELETE_WALLET'; payload: string }
  | { type: 'SELECT_WALLET'; payload: string | null }
  | { type: 'SET_CONFIG'; payload: Partial<AppConfig> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

/** Initial state */
const initialState: AppState = {
  mode: 'offline',
  isUnlocked: false,
  isLoading: true,
  wallets: [],
  selectedWalletId: null,
  config: {
    mode: 'offline',
    keyProviderType: 'local',
    encryptionEnabled: true,
    autoLockTimeout: 300000,
    defaultChain: 'BTC',
  },
  error: null,
};

/** Reducer */
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload };

    case 'SET_UNLOCKED':
      return { ...state, isUnlocked: action.payload };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_WALLETS':
      return { ...state, wallets: action.payload };

    case 'ADD_WALLET':
      return { ...state, wallets: [...state.wallets, action.payload] };

    case 'UPDATE_WALLET':
      return {
        ...state,
        wallets: state.wallets.map((w) =>
          w.id === action.payload.id ? { ...w, ...action.payload.updates } : w
        ),
      };

    case 'DELETE_WALLET':
      return {
        ...state,
        wallets: state.wallets.filter((w) => w.id !== action.payload),
        selectedWalletId:
          state.selectedWalletId === action.payload ? null : state.selectedWalletId,
      };

    case 'SELECT_WALLET':
      return { ...state, selectedWalletId: action.payload };

    case 'SET_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

/** Context type */
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Helper actions
  unlock: (password: string) => Promise<boolean>;
  lock: () => Promise<void>;
  loadWallets: () => Promise<void>;
  refreshWallets: () => Promise<void>;
}

/** Create context */
const AppContext = createContext<AppContextType | undefined>(undefined);

/** Provider props */
interface AppProviderProps {
  children: ReactNode;
}

/**
 * Application Provider
 */
export function AppProvider({ children }: AppProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize app on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        // Check if walletRoom API is available (Electron environment)
        if (typeof window !== 'undefined' && window.walletRoom) {
          const mode = await window.walletRoom.app.getMode();
          dispatch({ type: 'SET_MODE', payload: mode as AppMode });

          const isUnlocked = await window.walletRoom.security.isUnlocked();
          dispatch({ type: 'SET_UNLOCKED', payload: isUnlocked });
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initApp();
  }, []);

  // Unlock the app
  const unlock = async (password: string): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      if (window.walletRoom) {
        const success = await window.walletRoom.security.unlock(password);
        dispatch({ type: 'SET_UNLOCKED', payload: success });

        if (success) {
          await loadWallets();
        }

        return success;
      }

      // Development fallback
      dispatch({ type: 'SET_UNLOCKED', payload: true });
      return true;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to unlock',
      });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Lock the app
  const lock = async (): Promise<void> => {
    try {
      if (window.walletRoom) {
        await window.walletRoom.security.lock();
      }
      dispatch({ type: 'SET_UNLOCKED', payload: false });
      dispatch({ type: 'SET_WALLETS', payload: [] });
      dispatch({ type: 'SELECT_WALLET', payload: null });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to lock',
      });
    }
  };

  // Load wallets
  const loadWallets = async (): Promise<void> => {
    try {
      if (window.walletRoom) {
        const result = await window.walletRoom.wallet.listWallets();
        if (result.success && result.data) {
          dispatch({ type: 'SET_WALLETS', payload: result.data as WalletInfo[] });
        }
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load wallets',
      });
    }
  };

  // Refresh wallets
  const refreshWallets = async (): Promise<void> => {
    await loadWallets();
  };

  const value: AppContextType = {
    state,
    dispatch,
    unlock,
    lock,
    loadWallets,
    refreshWallets,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/**
 * Hook to use app context
 */
export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

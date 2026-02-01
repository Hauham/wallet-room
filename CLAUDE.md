# AI Coding Rules for Wallet Room Project

## General Rules

### 1. Language & Communication
- Code, comments, variable names: **English only**
- Commit messages: English
- Documentation: English
- JSDoc comments required for all public functions and interfaces

### 2. Code Style
- Use **TypeScript strict mode** - no `any` type unless absolutely necessary
- Use **functional components** with hooks for React
- Use **async/await** instead of .then() chains
- Use **early return** pattern to reduce nesting
- Maximum function length: **50 lines** - split if longer
- Maximum file length: **300 lines** - split if longer

### 3. Naming Conventions
```typescript
// Files
wallet.service.ts      // kebab-case for files
btc.wallet.ts          // chain prefix for chain-specific
CreateWallet.tsx       // PascalCase for React components

// Variables & Functions
const walletAddress = '';        // camelCase
function buildTransaction() {}   // camelCase
async function signTransaction() {} // prefix không cần

// Interfaces & Types
interface IWalletService {}      // Prefix 'I' for interfaces
type WalletType = 'cold' | 'warm';  // PascalCase for types
enum Chain { BTC, ETH, XRP, TRON }  // PascalCase for enums

// Constants
const MAX_RETRY_COUNT = 3;       // UPPER_SNAKE_CASE
const DEFAULT_DERIVATION_PATH = "m/44'/0'/0'/0/0";

// React Components
function WalletCard() {}         // PascalCase
const WalletList: React.FC = () => {} // PascalCase
```

### 4. File Organization Rules
```
- One component per file
- One service per file
- Group related utilities in single file
- Index files only for re-exports, no logic

Example:
// ✅ Good
src/chains/btc/btc.wallet.ts
src/chains/btc/btc.transaction.ts

// ❌ Bad
src/chains/btc/index.ts  // with all logic inside
```

### 5. Import Order
```typescript
// 1. Node built-ins
import path from 'path';
import crypto from 'crypto';

// 2. External packages
import React from 'react';
import { ethers } from 'ethers';

// 3. Internal modules - absolute paths
import { WalletService } from '@/services/wallet.service';
import { IKeyProvider } from '@/providers/key-provider.interface';

// 4. Internal modules - relative paths
import { formatAddress } from './utils';
import type { WalletInfo } from './types';

// 5. Styles (if any)
import './styles.css';
```

## Architecture Rules

### 6. Separation of Concerns
```typescript
// ✅ Services: Business logic only, no UI
class WalletService {
  async createWallet(chain: Chain): Promise<WalletInfo> {
    // Logic here
  }
}

// ✅ Components: UI only, call services for logic
function CreateWalletPage() {
  const handleCreate = async () => {
    const wallet = await walletService.createWallet(chain);
    // Update UI state
  };
}

// ❌ Bad: Business logic in component
function CreateWalletPage() {
  const handleCreate = async () => {
    const mnemonic = bip39.generateMnemonic();
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    // ... all logic here
  };
}
```

### 7. Chain Implementation Rules
```typescript
// Every chain MUST implement IChainService interface
// No chain-specific logic outside chains/ folder

// ✅ Good
import { BtcService } from '@/chains/btc/btc.service';
const btcService = new BtcService();
btcService.buildTransaction(params);

// ❌ Bad: Chain logic in generic service
import * as bitcoin from 'bitcoinjs-lib';
// Using bitcoin directly in wallet.service.ts
```

### 8. Key Provider Abstraction
```typescript
// NEVER access private keys directly in components or services
// Always go through IKeyProvider

// ✅ Good
const signature = await keyProvider.signTransaction(walletId, unsignedTx);

// ❌ Bad
const privateKey = await storage.getPrivateKey(walletId);
const signature = chainService.sign(unsignedTx, privateKey);
```

### 9. Error Handling
```typescript
// Use custom error classes
class WalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

// Always handle errors explicitly
async function createWallet(): Promise<Result<WalletInfo, WalletError>> {
  try {
    // logic
    return { success: true, data: wallet };
  } catch (error) {
    return {
      success: false,
      error: new WalletError('Failed to create wallet', 'WALLET_CREATE_FAILED', error)
    };
  }
}

// In components, show user-friendly messages
if (!result.success) {
  toast.error(getErrorMessage(result.error.code));
}
```

### 10. Security Rules - CRITICAL
```typescript
// ✅ MUST: Clear sensitive data after use
function signTransaction(privateKey: string, tx: UnsignedTx) {
  try {
    const signature = sign(tx, privateKey);
    return signature;
  } finally {
    // Clear from memory (best effort in JS)
    privateKey = '';
  }
}

// ✅ MUST: Validate all inputs
function buildTransaction(params: TxParams) {
  if (!isValidAddress(params.to)) {
    throw new WalletError('Invalid address', 'INVALID_ADDRESS');
  }
  if (!isValidAmount(params.amount)) {
    throw new WalletError('Invalid amount', 'INVALID_AMOUNT');
  }
}

// ❌ NEVER: Log sensitive data
console.log('Private key:', privateKey);  // NEVER DO THIS
console.log('Mnemonic:', mnemonic);        // NEVER DO THIS

// ❌ NEVER: Store unencrypted keys
localStorage.setItem('privateKey', key);   // NEVER DO THIS
```

## React & UI Rules

### 11. Component Structure
```typescript
// Standard component structure
import React, { useState, useEffect } from 'react';
import type { WalletInfo } from '@/types';

interface WalletCardProps {
  wallet: WalletInfo;
  onSelect?: (wallet: WalletInfo) => void;
}

export function WalletCard({ wallet, onSelect }: WalletCardProps) {
  // 1. Hooks first
  const [isLoading, setIsLoading] = useState(false);

  // 2. Derived state
  const shortAddress = formatAddress(wallet.address);

  // 3. Effects
  useEffect(() => {
    // effect logic
  }, [wallet.id]);

  // 4. Handlers
  const handleClick = () => {
    onSelect?.(wallet);
  };

  // 5. Early returns for loading/error states
  if (isLoading) {
    return <Skeleton />;
  }

  // 6. Main render
  return (
    <div onClick={handleClick}>
      {/* JSX */}
    </div>
  );
}
```

### 12. State Management
```typescript
// Use React Context for global state
// Keep context small and focused

// ✅ Good: Separate contexts
<WalletContext.Provider>
  <SettingsContext.Provider>
    <App />
  </SettingsContext.Provider>
</WalletContext.Provider>

// ❌ Bad: One giant context
<AppContext.Provider value={{ wallets, settings, transactions, user, ... }}>
```

### 13. Async Operations in UI
```typescript
// Always handle loading and error states
function TransactionPage() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSign = async () => {
    setState('loading');
    setError(null);

    const result = await transactionService.sign(tx);

    if (result.success) {
      setState('success');
    } else {
      setState('error');
      setError(result.error.message);
    }
  };

  return (
    <>
      {state === 'loading' && <Spinner />}
      {state === 'error' && <ErrorMessage message={error} />}
      {state === 'success' && <SuccessMessage />}
      <Button onClick={handleSign} disabled={state === 'loading'}>
        Sign
      </Button>
    </>
  );
}
```

## Testing Rules

### 14. Test Requirements
```typescript
// Unit tests required for:
// - All chain services (wallet creation, transaction building, signing)
// - Key provider implementations
// - Utility functions (validation, formatting)

// Test file naming
wallet.service.ts      → wallet.service.test.ts
btc.wallet.ts          → btc.wallet.test.ts

// Test structure
describe('BtcWalletService', () => {
  describe('generateAddress', () => {
    it('should generate valid legacy address', () => {});
    it('should generate valid segwit address', () => {});
    it('should throw for invalid public key', () => {});
  });
});
```

### 15. Test Data
```typescript
// Use fixtures for test data
// NEVER use real private keys or mnemonics in tests

// ✅ Good: Test vectors from official specs
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

// ✅ Good: Clearly fake data
const TEST_ADDRESS = '0x0000000000000000000000000000000000000001';
```

## Documentation Rules

### 16. Required Documentation
```typescript
/**
 * Builds an unsigned BTC transaction
 *
 * @param params - Transaction parameters
 * @param params.from - Sender address
 * @param params.to - Recipient address
 * @param params.amount - Amount in satoshis
 * @param params.utxos - Available UTXOs for spending
 * @param params.feeRate - Fee rate in sat/vB
 * @returns Unsigned transaction ready for signing
 * @throws {WalletError} If insufficient balance or invalid params
 *
 * @example
 * const unsignedTx = await btcService.buildTransaction({
 *   from: 'bc1q...',
 *   to: 'bc1q...',
 *   amount: '100000',
 *   utxos: [...],
 *   feeRate: 10
 * });
 */
async function buildTransaction(params: BtcTxParams): Promise<UnsignedTransaction>
```

## Git Rules

### 17. Commit Messages
```
feat: add BTC transaction building
fix: correct ETH gas estimation
refactor: extract key provider interface
docs: add wallet creation flow diagram
test: add XRP signing tests
chore: update dependencies
```

### 18. Branch Naming
```
feature/btc-wallet-creation
feature/qr-code-transfer
fix/eth-nonce-handling
refactor/key-provider-abstraction
```

## DO NOT Rules (Critical)
```
❌ DO NOT use 'any' type - use 'unknown' and type guards instead
❌ DO NOT store unencrypted private keys
❌ DO NOT log sensitive data (keys, mnemonics, seeds)
❌ DO NOT make network calls in offline mode
❌ DO NOT put chain-specific logic outside chains/ folder
❌ DO NOT access private keys directly - use KeyProvider
❌ DO NOT skip input validation
❌ DO NOT ignore error handling
❌ DO NOT write components longer than 200 lines
❌ DO NOT use default exports (use named exports)
❌ DO NOT mix business logic with UI logic
```

## MUST DO Rules (Critical)
```
✅ MUST encrypt all private keys before storage
✅ MUST validate all addresses before use
✅ MUST show transaction details for user confirmation before signing
✅ MUST handle all async errors
✅ MUST clear sensitive data from memory after use
✅ MUST log all wallet operations for audit trail
✅ MUST use TypeScript strict mode
✅ MUST implement IChainService for each blockchain
✅ MUST use IKeyProvider for all key operations
✅ MUST write tests for core functionality
```

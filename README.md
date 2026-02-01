# Wallet Room

Air-Gapped Custodial Wallet Management for BTC, ETH, XRP, and TRON.

## Overview

Wallet Room is an Electron desktop application for managing custodial cryptocurrency wallets in an air-gapped environment. It supports both offline (cold wallet) and online (warm wallet) modes.

### Key Features

- **Multi-Chain Support**: Bitcoin, Ethereum, XRP Ledger, and TRON
- **Air-Gapped Security**: Cold wallet operations in complete network isolation
- **HD Wallet Derivation**: BIP-39/44/49/84/86 standard derivation paths
- **QR Code Transfer**: Secure data transfer via QR codes for air-gapped signing
- **Encrypted Storage**: AES-256-GCM encryption for private keys
- **Transaction Signing**: Build and sign transactions offline

## Supported Chains

| Chain | Address Types | Derivation Path |
|-------|---------------|-----------------|
| BTC | Legacy, SegWit, Native SegWit, Taproot | BIP-44/49/84/86 |
| ETH | Standard EOA | BIP-44 (m/44'/60'/0'/0/x) |
| XRP | Classic address | BIP-44 (m/44'/144'/0'/0/x) |
| TRON | Base58 address | BIP-44 (m/44'/195'/0'/0/x) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd wallet-room

# Install dependencies
npm install

# Start development server
npm run dev
```

### Development Commands

```bash
# Start Electron + Vite development
npm run electron:dev

# Run tests
npm test

# Build for production
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## Project Structure

```
wallet-room/
├── electron/              # Electron main process
│   ├── main.ts           # Main entry point
│   ├── preload.ts        # Preload scripts
│   └── ipc/              # IPC handlers
├── src/
│   ├── App.tsx           # Main React app
│   ├── main.tsx          # React entry
│   ├── components/       # React components
│   ├── pages/            # Page components
│   ├── services/         # Business logic
│   ├── chains/           # Chain-specific implementations
│   │   ├── btc/          # Bitcoin
│   │   ├── eth/          # Ethereum
│   │   ├── xrp/          # XRP Ledger
│   │   └── tron/         # TRON
│   ├── providers/        # Key provider abstraction
│   ├── storage/          # Data persistence
│   ├── contexts/         # React contexts
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript types
├── tests/                # Test files
└── assets/               # Static assets
```

## Architecture

### Key Provider Abstraction

The application supports two key storage modes:

1. **Local Key Provider**: Private keys encrypted and stored locally
2. **External Key Provider**: Keys stored on external offline signer (watch-only)

### Operating Modes

- **Offline Mode**: Air-gapped environment for cold wallet operations
  - No network requests allowed
  - Transaction signing via QR codes
  - Maximum security

- **Online Mode**: For warm wallet operations
  - Network access for balance queries and broadcasting
  - Direct transaction submission

## Security Features

- **AES-256-GCM Encryption**: All private keys encrypted before storage
- **Memory Clearing**: Sensitive data cleared from memory after use
- **Network Isolation**: Offline mode blocks all network requests
- **Input Validation**: All addresses and amounts validated before use
- **Audit Logging**: All wallet operations logged with timestamps
- **No External Dependencies in Critical Path**: Core crypto operations use trusted libraries

## User Flows

### Create Cold Wallet (Offline)

1. Open app in Offline Mode
2. Select "Create Wallet" → Choose chain
3. App generates mnemonic, shows to user for backup
4. User confirms backup
5. App derives addresses, stores encrypted wallet
6. Export public key via QR for online system

### Sign Transaction (Offline)

1. Online system creates unsigned tx, exports as QR
2. User scans QR into Offline Wallet Room app
3. App parses tx, shows details for review
4. User confirms, app signs with stored private key
5. App displays signed tx as QR
6. Online system scans QR, broadcasts to network

## Technology Stack

- **Electron**: Desktop application framework
- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **bitcoinjs-lib**: Bitcoin operations
- **ethers.js v6**: Ethereum operations
- **xrpl.js**: XRP Ledger operations

## Building for Production

```bash
# Build for all platforms
npm run build

# Output will be in /release directory
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:run -- --coverage
```

## Contributing

1. Follow the coding rules in CLAUDE.md
2. Use TypeScript strict mode
3. Add tests for new functionality
4. Update documentation as needed

## License

MIT

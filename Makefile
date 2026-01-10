# contracts/Makefile

.PHONY: dev dev-sepolia dev-mainnet deploy deploy-sepolia deploy-mainnet

# Local development - starts blockchain + UI
dev:
	cp .env.hardhat ui/.env.local
	@echo "Starting Hardhat node + UI..."
	npx hardhat node & sleep 2 && cd ui && npm run dev

# Sepolia - just starts UI (contract already deployed)
dev-sepolia:
	cp .env.sepolia ui/.env.local
	cd ui && npm run dev

# Mainnet
dev-mainnet:
	cp .env.mainnet ui/.env.local
	cd ui && npm run dev

# Deploy commands
deploy:
	cp .env.hardhat ui/.env.local
	npx hardhat run scripts/deploy.ts --network localhost

deploy-sepolia:
	cp .env.sepolia ui/.env.local
	npx hardhat run scripts/deploy.ts --network sepolia

deploy-mainnet:
	cp .env.mainnet ui/.env.local
	npx hardhat run scripts/deploy.ts --network mainnet

# Seed local dev
seed:
	cp .env.hardhat ui/.env.local
	npx hardhat run scripts/seed.ts --network localhost
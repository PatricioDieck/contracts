/**
 * Sync Database from Contract
 * 
 * This script reads all cases from the blockchain contract and syncs them to the database.
 * It will:
 * - Create new cases that exist on-chain but not in DB
 * - Update existing cases with latest on-chain data (status, amounts, hashes)
 * 
 * Run with: npx tsx ui/scripts/sync-from-contract.ts
 */

import { db } from '../db/db'
import { cases } from '../db/schema'
import { eq } from 'drizzle-orm'
import { createPublicClient, http, formatEther } from 'viem'
import { hardhat, sepolia, mainnet } from 'viem/chains'
import { config } from 'dotenv'

config({ path: '.env.local' })

// Contract ABI (minimal - just what we need)
const ESCROW_ABI = [
  {
    inputs: [],
    name: 'nextCaseId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'cases',
    outputs: [
      { internalType: 'address', name: 'payer', type: 'address' },
      { internalType: 'address', name: 'payee', type: 'address' },
      { internalType: 'address', name: 'judge', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'bytes32', name: 'specs', type: 'bytes32' },
      { internalType: 'bytes32', name: 'deliverables', type: 'bytes32' },
      { internalType: 'uint64', name: 'reviewDeadline', type: 'uint64' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

const STATUS_MAP: Record<number, 'Funded' | 'Submitted' | 'Disputed' | 'Resolved'> = {
  0: 'Funded',
  1: 'Submitted',
  2: 'Disputed',
  3: 'Resolved',
}

function getChain() {
  const chainName = (process.env.NEXT_PUBLIC_CHAIN || 'hardhat') as keyof typeof chains
  const chains = { hardhat, sepolia, mainnet }
  return chains[chainName] || hardhat
}

function getPublicClient() {
  const chain = getChain()
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545'
  
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
}

async function main() {
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}`
  const aiJudgeAddress = process.env.NEXT_PUBLIC_AI_JUDGE_ADDRESS as `0x${string}`

  if (!escrowAddress) {
    console.error('❌ NEXT_PUBLIC_ESCROW_ADDRESS not set in .env.local')
    process.exit(1)
  }

  console.log('\n🔄 Syncing database from contract...')
  console.log(`   Contract: ${escrowAddress}`)
  console.log(`   Chain: ${process.env.NEXT_PUBLIC_CHAIN || 'hardhat'}\n`)

  const publicClient = getPublicClient()

  try {
    // First, check if we can connect to the RPC
    console.log('   Checking RPC connection...')
    try {
      const blockNumber = await publicClient.getBlockNumber()
      console.log(`   ✓ Connected to RPC (block: ${blockNumber})\n`)
    } catch (rpcError: any) {
      console.error('\n❌ Cannot connect to RPC:', rpcError.message)
      console.error('\n💡 Make sure Hardhat node is running:')
      console.error('   In one terminal: npx hardhat node')
      console.error('   Or run: make node\n')
      process.exit(1)
    }

    // Check if contract is deployed at this address
    console.log('   Checking if contract is deployed...')
    try {
      const code = await publicClient.getBytecode({ address: escrowAddress })
      if (!code || code === '0x') {
        console.error(`\n❌ No contract found at address ${escrowAddress}`)
        console.error('\n💡 Deploy the contract first:')
        console.error('   make deploy    (deploys to local Hardhat)')
        console.error('   make seed      (deploys + creates test cases)\n')
        process.exit(1)
      }
      console.log('   ✓ Contract found at address\n')
    } catch (codeError: any) {
      console.error('\n❌ Error checking contract:', codeError.message)
      process.exit(1)
    }

    // Get total number of cases
    const nextCaseId = await publicClient.readContract({
      address: escrowAddress,
      abi: ESCROW_ABI,
      functionName: 'nextCaseId',
    })

    const caseCount = Number(nextCaseId)
    console.log(`📦 Found ${caseCount} cases on-chain\n`)

    if (caseCount === 0) {
      console.log('   No cases to sync. Create some cases first!\n')
      return
    }

    let created = 0
    let updated = 0
    let errors = 0

    // Sync each case
    for (let i = 0; i < caseCount; i++) {
      try {
        // Read case from contract
        const caseData = await publicClient.readContract({
          address: escrowAddress,
          abi: ESCROW_ABI,
          functionName: 'cases',
          args: [BigInt(i)],
        })

        const [
          payer,
          payee,
          judge,
          amount,
          specsHash,
          deliverablesHash,
          reviewDeadline,
          statusNum,
        ] = caseData

        const status = STATUS_MAP[Number(statusNum)] || 'Funded'
        const amountEth = formatEther(amount)
        const zeroHash = '0x0000000000000000000000000000000000000000000000000000000000000000'

        // Check if case exists in DB
        const [existing] = await db.select().from(cases).where(eq(cases.caseIdOnChain, i)).limit(1)

        const caseDataToSync = {
          caseIdOnChain: i,
          payerAddress: payer.toLowerCase(),
          payeeAddress: payee.toLowerCase(),
          judgeAddress: (judge || aiJudgeAddress).toLowerCase(),
          title: existing?.title || `Case #${i}`, // Keep existing title if available
          description: existing?.description || null, // Keep existing description if available
          amountEth,
          status,
          specsHash: specsHash as string,
          deliverablesHash: deliverablesHash !== zeroHash ? (deliverablesHash as string) : null,
          reviewDeadline:
            reviewDeadline > 0n ? new Date(Number(reviewDeadline) * 1000) : null,
          // Update timestamps based on status
          submittedAt:
            status === 'Submitted' || status === 'Disputed' || status === 'Resolved'
              ? existing?.submittedAt || new Date()
              : null,
          disputedAt:
            status === 'Disputed' || status === 'Resolved'
              ? existing?.disputedAt || new Date()
              : null,
          resolvedAt: status === 'Resolved' ? existing?.resolvedAt || new Date() : null,
        }

        if (existing) {
          // Update existing case
          await db
            .update(cases)
            .set(caseDataToSync)
            .where(eq(cases.caseIdOnChain, i))

          console.log(`   ✓ Updated Case #${i} (${status})`)
          updated++
        } else {
          // Create new case
          await db.insert(cases).values(caseDataToSync)
          console.log(`   ✓ Created Case #${i} (${status})`)
          created++
        }
      } catch (error: any) {
        console.error(`   ✗ Error syncing Case #${i}:`, error.message)
        errors++
      }
    }

    console.log('\n✅ Sync complete!')
    console.log(`   Created: ${created}`)
    console.log(`   Updated: ${updated}`)
    if (errors > 0) {
      console.log(`   Errors: ${errors}`)
    }
    console.log('')
  } catch (error: any) {
    console.error('\n❌ Error syncing from contract:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Is Hardhat node running?')
    console.error('      → Run: npx hardhat node (in contracts/ directory)')
    console.error('   2. Is contract deployed?')
    console.error('      → Run: make deploy (in contracts/ directory)')
    console.error('   3. Check .env.local:')
    console.error('      → NEXT_PUBLIC_ESCROW_ADDRESS should match deployed address')
    console.error('      → NEXT_PUBLIC_RPC_URL should be http://127.0.0.1:8545')
    console.error('')
    process.exit(1)
  }
}

main()

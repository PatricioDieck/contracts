/**
 * Seed Database with Test Cases
 * 
 * This script creates test cases directly in the database for development/testing.
 * Run with: npx tsx ui/scripts/seed-db.ts
 */

import { db } from '../db/db'
import { cases } from '../db/schema'
import { eq } from 'drizzle-orm'
import { config } from 'dotenv'

config({ path: '.env.local' })

// Hardhat default accounts
const ACCOUNT_0 = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' // Account #0 (10000 ETH)
const ACCOUNT_1 = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8' // Account #1
const ACCOUNT_2 = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc' // Account #2
const ACCOUNT_3 = '0x90f79bf6eb2c4f870365e785982e1f101e93b906' // Account #3
const ACCOUNT_4 = '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65' // Account #4

// Test cases matching the Hardhat seed script (make seed)
// These cases are created on-chain and should match 1:1
const testCases = [
  // =========================================================================
  // FUNDED CASES (Case 0, 1) - Created by `make seed`, waiting for deliverables
  // =========================================================================
  {
    caseIdOnChain: 0,
    payerAddress: ACCOUNT_0,
    payeeAddress: ACCOUNT_2,
    judgeAddress: ACCOUNT_1,
    title: 'API Integration Service',
    description: 'Build a REST API that integrates with Stripe for payment processing. Requirements: authentication, rate limiting, webhook handlers, comprehensive error handling. Must include API documentation and test suite.',
    amountEth: '2.0',
    status: 'Funded' as const,
    specsHash: '0x1111111111111111111111111111111111111111111111111111111111111111',
  },
  {
    caseIdOnChain: 1,
    payerAddress: ACCOUNT_0,
    payeeAddress: ACCOUNT_4,
    judgeAddress: ACCOUNT_1,
    title: 'ERC-20 Token Contract Development',
    description: 'Develop and audit an ERC-20 token contract. Requirements: standard ERC-20 functionality, minting capability, burn function, transfer restrictions.',
    amountEth: '3.5',
    status: 'Funded' as const,
    specsHash: '0x2222222222222222222222222222222222222222222222222222222222222222',
  },

  // =========================================================================
  // SUBMITTED CASES (Case 2, 3) - Deliverables submitted, waiting for review
  // =========================================================================
  {
    caseIdOnChain: 2,
    payerAddress: ACCOUNT_0,
    payeeAddress: ACCOUNT_3,
    judgeAddress: ACCOUNT_1,
    title: 'Website Redesign Project',
    description: 'Complete redesign of company homepage with mobile responsive design. Must include: new hero section, services grid, testimonials carousel, contact form with validation.',
    amountEth: '1.5',
    status: 'Submitted' as const,
    specsHash: '0x3333333333333333333333333333333333333333333333333333333333333333',
    deliverablesHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    reviewDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(),
  },
  {
    caseIdOnChain: 3,
    payerAddress: ACCOUNT_0,
    payeeAddress: ACCOUNT_2,
    judgeAddress: ACCOUNT_1,
    title: 'Logo Design Package',
    description: 'Design a modern logo for tech startup. Deliverables: 3 variations, SVG source files, PNG exports in multiple sizes, brand guidelines PDF.',
    amountEth: '0.75',
    status: 'Submitted' as const,
    specsHash: '0x4444444444444444444444444444444444444444444444444444444444444444',
    deliverablesHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    reviewDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(),
  },

  // =========================================================================
  // DISPUTED CASE (Case 4) - Ready for AI arbitration
  // =========================================================================
  {
    caseIdOnChain: 4,
    payerAddress: ACCOUNT_3,
    payeeAddress: ACCOUNT_0, // Account #0 is payee here (reversed roles)
    judgeAddress: ACCOUNT_1,
    title: 'Smart Contract Security Audit',
    description: 'Full security audit of DeFi protocol. Must identify all critical/high/medium vulnerabilities with detailed explanations and fix recommendations.',
    amountEth: '5.0',
    status: 'Disputed' as const,
    specsHash: '0x5555555555555555555555555555555555555555555555555555555555555555',
    deliverablesHash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    disputedAt: new Date(),
  },

  // =========================================================================
  // RESOLVED CASES (Case 5, 6) - Already resolved by AI
  // =========================================================================
  {
    caseIdOnChain: 5,
    payerAddress: ACCOUNT_0,
    payeeAddress: ACCOUNT_2,
    judgeAddress: ACCOUNT_1,
    title: 'Mobile App UI/UX Design',
    description: 'Design complete UI/UX for mobile banking app. Deliverables: Figma designs, user flow diagrams, design system documentation, prototype.',
    amountEth: '3.8',
    status: 'Resolved' as const,
    specsHash: '0x6666666666666666666666666666666666666666666666666666666666666666',
    deliverablesHash: '0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    aiWinner: 'Payee',
    aiRationale: 'The deliverables meet all specifications outlined in the contract. All required design files were provided in the requested formats (Figma, PNG, SVG). The user flow diagrams are comprehensive and the design system documentation is well-structured. Quality exceeds expectations.',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    disputedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    resolvedAt: new Date(),
  },
  {
    caseIdOnChain: 6,
    payerAddress: ACCOUNT_0,
    payeeAddress: ACCOUNT_4,
    judgeAddress: ACCOUNT_1,
    title: 'Video Editing Project',
    description: 'Edit promotional video for product launch. 60 seconds, professional transitions, background music, captions, and brand overlay.',
    amountEth: '0.5',
    status: 'Resolved' as const,
    specsHash: '0x7777777777777777777777777777777777777777777777777777777777777777',
    deliverablesHash: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    aiWinner: 'Payer',
    aiRationale: 'The delivered video is only 45 seconds long instead of the required 60 seconds. Additionally, the brand overlay is missing. While the quality of transitions and music selection is good, the deliverables do not meet the core requirements. Funds returned to payer.',
    submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    disputedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    resolvedAt: new Date(),
  },
]

async function main() {
  console.log('\n🌱 Seeding database with test cases...\n')

  try {
    // Clear existing test cases (optional - comment out if you want to keep existing data)
    // await db.delete(cases).where(eq(cases.caseIdOnChain, testCases[0].caseIdOnChain))

    for (const testCase of testCases) {
      try {
        // Check if case exists
        const [existing] = await db.select().from(cases).where(eq(cases.caseIdOnChain, testCase.caseIdOnChain)).limit(1)

        if (existing) {
          // Update existing case
          await db.update(cases).set(testCase).where(eq(cases.caseIdOnChain, testCase.caseIdOnChain))
          console.log(`   ✓ Updated Case #${testCase.caseIdOnChain}: ${testCase.title} (${testCase.status})`)
        } else {
          // Insert new case
          await db.insert(cases).values(testCase)
          console.log(`   ✓ Created Case #${testCase.caseIdOnChain}: ${testCase.title} (${testCase.status})`)
        }
      } catch (error) {
        console.error(`   ✗ Error seeding Case #${testCase.caseIdOnChain}:`, error instanceof Error ? error.message : error)
      }
    }

    console.log('\n✅ Database seeded successfully!')
    console.log(`   Total cases: ${testCases.length}`)
    console.log(`\n💡 Tip: Connect wallet ${ACCOUNT_0} (Hardhat Account #0) to see most cases\n`)
  } catch (error) {
    console.error('\n❌ Error seeding database:', error)
    process.exit(1)
  }
}

main()

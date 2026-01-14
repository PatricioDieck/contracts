// db/schema.ts
import { pgTable, serial, text, numeric, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core'

export const statusEnum = pgEnum('case_status', ['Funded', 'Submitted', 'Disputed', 'Resolved'])

export const cases = pgTable('cases', {
  id: serial('id').primaryKey(),
  caseIdOnChain: integer('case_id_on_chain').unique().notNull(),
  payerAddress: text('payer_address').notNull(),
  payeeAddress: text('payee_address').notNull(),
  judgeAddress: text('judge_address').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  amountEth: numeric('amount_eth', { precision: 18, scale: 6 }).notNull(),
  status: statusEnum('status').notNull().default('Funded'),
  specsHash: text('specs_hash').notNull(),
  specsBlobUrl: text('specs_blob_url'),
  deliverablesHash: text('deliverables_hash'),
  deliverablesBlobUrl: text('deliverables_blob_url'),
  reviewDeadline: timestamp('review_deadline'),
  aiWinner: text('ai_winner'), // 'Payer' | 'Payee'
  aiRationale: text('ai_rationale'),
  aiRationaleHash: text('ai_rationale_hash'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  submittedAt: timestamp('submitted_at'),
  disputedAt: timestamp('disputed_at'),
  resolvedAt: timestamp('resolved_at'),
})

export const deliverables = pgTable('deliverables', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').references(() => cases.id, { onDelete: 'cascade' }).notNull(),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  blobUrl: text('blob_url').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  uploadedBy: text('uploaded_by').notNull(),
})

export const artifacts = pgTable('artifacts', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').references(() => cases.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  required: text('required').default('true').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Type exports (automatic inference!)
export type Case = typeof cases.$inferSelect
export type NewCase = typeof cases.$inferInsert
export type Deliverable = typeof deliverables.$inferSelect
export type NewDeliverable = typeof deliverables.$inferInsert
export type Artifact = typeof artifacts.$inferSelect
export type NewArtifact = typeof artifacts.$inferInsert
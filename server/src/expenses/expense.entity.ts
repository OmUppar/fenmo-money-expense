import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

const bigintTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};

@Entity('expenses')
export class Expense {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    name: 'amount_cents',
    type: 'bigint',
    transformer: bigintTransformer,
  })
  amountCents: number;

  @Column({ length: 100 })
  category: string;

  @Column({ length: 500 })
  description: string;

  @Column({ type: 'date' })
  date: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 100,
    nullable: true,
    unique: true,
  })
  idempotencyKey?: string | null;

  @Column({
    name: 'request_hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  requestHash?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  ensureId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}

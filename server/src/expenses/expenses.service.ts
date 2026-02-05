import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQuery } from './dto/list-expenses.query';
import { Expense } from './expense.entity';

type ExpenseResponse = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: Date;
};

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expensesRepository: Repository<Expense>,
  ) {}

  async create(
    dto: CreateExpenseDto,
    idempotencyKey?: string,
  ): Promise<ExpenseResponse> {
    const normalized = this.normalize(dto);
    const requestHash = this.hashRequest(normalized);

    if (idempotencyKey) {
      const existing = await this.expensesRepository.findOne({
        where: { idempotencyKey },
      });
      if (existing) {
        if (existing.requestHash && existing.requestHash !== requestHash) {
          throw new ConflictException(
            'Idempotency key reuse with different payload.',
          );
        }
        return this.toResponse(existing);
      }
    }

    const expense = this.expensesRepository.create({
      amountCents: normalized.amountCents,
      category: normalized.category,
      description: normalized.description,
      date: normalized.date,
      idempotencyKey: idempotencyKey ?? null,
      requestHash: idempotencyKey ? requestHash : null,
    });

    try {
      const saved = await this.expensesRepository.save(expense);
      return this.toResponse(saved);
    } catch (error) {
      if (this.isUniqueViolation(error) && idempotencyKey) {
        const existing = await this.expensesRepository.findOne({
          where: { idempotencyKey },
        });
        if (existing) {
          return this.toResponse(existing);
        }
      }
      throw error;
    }
  }

  async list(query: ListExpensesQuery): Promise<ExpenseResponse[]> {
    const where = query.category ? { category: query.category } : {};
    const order =
      query.sort === 'date_desc'
        ? { date: 'DESC' as const, createdAt: 'DESC' as const }
        : { createdAt: 'DESC' as const };

    const expenses = await this.expensesRepository.find({ where, order });
    return expenses.map((expense) => this.toResponse(expense));
  }

  private normalize(dto: CreateExpenseDto) {
    const amount = Number(dto.amount);
    const amountCents = Math.round(amount * 100);
    return {
      amount,
      amountCents,
      category: dto.category.trim(),
      description: dto.description.trim(),
      date: dto.date,
    };
  }

  private hashRequest(normalized: {
    amount: number;
    category: string;
    description: string;
    date: string;
  }) {
    return createHash('sha256')
      .update(JSON.stringify(normalized))
      .digest('hex');
  }

  private toResponse(expense: Expense): ExpenseResponse {
    return {
      id: expense.id,
      amount: Number((expense.amountCents / 100).toFixed(2)),
      category: expense.category,
      description: expense.description,
      date: expense.date,
      created_at: expense.createdAt,
    };
  }

  private isUniqueViolation(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}

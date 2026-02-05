import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { ListExpensesQuery } from './dto/list-expenses.query';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @Body() dto: CreateExpenseDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.expensesService.create(dto, idempotencyKey);
  }

  @Get()
  list(@Query() query: ListExpensesQuery) {
    return this.expensesService.list(query);
  }
}

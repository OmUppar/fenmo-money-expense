import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListExpensesQuery {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['date_desc'])
  sort?: 'date_desc';
}

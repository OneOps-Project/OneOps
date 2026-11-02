import { IsNotEmpty, IsString, IsDateString, IsOptional, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  deadline: string;

  @IsString()
  @IsNotEmpty()
  assigneeId: string;
}

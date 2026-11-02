import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ProposalType } from '../task-workflow.types';

export class CreateTaskProposalDto {
  @IsNotEmpty({ message: 'Loại đề xuất không được để trống' })
  @IsEnum(ProposalType, { message: 'Loại đề xuất không hợp lệ (postpone hoặc cancel)' })
  type: ProposalType;

  @IsNotEmpty({ message: 'Lý do không được để trống' })
  @IsString({ message: 'Lý do phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do không được vượt quá 500 ký tự' })
  reason: string;
}

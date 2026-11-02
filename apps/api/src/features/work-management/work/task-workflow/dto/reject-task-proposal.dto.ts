import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectTaskProposalDto {
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  @IsString({ message: 'Lý do từ chối phải là chuỗi ký tự' })
  @MaxLength(500, { message: 'Lý do từ chối không được vượt quá 500 ký tự' })
  reason: string;
}

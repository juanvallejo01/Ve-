import { IsUUID } from 'class-validator';

export class CreateBlockDto {
  @IsUUID()
  blockedId!: string;
}

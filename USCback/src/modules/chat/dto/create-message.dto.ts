import { IsUUID, IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateMessageDto {
  @IsUUID()
  receiverId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content!: string;
}

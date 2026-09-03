import { IsString, IsOptional, IsArray, ArrayMaxSize, MaxLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  nickname?: string;

  @IsString()
  @IsOptional()
  major?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(8)
  photos?: string[];

  @IsString()
  @IsOptional()
  @MaxLength(300)
  bio?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string | null;
}

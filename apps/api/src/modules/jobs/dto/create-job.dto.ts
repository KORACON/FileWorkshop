import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class CreateJobDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  originalFilename: string;

  @IsString()
  storedOriginalPath: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  fileSizeBefore: number;

  @IsString()
  operationType: string;

  @IsString()
  sourceFormat: string;

  @IsOptional()
  @IsString()
  targetFormat?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, string>;
}

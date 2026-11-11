import { IsString, MinLength, MaxLength } from 'class-validator';

export class SearchDocumentsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  query: string;
}

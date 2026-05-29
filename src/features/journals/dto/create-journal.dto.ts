import { IsString, IsNotEmpty } from 'class-validator';

export class CreateJournalDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}

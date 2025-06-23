     import { IsNotEmpty, IsString } from 'class-validator';

     export class FeedbackDto {
       @IsNotEmpty()
       @IsString()
       message: string;

       @IsNotEmpty()
       @IsString()
       page: string;
     }
     
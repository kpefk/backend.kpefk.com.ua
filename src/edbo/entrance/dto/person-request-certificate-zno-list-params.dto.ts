import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class PersonRequestCertificateZNOListParamsDto {
    @ApiProperty({
        description: 'Код фізичної особи',
        example: 1,
    })
    @IsNumber()
    personId!: number;
}
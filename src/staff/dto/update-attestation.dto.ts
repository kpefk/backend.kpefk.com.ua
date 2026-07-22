import { PartialType } from '@nestjs/swagger'

import { CreateAttestationDto } from './create-attestation.dto'

export class UpdateAttestationDto extends PartialType(CreateAttestationDto) {}

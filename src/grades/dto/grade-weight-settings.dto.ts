import { IsInt, Max, Min } from 'class-validator'

export class GradeWeightSettingsDto {
  currentWeight!: number
  examWeight!: number
}

export class UpdateGradeWeightSettingsDto {
  @IsInt()
  @Min(0)
  @Max(100)
  currentWeight!: number

  @IsInt()
  @Min(0)
  @Max(100)
  examWeight!: number
}

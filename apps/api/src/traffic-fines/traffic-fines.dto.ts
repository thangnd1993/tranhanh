import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { TrafficFineLookupRequest, TrafficFineVehicleType } from '@tranhanh/shared';

export class TrafficFineLookupDto implements TrafficFineLookupRequest {
  @ApiProperty({
    type: String,
    example: '99Z-000.00',
    minLength: 7,
    maxLength: 20,
    description: 'Synthetic-format example. Sent only in the POST body; the response returns a masked value.',
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(7)
  @MaxLength(20)
  licensePlate!: string;

  @ApiProperty({ enum: ['CAR', 'MOTORCYCLE', 'ELECTRIC_BICYCLE'] })
  @IsIn(['CAR', 'MOTORCYCLE', 'ELECTRIC_BICYCLE'])
  vehicleType!: TrafficFineVehicleType;
}

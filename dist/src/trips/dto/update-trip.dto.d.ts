import { TripStatus } from '@prisma/client';
import { CreateTripDto } from './create-trip.dto';
declare const UpdateTripDto_base: import("@nestjs/common").Type<Partial<CreateTripDto>>;
export declare class UpdateTripDto extends UpdateTripDto_base {
    status?: TripStatus;
}
export {};

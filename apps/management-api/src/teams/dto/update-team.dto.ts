import { PartialType } from '@nestjs/mapped-types';
import { CreateTeamDto } from './create-team.dto';
import { Team } from '@app/database';

export class UpdateTeamDto extends PartialType(Team) {}

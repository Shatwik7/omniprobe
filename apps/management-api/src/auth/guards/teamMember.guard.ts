import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from '@app/database';
import { isUUID } from 'class-validator';

/**
 * Guard to check if the user is a member or creator of the team specified in the route parameter.
 * Only Works when route parameter is named 'teamid'.
 * Use after JwtAuthGuard to ensure user is authenticated.
 */
@Injectable()
export class TeamMemberGuard implements CanActivate {
  constructor(
    @InjectRepository(Team)
    private teamRepo: Repository<Team>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const teamId = request.params.teamId;
    const authenticatedUserId = user?.id ?? user?.userId;

    if (!authenticatedUserId) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!teamId || isUUID(teamId) === false) {
      throw new BadRequestException('Team ID parameter is missing');
    }

    // Check if the user is a member or creator of the team
    const team = await this.teamRepo.findOne({
      where: [
        { id: teamId, members: { id: authenticatedUserId } },
        { id: teamId, createdBy: { id: authenticatedUserId } },
      ],
    });

    if (!team) {
      throw new ForbiddenException('You do not have access to this team');
    }

    return true;
  }
}

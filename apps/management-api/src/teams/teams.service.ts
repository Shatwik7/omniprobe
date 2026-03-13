import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Team, User } from '@app/database';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepo: Repository<Team>,

    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  private getTeamById(id: string): Promise<Team | null> {
    return this.teamsRepo.findOne({
      where: { id: id },
      relations: ['members', 'projects', 'createdBy'],
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        members: {
          id: true,
          name: true,
          email: true,
        },
        createdBy: {
          id: true,
          name: true,
          email: true,
        },
      },
    });
  }

  private checkIfIsMemberOfTeam(team: Team, userId: string): boolean {
    if (team.members == null || [] || undefined) return false;
    team.members.forEach((user) => {
      if (user.id == userId) return true;
    });
    return false;
  }

  create(name: string, userId: string): Promise<Team> {
    const Team = this.teamsRepo.create({
      name: name,
      createdBy: { id: userId },
      members: [{ id: userId }],
    });
    return this.teamsRepo.save(Team);
  }

  async findAll(userId: string): Promise<{ Teams: Team[]; Count: number }> {
    const [teams, count] = await this.teamsRepo.findAndCount({
      where: {
        members: {
          id: userId,
        },
      },
      relations: ['members', 'createdBy'],
    });
    return { Teams: teams, Count: count };
  }

  findOne(id: string): Promise<Team | null> {
    const team = this.getTeamById(id);
    return team;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto, requesterId: string) {
    const team = await this.teamsRepo.findOne({
      where: { id },
      relations: ['members', 'createdBy'],
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.createdBy?.id !== requesterId) {
      throw new ForbiddenException(
        'Only the team creator can manage team members or update the team',
      );
    }

    if (updateTeamDto.name) {
      team.name = updateTeamDto.name;
    }

    if (updateTeamDto.addUserId && updateTeamDto.removeUserId) {
      throw new BadRequestException(
        'Provide only one of addUserId or removeUserId per request',
      );
    }

    if (updateTeamDto.addUserId) {
      const userToAdd = await this.usersRepo.findOne({
        where: { id: updateTeamDto.addUserId },
      });

      if (!userToAdd) {
        throw new NotFoundException('User to add not found');
      }

      const isExistingMember = team.members?.some(
        (member) => member.id === updateTeamDto.addUserId,
      );

      if (!isExistingMember) {
        team.members = [...(team.members ?? []), userToAdd];
      }
    }

    if (updateTeamDto.removeUserId) {
      if (updateTeamDto.removeUserId === requesterId) {
        throw new BadRequestException(
          'Team creator cannot remove themselves from the team',
        );
      }

      team.members = (team.members ?? []).filter(
        (member) => member.id !== updateTeamDto.removeUserId,
      );
    }

    return this.teamsRepo.save(team);
  }

  async remove(id: string, requesterId: string): Promise<boolean> {
    const team = await this.teamsRepo.findOne({
      where: { id },
      relations: ['members', 'createdBy'],
    });

    if (!team) {
      return false;
    }

    if (team.createdBy?.id !== requesterId) {
      throw new ForbiddenException('Only the team creator can delete the team');
    }

    team.members = [];
    await this.teamsRepo.save(team);

    const options: FindOptionsWhere<Team> = { id: id };
    const deleted = await this.teamsRepo.delete(options);

    return Boolean(deleted.affected && deleted.affected > 0);
  }
}

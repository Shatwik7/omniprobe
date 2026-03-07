import { Injectable } from '@nestjs/common';
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

  update(id: string, updateTeamDto: UpdateTeamDto) {
    return this.teamsRepo.update(id, updateTeamDto);
  }

  async remove(id: string): Promise<boolean> {
    const team = await this.teamsRepo.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!team) {
      return false;
    }

    team.members = [];
    await this.teamsRepo.save(team);

    const options: FindOptionsWhere<Team> = { id: id };
    const deleted = await this.teamsRepo.delete(options);

    return Boolean(deleted.affected && deleted.affected > 0);
  }
}

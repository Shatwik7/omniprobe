import { Injectable } from '@nestjs/common';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Monitor, Project, Team } from '@app/database';
import { In, Repository } from 'typeorm';

@Injectable()
export class MonitorsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(Monitor)
    private readonly monitorRepository: Repository<Monitor>,
  ) {}

  private async findProjectInTeam(projectId: string, teamId: string) {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: { projects: true },
    });
    if (!team) {
      return null;
    }
    const project = team.projects.find((proj) => proj.id === projectId);
    return project;
  }

  create(createMonitorDto: CreateMonitorDto): Promise<Monitor> {
    const Monitor = this.monitorRepository.create({
      name: createMonitorDto.name,
      target: createMonitorDto.target,
      method: createMonitorDto.method,
      frequencySeconds: createMonitorDto.frequencySeconds,
      project: { id: createMonitorDto.projectId },
    });
    return this.monitorRepository.save(Monitor);
  }

  findAll(projectId: string): Promise<Monitor[]> {
    return this.monitorRepository.find({
      where: { project: { id: projectId } },
      select: {
        id: true,
        name: true,
        target: true,
        method: true,
        frequencySeconds: true,
        isLive: true,
        isActive: true,
        createdAt: true,
      },
      relations: ['project'],
    });
  }

  findOne(projectId: string, monitorId: string): Promise<Monitor | null> {
    return this.monitorRepository.findOne({
      where: {
        id: monitorId,
        project: { id: projectId },
      },
      select: {
        id: true,
        name: true,
        target: true,
        method: true,
        frequencySeconds: true,
        isLive: true,
        isActive: true,
        createdAt: true,
        project: { id: true, name: true },
        alertPolicy: {
          id: true,
          name: true,
          rules: true,
          notificationChannels: true,
        },
      },
      relations: ['project', 'alertPolicy'],
    });
  }

  async update(
    projectId: string,
    monitorId: string,
    updateMonitorDto: UpdateMonitorDto,
  ) {
    const monitor = await this.findOne(projectId, monitorId);
    if (!monitor) {
      return null;
    }
    Object.assign(monitor, updateMonitorDto);
    return this.monitorRepository.save(monitor);
  }

  async remove(projectId: string, monitorId: string): Promise<boolean> {
    const del = await this.monitorRepository.delete({
      id: monitorId,
      project: { id: projectId },
    });
    return Boolean(del.affected);
  }
}

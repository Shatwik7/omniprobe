import { Injectable } from '@nestjs/common';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { AlertPolicy, Monitor, Project, Team } from '@app/database';
import { Repository } from 'typeorm';

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

  private toMonitorEntityPayload(
    dto: CreateMonitorDto | UpdateMonitorDto,
  ): Partial<Monitor> {
    const payload: Partial<Monitor> = {};

    if (dto.name !== undefined) payload.name = dto.name;
    if (dto.target !== undefined) payload.target = dto.target;
    if (dto.method !== undefined) payload.method = dto.method;
    if (dto.frequencySeconds !== undefined)
      payload.frequencySeconds = dto.frequencySeconds;
    if (dto.isLive !== undefined) payload.isLive = dto.isLive;
    if (dto.isActive !== undefined) payload.isActive = dto.isActive;
    if (dto.headers !== undefined) payload.headers = dto.headers;
    if (dto.body !== undefined) payload.body = dto.body;
    if (dto.maintencePeriods !== undefined)
      payload.maintencePeriods = dto.maintencePeriods;
    if (dto.expectedStatus !== undefined)
      payload.expectedStatus = dto.expectedStatus;
    if (dto.expectedBody !== undefined) payload.expectedBody = dto.expectedBody;

    if (dto.projectId !== undefined) {
      payload.project = { id: dto.projectId } as Project;
    }

    if (dto.alertPolicyId !== undefined) {
      payload.alertPolicy = dto.alertPolicyId
        ? ({ id: dto.alertPolicyId } as AlertPolicy)
        : undefined;
    }

    return payload;
  }

  create(createMonitorDto: CreateMonitorDto): Promise<Monitor> {
    const monitor = this.monitorRepository.create(
      this.toMonitorEntityPayload(createMonitorDto),
    );
    return this.monitorRepository.save(monitor);
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
    const payload = this.toMonitorEntityPayload({
      ...updateMonitorDto,
      projectId,
    });
    Object.assign(monitor, payload);
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

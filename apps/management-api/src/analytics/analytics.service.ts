import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Analytics, Monitor, Project } from '@app/database';
import { Repository } from 'typeorm';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,

    @InjectRepository(Monitor)
    private readonly monitorRepository: Repository<Monitor>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  async checkMonitorInProject(
    monitorId: string,
    projectId: string,
  ): Promise<boolean> {
    const monitor = await this.monitorRepository.findOne({
      where: { id: monitorId, project: { id: projectId } },
    });
    return !monitor;
  }

  create(createAnalyticsDto: CreateAnalyticsDto): Promise<Analytics> {
    const { monitorId, ...rest } = createAnalyticsDto;
    const analytics = this.analyticsRepository.create({
      ...rest,
      monitor: { id: monitorId },
    });
    return this.analyticsRepository.save(analytics);
  }

  findAllByMonitor(monitorId: string): Promise<Analytics[]> {
    return this.analyticsRepository.find({
      where: { monitor: { id: monitorId } },
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string): Promise<Analytics | null> {
    return this.analyticsRepository.findOne({
      where: { id },
      relations: ['monitor'],
    });
  }

  async update(
    id: string,
    updateAnalyticsDto: UpdateAnalyticsDto,
  ): Promise<Analytics | null> {
    const analytics = await this.findOne(id);
    if (!analytics) return null;
    const { monitorId, ...rest } = updateAnalyticsDto as any;
    Object.assign(analytics, rest);
    return this.analyticsRepository.save(analytics);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.analyticsRepository.delete(id);
    return Boolean(result.affected);
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Analytics, Incident, IncidentStatus, Monitor, Project, Metric } from '@app/database';
import { IsNull, Not, Repository } from 'typeorm';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';

export type MonitorAvailability = {
  availability: number;
  downtime: number;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Analytics)
    private readonly analyticsRepository: Repository<Analytics>,

    @InjectRepository(Monitor)
    private readonly monitorRepository: Repository<Monitor>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,

    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,

    @InjectRepository(Metric)
    private readonly metricRepository: Repository<Metric>,
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

  findAllByMonitor(monitorId: string, region?: string): Promise<Analytics[]> {
    return this.analyticsRepository.find({
      where: { monitor: { id: monitorId }, ...(region ? { region } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async calculateAvailabilityAndDowntimeOfTimePeriod(
    monitorId: string,
    startTime: string,
    endTime: string,
  ): Promise<MonitorAvailability> {
    const startRange = new Date(startTime).getTime();
    const endRange = new Date(endTime).getTime();
    const totalTime = endRange - startRange;

    if (totalTime <= 0) {
      return { availability: 100, downtime: 0 };
    }

    const allIncidents = await this.incidentRepository.find({
      where: {
        monitor: { id: monitorId },
        startedAt: Not(IsNull()),
      },
      order: { startedAt: 'ASC' },
    });

    const totalDownTime = allIncidents.reduce((acc, incident) => {
      const incidentStart = incident.startedAt.getTime();
      const incidentEnd =
        incident.status === IncidentStatus.RESOLVED && incident.resolvedAt
          ? incident.resolvedAt.getTime()
          : Date.now();

      // Calculate overlap between incident duration and requested time period
      const overlapStart = Math.max(startRange, incidentStart);
      const overlapEnd = Math.min(endRange, incidentEnd);

      const overlap = overlapEnd - overlapStart;
      return acc + (overlap > 0 ? overlap : 0);
    }, 0);

    const availability = ((totalTime - totalDownTime) / totalTime) * 100;
    return {
      availability: Math.max(0, Math.min(100, availability)),
      downtime: totalDownTime,
    };
  }

  async calculateAvailabilityAndDowntime(
    monitorId: string,
  ): Promise<MonitorAvailability> {
    const allIncidents = await this.incidentRepository.find({
      where: { monitor: { id: monitorId } },
      order: { startedAt: 'ASC' },
    });

    const firstMetric = await this.metricRepository.findOne({
      where: { monitor: { id: monitorId } },
      order: { createdAt: 'ASC' },
    });

    const lastMetric = await this.metricRepository.findOne({
      where: { monitor: { id: monitorId } },
      order: { createdAt: 'DESC' },
    });

    if (!firstMetric || !lastMetric) {
      return { availability: 100, downtime: 0 };
    }

    const totalTime = lastMetric.createdAt.getTime() - firstMetric.createdAt.getTime();
    if (totalTime <= 0) return { availability: 100, downtime: 0 };

    const totalDownTime = allIncidents.reduce((acc, incident) => {
      const start = incident.startedAt.getTime();
      const end = incident.status === IncidentStatus.RESOLVED && incident.resolvedAt
        ? incident.resolvedAt.getTime()
        : Date.now();
      return acc + (end - start);
    }, 0);

    const availability = ((totalTime - totalDownTime) / totalTime) * 100;
    return { availability: Math.max(0, availability), downtime: totalDownTime };
  }

  getMonitorAvailability(
    monitorId: string,
    startTime?: string,
    endTime?: string,
  ): Promise<MonitorAvailability> {
    if (startTime && endTime) {
      return this.calculateAvailabilityAndDowntimeOfTimePeriod(
        monitorId,
        startTime,
        endTime,
      );
    }

    return this.calculateAvailabilityAndDowntime(monitorId);
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

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { Alert, Monitor } from '@app/database';
import { Repository } from 'typeorm';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,

    @InjectRepository(Monitor)
    private readonly monitorRepository: Repository<Monitor>,
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

  create(createAlertDto: CreateAlertDto): Promise<Alert> {
    const { monitorId, metricId, ...rest } = createAlertDto;
    const alert = this.alertRepository.create({
      ...rest,
      monitor: { id: monitorId },
      ...(metricId ? { metric: { id: metricId } } : {}),
    });
    return this.alertRepository.save(alert);
  }

  findAll(monitorId: string): Promise<Alert[]> {
    return this.alertRepository.find({
      where: { monitor: { id: monitorId } },
      relations: ['monitor', 'metric'],
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string): Promise<Alert | null> {
    return this.alertRepository.findOne({
      where: { id },
      relations: ['monitor', 'metric'],
    });
  }

  async update(id: string, updateAlertDto: UpdateAlertDto): Promise<Alert | null> {
    const alert = await this.findOne(id);
    if (!alert) {
      return null;
    }

    const { monitorId: _monitorId, metricId, ...rest } = updateAlertDto as any;
    Object.assign(alert, rest);
    if (metricId !== undefined) {
      alert.metric = metricId ? ({ id: metricId } as any) : undefined;
    }
    return this.alertRepository.save(alert);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.alertRepository.delete(id);
    return Boolean(result.affected);
  }
}

import { Catch, Injectable } from '@nestjs/common';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident, IncidentStatus } from '@app/database';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(Incident)
    private readonly IncidentRepo: Repository<Incident>,
  ) {}

  create(createIncidentDto: CreateIncidentDto) {
    const Incident = this.IncidentRepo.create({
      status: createIncidentDto.status,
      severity: createIncidentDto.severity,
      summary: createIncidentDto.summary,
      resolvedAt: createIncidentDto.resolvedAt,
      acknowledgedAt: createIncidentDto.acknowledgedAt,
      startedAt: createIncidentDto.startedAt,
      acknowledgedBy: { id: createIncidentDto.acknowledgedBy },
      monitor: { id: createIncidentDto.monitorId },
      notifications: createIncidentDto.notifications.map((notif) => ({
        id: notif,
      })),
    });
    return this.IncidentRepo.save(Incident);
  }

  findAll(monitorId: string) {
    return this.IncidentRepo.find({ where: { monitor: { id: monitorId } } });
  }

  findOne(incidentId: string) {
    return this.IncidentRepo.findOne({
      where: { id: incidentId },
      relations: {
        acknowledgedBy: true,
        monitor: true,
        metric: true,
        notifications: true,
      },
    });
  }

  update(id: number, updateIncidentDto: UpdateIncidentDto) {
    return `This action updates a #${id} incident`;
  }

  acknowledge(incidentId: string, userId: string) {
    return this.IncidentRepo.update(
      { id: incidentId },
      {
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: { id: userId },
        status: IncidentStatus.ACKNOWLEDGED,
      },
    );
  }

  resolve(incidentId: string) {
    return this.IncidentRepo.update(
      { id: incidentId },
      {
        resolvedAt: new Date().toISOString(),
        status: IncidentStatus.RESOLVED,
      },
    );
  }

  async remove(incidentId: string): Promise<boolean> {
    const incident = await this.IncidentRepo.delete({ id: incidentId });
    const res =
      incident.affected != null && incident.affected > 0 ? true : false;
    return res;
  }
}

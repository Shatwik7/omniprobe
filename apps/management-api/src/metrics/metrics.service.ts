import { Injectable } from '@nestjs/common';
import { CreateMetricDto } from './dto/create-metric.dto';
import { UpdateMetricDto } from './dto/update-metric.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Metric, Monitor, Project } from '@app/database';
import { Between, In, Repository } from 'typeorm';

@Injectable()
export class MetricsService {

  constructor(
    @InjectRepository(Metric)
    private readonly metricRepository: Repository<Metric>,

    @InjectRepository(Monitor)
    private readonly monitorRepository: Repository<Monitor>,

    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>
  ) {}

  async checkMonitorInProject(monitorId:string, projectId:string):Promise<boolean>{
    const monitor=await this.monitorRepository.findOne({
      where:{id:monitorId, project:{id:projectId}}
    });
    if(!monitor){
      return true;
    }
    return false;
  }

  create(createMetricDto: CreateMetricDto): Promise<Metric> {
    const metric = this.metricRepository.create(createMetricDto);
    return this.metricRepository.save(metric);
  }

  findAll(monitorId: string, beginDate: Date, endDate: Date, region: string): Promise<Metric[]> {

    return this.metricRepository.find({
      where: {
        monitor:{id:monitorId},
        createdAt: Between(beginDate, endDate),
      },
      order: {
        createdAt: "DESC"
      },
    });
  }

  findOne(id: string): Promise<Metric | null> {
    return this.metricRepository.findOne({ where: { id }, relations: ['monitor'] });
  }

  async update(id: string, updateMetricDto: UpdateMetricDto): Promise<Metric | null> {
    const metric = await this.findOne(id);
    if (!metric) {
      return null;
    }
    Object.assign(metric, updateMetricDto);
    return this.metricRepository.save(metric);
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.metricRepository.delete(id);
    return Boolean(result.affected && result.affected > 0);
  }
}

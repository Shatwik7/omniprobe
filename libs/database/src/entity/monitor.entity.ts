import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Project } from './project.entity';
import { AlertPolicy } from './alert-policy.entity';
import { Metric } from './metric.entity';
import { Incident } from './incident.entity';
import { ApiProperty } from '@nestjs/swagger';
import {IsUrl } from 'class-validator';

@Entity('monitors')
@Index(['project_id', 'isActive'])
@Index(['id', 'isActive'])
export class Monitor {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  @Index()
  id!: string;

  @ApiProperty()
  @Column()
  name!: string;

  @ApiProperty()
  @Column({ nullable: false , type:'text'})
  @IsUrl({
    require_protocol: true,
    require_valid_protocol: true,
    protocols: ['http', 'https'],
  })
  target!: string; // URL or IP

  @ApiProperty()
  @Column({ default: 'GET' , enum: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT']})
  method!: string;

  @ApiProperty()
  @Column({ default: 60 })
  frequencySeconds!: number;

  //API LIVE
  @Column({ default: true })
  isLive!: boolean;

  //MONITORING TASK ACTIVE
  @Column({ default: true })
  @ApiProperty()
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true , default: {}})
  @ApiProperty()
  headers?: Record<string, any>;

  @Column({ type: 'text', nullable: true, default: '' })
  @ApiProperty()
  body?: string;

  //Maintenence Window
  // [{"start": time,"end":time},{"start":time,"end":time}]....
  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  maintencePeriods?: Record<string, any>[] | null;


  // "Project has Multiple Monitors"
  @ApiProperty()
  @ManyToOne(() => Project, (project) => project.monitors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  // "Each Monitor Can Have A Alert Policy"
  @ApiProperty()
  @ManyToOne(() => AlertPolicy, (policy) => policy.monitors, { nullable: true })
  @JoinColumn({ name: 'alert_policy_id' })
  alertPolicy?: AlertPolicy;

  // Relationship to Metrics (Time-series data)
  @ApiProperty()
  @OneToMany(() => Metric, (metric) => metric.monitor)
  metrics!: Metric[];

  // Relationship to Incidents
  @ApiProperty()
  @OneToMany(() => Incident, (incident) => incident.monitor)
  incidents!: Incident[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt!: Date;
}
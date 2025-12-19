import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Project } from './project.entity';
import { AlertPolicy } from './alert-policy.entity';
import { Metric } from './metric.entity';
import { Incident } from './incident.entity';

@Entity('monitors')
export class Monitor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  target: string; // URL or IP

  @Column({ default: 'GET' })
  method: string;

  @Column({ default: 60 })
  frequencySeconds: number;

  // "Project has Multiple Monitors"
  @ManyToOne(() => Project, (project) => project.monitors, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  // "Each Monitor Can Have A Alert Policy"
  @ManyToOne(() => AlertPolicy, (policy) => policy.monitors, { nullable: true })
  @JoinColumn({ name: 'alert_policy_id' })
  alertPolicy: AlertPolicy;

  // Relationship to Metrics (Time-series data)
  @OneToMany(() => Metric, (metric) => metric.monitor)
  metrics: Metric[];

  // Relationship to Incidents
  @OneToMany(() => Incident, (incident) => incident.monitor)
  incidents: Incident[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
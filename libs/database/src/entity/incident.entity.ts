import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Monitor } from './monitor.entity';
import { Notification } from './notification.entity';

export enum IncidentStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export enum IncidentSeverity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
}

@Entity('incidents')
export class Incident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.OPEN })
  status: IncidentStatus;

  @Column({ type: 'enum', enum: IncidentSeverity, default: IncidentSeverity.CRITICAL })
  severity: IncidentSeverity;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ nullable: true })
  resolvedAt: Date;

  @ManyToOne(() => Monitor, (monitor) => monitor.incidents)
  @JoinColumn({ name: 'monitor_id' })
  monitor: Monitor;

  @OneToMany(() => Notification, (notif) => notif.incident)
  notifications: Notification[];

  @CreateDateColumn()
  startedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Monitor } from './monitor.entity';
import { Notification } from './notification.entity';
import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ type: 'enum', enum: IncidentStatus, default: IncidentStatus.OPEN })
  status: IncidentStatus;

  @ApiProperty()
  @Column({ type: 'enum', enum: IncidentSeverity, default: IncidentSeverity.CRITICAL })
  severity: IncidentSeverity;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  summary: string;

  @ApiProperty()
  @Column({ nullable: true })
  resolvedAt: Date;

  @ApiProperty()
  @ManyToOne(() => Monitor, (monitor) => monitor.incidents)
  @JoinColumn({ name: 'monitor_id' })
  monitor: Monitor;

  @ApiProperty()
  @OneToMany(() => Notification, (notif) => notif.incident)
  notifications: Notification[];

  @ApiProperty()
  @CreateDateColumn()
  startedAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
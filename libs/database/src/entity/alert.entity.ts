import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Monitor } from './monitor.entity';
import { Metric } from './metric.entity';
import { Incident } from './incident.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum AlertType {
  ANOMALY = 'ANOMALY',
  SLA_BREACH = 'SLA_BREACH',
  ERROR_RATE = 'ERROR_RATE',
  DEGRADATION = 'DEGRADATION',
}

@Entity('alerts')
@Index(['monitor', 'type'])
@Index(['createdAt'])
export class Alert {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column({
    type: 'enum',
    enum: AlertType,
    default: AlertType.ANOMALY,
  })
  type!: AlertType;

  @ApiProperty()
  @Column({ type: 'text' })
  message!: string;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty()
  @ManyToOne(() => Monitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitor_id' })
  monitor!: Monitor;

  @ApiProperty()
  @ManyToOne(() => Metric, { nullable: true })
  @JoinColumn({ name: 'metric_id' })
  metric?: Metric;

  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt!: Date;
}

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
import { ApiProperty } from '@nestjs/swagger';

@Entity('analytics')
@Index(['monitor', 'region'])
@Index(['monitor'])
@Index(['region'])
export class Analytics {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @ManyToOne(() => Monitor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitor_id' })
  monitor!: Monitor;

  @ApiProperty()
  @Column()
  region!: string;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  rollingAverage!: number;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  rollingStdDev!: number;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  variance!: number;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  p95!: number;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  p99!: number;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  anomalyDetected!: boolean;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  degradingComponent!: string | null;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  networkRatio!: number;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  backendRatio!: number;

  @ApiProperty()
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {
      totalPrediction: [],
      confidenceUpper: [],
      confidenceLower: [],
    },
  })
  forecast!: {
    totalPrediction: number[];
    confidenceUpper: number[];
    confidenceLower: number[];
  };

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  predictedSlaBreach!: boolean;

  @ApiProperty()
  @Column({ type: 'numeric', precision: 5, scale: 4, nullable: true })
  errorRate!: number;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  trend!: string;

  @ApiProperty()
  @Column({
    type: 'jsonb',
    nullable: true,
    default: [],
  })
  recentMetrics!: Metric[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt!: Date;
}


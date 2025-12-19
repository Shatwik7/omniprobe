import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Monitor } from './monitor.entity';


// Note: In TimescaleDB, this table would be converted to a Hypertable via migration.
@Entity('metrics')
@Index(['monitor', 'createdAt']) // Composite index for efficient querying
export class Metric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  durationMs: number;

  @Column({ type: 'int' })
  statusCode: number;

  @Column({ type: 'jsonb', nullable: true })
  breakdown: { dns: number; tcp: number; tls: number; ttfb: number };

  @Column()
  region: string;

  @Column({ default: true })
  isSuccess: boolean;

  @ManyToOne(() => Monitor, (monitor) => monitor.metrics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monitor_id' })
  monitor: Monitor;

  // Using CreateDateColumn as the time-series timestamp
  @CreateDateColumn()
  createdAt: Date;
}
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Monitor } from './monitor.entity';
import { ApiProperty } from '@nestjs/swagger';

// Note: In TimescaleDB, this table would be converted to a Hypertable via migration.
@Entity('metrics')
@Index(['monitor', 'createdAt']) // Composite index for efficient querying
export class Metric {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column({ type: 'int' })
  durationMs!: number;

  @ApiProperty()
  @Column({ type: 'int' })
  statusCode!: number;

  @ApiProperty()
  @Column({
    type: 'jsonb',
    nullable: false,
    default: { dns: 0, tcp: 0, tls: 0, ttfb: 0, spt: 0, ctt: 0 },
  })
  breakdown!: {
    dns: number;
    tcp: number;
    tls: number;
    ttfb: number;
    spt: number;
    ctt: number;
  };

  @ApiProperty()
  @Column({ type: 'int' })
  dns_response_time_ms!: number;

  @ApiProperty()
  @Column({ type: 'int' })
  tcp_connection_time_ms!: number;

  @ApiProperty()
  @Column({ type: 'int' })
  tls_handshake_time_ms!: number;

  @ApiProperty()
  @Column({ type: 'int' })
  time_to_first_byte_ms!: number;

  @ApiProperty()
  @Column({ type: 'int' })
  server_processing_time_ms!: number;

  @ApiProperty()
  @Column({ type: 'int' })
  content_transfer_time_ms!: number;

  @ApiProperty()
  @Column({ type: 'int' })
  total_time_ms!: number;

  @ApiProperty()
  @Column({ enum: ['NA', 'EU', 'IN', 'AU'] })
  region!: string;

  @ApiProperty()
  @Column({ default: true })
  isSuccess!: boolean;

  @ApiProperty()
  @ManyToOne(() => Monitor, (monitor) => monitor.metrics, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'monitor_id' })
  monitor!: Monitor;

  @ApiProperty()
  @CreateDateColumn()
  responseBody!: string;

  // Using CreateDateColumn as the time-series timestamp
  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;
}

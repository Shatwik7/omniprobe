import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Monitor } from './monitor.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('alert_policies')
export class AlertPolicy {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  name: string;

  // Configuration for thresholds (e.g., { "cpu_threshold": 80, "timeout_ms": 5000 })
  @ApiProperty()
  @Column({ type: 'jsonb', default: {} })
  rules: Record<string, any>;

  // Channels can be linked here (Slack, Email, etc.) - Simplified for brevity
  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  notificationChannels: string[];

  // "Each Monitor Can Have A Alert Policy" -> Inverse side
  @ApiProperty()
  @OneToMany(() => Monitor, (monitor) => monitor.alertPolicy)
  monitors: Monitor[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
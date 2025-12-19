import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Monitor } from './monitor.entity';

@Entity('alert_policies')
export class AlertPolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // Configuration for thresholds (e.g., { "cpu_threshold": 80, "timeout_ms": 5000 })
  @Column({ type: 'jsonb', default: {} })
  rules: Record<string, any>;

  // Channels can be linked here (Slack, Email, etc.) - Simplified for brevity
  @Column({ type: 'jsonb', nullable: true })
  notificationChannels: string[];

  // "Each Monitor Can Have A Alert Policy" -> Inverse side
  @OneToMany(() => Monitor, (monitor) => monitor.alertPolicy)
  monitors: Monitor[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
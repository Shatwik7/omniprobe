import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Incident } from './incident.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  channel: string; // e.g., 'SLACK', 'EMAIL'

  @Column()
  recipient: string; // e.g., '#ops-channel', 'admin@example.com'

  @Column({ default: 'SENT' })
  status: string;

  @ManyToOne(() => Incident, (incident) => incident.notifications)
  @JoinColumn({ name: 'incident_id' })
  incident: Incident;

  @CreateDateColumn()
  sentAt: Date;
}
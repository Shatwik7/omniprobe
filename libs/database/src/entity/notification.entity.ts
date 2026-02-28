import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Incident } from './incident.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('notifications')
export class Notification {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;


  @ApiProperty()
  @Column()
  channel!: string; // e.g., 'SLACK', 'EMAIL'

  @ApiProperty()
  @Column()
  recipient!: string; // e.g., '#ops-channel', 'admin@example.com'

  @ApiProperty()
  @Column({ default: 'SENT' })
  status!: string;

  @ApiProperty()
  @ManyToOne(() => Incident, (incident) => incident.notifications)
  @JoinColumn({ name: 'incident_id' })
  incident!: Incident;

  @ApiProperty()
  @CreateDateColumn()
  sentAt!: Date;
}
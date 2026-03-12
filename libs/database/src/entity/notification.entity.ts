import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Incident } from './incident.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Alert } from './alert.entity';

@Entity('notifications')
export class Notification {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column()
  channel!: string; // e.g., 'SLACK', 'EMAIL' , 'SYSTEM'

  @ApiProperty()
  @Column()
  address!: string; // e.g., '#ops-channel', 'admin@example.com'

  @ApiProperty()
  @Column({ default: 'SENT', enum: ['PENDING', 'SENT', 'FAILED', 'SEEN'] })
  status!: string;

  @ApiProperty()
  @Column({ name: 'incident_id', nullable: true })
  incident_id?: string;

  @ApiProperty()
  @Column({ name: 'alert_id', nullable: true })
  alert_id?: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  message?: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  title?: string;

  @ApiProperty()
  @CreateDateColumn()
  sentAt!: Date;
}

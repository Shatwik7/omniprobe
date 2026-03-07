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
  recipient!: string; // e.g., '#ops-channel', 'admin@example.com'

  @ApiProperty()
  @Column({ default: 'SENT', enum: ['PENDING', 'SENT', 'FAILED', 'SEEN'] })
  status!: string;

  @ApiProperty()
  @ManyToOne(() => Incident, (incident) => incident.notifications, {
    nullable: true,
  })
  @JoinColumn({ name: 'incident_id' })
  incident?: Incident;

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

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Monitor } from './monitor.entity';
import { ApiProperty } from '@nestjs/swagger';

export interface AlertPolicyDocument_v1 {
  version: '1.0'
  rules: {
    metric: string
    operator: '>' | '<' | '=' | '>=' | '<='
    threshold: number | boolean
    window?: string
  }[]

  logic: 'AND' | 'OR'

  actions: string[]

  suppression?: {
    cooldown?: string
    maintenance?: {
      start: string
      end: string
    }[]
  }
}

export interface NotificationChannel {
  channelType: 'slack' | 'email' | 'phone' | 'webhook' | 'sms' | 'push' | 'whatsapp'
  address: string
}

@Entity('alert_policies')
export class AlertPolicy {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column()
  name!: string;

  @ApiProperty()
  @Column({
    type: 'jsonb',
    default: {
      version: '1.0',
      rules: [],
      logic: 'AND',
      actions: [],
      suppression: {
        cooldown: '5m',
        maintenance: [],
      }
    },
  })
  rules?: AlertPolicyDocument_v1;

  // Channels can be linked here (Slack, Email, Phone etc.) 
  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  notificationChannels?:  NotificationChannel[];

  // "Each Monitor Can Have A Alert Policy" -> Inverse side
  @ApiProperty()
  @OneToMany(() => Monitor, (monitor) => monitor.alertPolicy)
  monitors?: Monitor[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt!: Date;
}

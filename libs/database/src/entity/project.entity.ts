import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { Monitor } from './monitor.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('projects')
export class Project {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty()
  @Column()
  name!: string;

  @ApiProperty()
  @Column({ nullable: true })
  description?: string;

  // Team owning this project (HIDE)
  @ApiHideProperty()
  @ManyToOne(() => Team, (team) => team.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: Team;

  // Monitors
  @ApiHideProperty()
  @OneToMany(() => Monitor, (monitor) => monitor.project)
  monitors!: Monitor[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt!: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt!: Date;
}

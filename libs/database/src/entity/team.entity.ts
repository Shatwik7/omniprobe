import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

@Entity('teams')
export class Team {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  name: string;

  // Created by user
  @ApiHideProperty()
  @ManyToOne(() => User, (user) => user.createdTeams)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  // Members (HIDE to avoid circular ref)
  @ApiHideProperty()
  @ManyToMany(() => User, (user) => user.teams)
  members: User[];

  // Projects (HIDE to avoid circular ref)
  @ApiHideProperty()
  @OneToMany(() => Project, (project) => project.team)
  projects: Project[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}

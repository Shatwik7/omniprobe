import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('teams')
export class Team {

  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column()
  name: string;

  // "Created By User"
  @ApiProperty()
  @ManyToOne(() => User, (user) => user.createdTeams)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  // "User Can be Belong to Multiple Team" (Inverse side)
  @ApiProperty()
  @ManyToMany(() => User, (user) => user.teams)
  members: User[];

  // "Multiple Projects In Team"
  @ApiProperty()
  @OneToMany(() => Project, (project) => project.team)
  projects: Project[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
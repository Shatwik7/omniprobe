import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  // "Created By User"
  @ManyToOne(() => User, (user) => user.createdTeams)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  // "User Can be Belong to Multiple Team" (Inverse side)
  @ManyToMany(() => User, (user) => user.teams)
  members: User[];

  // "Multiple Projects In Team"
  @OneToMany(() => Project, (project) => project.team)
  projects: Project[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
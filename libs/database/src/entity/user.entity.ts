import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Team } from './team.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  // Teams this user created (Owner relationship)
  @OneToMany(() => Team, (team) => team.createdBy)
  createdTeams: Team[];

  // Teams this user is a member of (Membership relationship)
  // "User Can be Belong to Multiple Team"
  @ManyToMany(() => Team, (team) => team.members)
  @JoinTable({
    name: 'users_teams', // Join table name
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams: Team[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
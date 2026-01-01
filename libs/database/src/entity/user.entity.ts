import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Team } from './team.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @ApiProperty()
  @Column()
  password:string;

  @ApiProperty()
  @Column()
  name: string;

  // Teams this user created (Owner relationship)
  @ApiProperty()
  @OneToMany(() => Team, (team) => team.createdBy)
  createdTeams: Team[];

  // Teams this user is a member of (Membership relationship)
  // "User Can be Belong to Multiple Team"
  @ApiProperty()
  @ManyToMany(() => Team, (team) => team.members)
  @JoinTable({
    name: 'users_teams', // Join table name
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'team_id', referencedColumnName: 'id' },
  })
  teams: Team[];

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;
}
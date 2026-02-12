import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Team } from './team.entity';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  // 🔐 NEVER expose password
  @Exclude()
  @ApiHideProperty()
  @Column({ select: false })
  password: string;

  @ApiProperty()
  @Column()
  name: string;

  // Teams user created
  @ApiHideProperty()
  @OneToMany(() => Team, (team) => team.createdBy)
  createdTeams: Team[];

  // Teams user belongs to
  @ApiHideProperty()
  @ManyToMany(() => Team, (team) => team.members)
  @JoinTable({
    name: 'users_teams',
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

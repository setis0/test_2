import {Entity, PrimaryGeneratedColumn, Column, ObjectId, ObjectIdColumn} from 'typeorm';

@Entity()
export class DeliverySettings {
  @ObjectIdColumn()
  id: ObjectId

  @Column()
  settingName: string;

  @Column()
  settingValue: string;
}

import {Column, CreateDateColumn, Entity, PrimaryGeneratedColumn} from 'typeorm';

export enum OrderStatus {
    new = 'new ', packed = 'packed', processing = 'processing', delivered = 'delivered', return = 'return'
}

@Entity()
export class Order {
    @PrimaryGeneratedColumn()
    id: string;

    @Column()
    productName: string;

    @CreateDateColumn()
    creationDate: Date;

    @Column({
                type: "enum",
                enum: OrderStatus,
                default: OrderStatus.new
            })
    status: OrderStatus;

}

import * as Joi from '@hapi/joi';
import {json, urlencoded} from 'body-parser';
import {config} from 'dotenv'
import * as express from 'express';
import {readFile} from "fs/promises";
import * as moment from 'moment'
import {join} from 'path'
import {DataSource} from 'typeorm';
import {FilterOperators} from "typeorm/driver/mongodb/typings";
import {MongoRepository} from "typeorm/repository/MongoRepository";
import {DeliverySettings} from './delivery-settings';
import {Order, OrderStatus} from './order';
// Define the validation schema using Joi
const orderSchema = Joi.object({
                                   id: Joi.string().required(),
                                   productName: Joi.string().required(),
                                   creationDate: Joi.date().required(),
                                   status: Joi.string().valid(...Array.from(Object.values(OrderStatus))).required(),
                               });

// Create Express app
const app = express();
app.use(json());

// TypeORM connection setup
let connection:DataSource;
let orderRepository: MongoRepository<Order>;
let deliverySettingRepository: MongoRepository<DeliverySettings>

// Routes
app.post('/order', urlencoded({extended: false}), async (req, res) => {
    try {
        const {id, productName, creationDate, status} = req.body;
        const {error} = orderSchema.validate({id, productName, creationDate, status});

        if (error) {
            return res.status(400).json({error: 'Validation error'});
        }

        const order = new Order();
        order.id = id;
        order.productName = productName;
        order.creationDate = creationDate;
        order.status = status;

        await orderRepository.save(order);
        res.json({message: 'Order created'});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/order/:id', async (req, res) => {
    try {
        const order = await orderRepository.findOneBy({
                                                          id: req.params.id
                                                      });
        if (order === null) {
            res.status(400)
               .json({error: `not found id: ${req.params.id}`});
        }
        res.json(order);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: error.message});
    }
});
const OrderStatuses = new Set(Object.values(OrderStatus))
/**
 * @link http://localhost:3000/order?statuses[]=new&statuses[]=processing&start=2023-05-11&end=2023-10-22
 */
app.get('/order', async (req, res) => {
    try {
        const where: FilterOperators<Order> = {};
        //статусы для фильтрации
        if (req.query.statuses) {
            // @ts-ignore
            const statuses = (req.query.statuses as string[]).filter(value => typeof value === "string" && OrderStatuses.has(value))
            if (statuses.length > 0) {
                where.status = {$in: statuses}
            }
        }
        //начало период
        if (req.query.start && moment(req.query.start as string).isValid()) {
            where.start = {
                $gte: moment(req.query.start as string).toDate()
            }
        }
        //конец период
        if (req.query.end && moment(req.query.end as string).isValid()) {
            where.end = {
                $lte: moment(req.query.end as string).toDate()
            }
        }
        const orders = await orderRepository.find({
                                                      where: where
                                                  });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.patch('/order/:id', async (req, res) => {
    try {
        const order = await orderRepository.findOneBy({
                                                          id: req.params.id
                                                      });
        if (!order) {
            return res.status(404).json({error: 'Order not found'});
        }

        const {error} = orderSchema.validate(req.body);
        if (error) {
            return res.status(400).json({error: error.details[0].message});
        }

        order.productName = req.body.productName;
        order.status = req.body.status;
        order.creationDate = req.body.creationDate;

        await orderRepository.save(order);

        return res.json({message: 'Order updated successfully'});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/delivery', async (req, res) => {
    try {
        const content = await readFile('./delivery.csv')
        res.json(content.toString());
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Internal server error'});
    }
});
(async () => {
    let result = config({
                            path: join(__dirname, `../.env${(process.env.NODE_ENV) ? `.${process.env.NODE_ENV}` : ''}`),
                            override: true
                        })
    if (result.error) {
        console.log(`parse file .env`, result.error)
        return
    }
    try {
        connection = new DataSource({
                                        type: "mongodb",
                                        host: process.env.MONGO_HOST || "localhost",
                                        port: Number(process.env.MONGO_PORT) || 27017,
                                        username: process.env.MONGO_USER,
                                        password: process.env.MONGO_PASSWORD,
                                        database: process.env.MONGO_DB||"test",
                                        entities: [
                                            Order,
                                            DeliverySettings
                                        ],
                                        logger: "advanced-console",
                                        authSource: "admin",
                                        useNewUrlParser: true,
                                        useUnifiedTopology: true,
                                    });
        await connection.initialize()
        if(!connection.isInitialized){
            console.log('не можем подключиться')
            return
        }
    } catch (error) {
        console.log('TypeORM connection error: ', error)
        return
    }
    orderRepository = connection.getMongoRepository(Order)
    deliverySettingRepository = connection.getMongoRepository(DeliverySettings)
    app.listen(8080, () => {
        console.log('Server is running on port 8080');
    });
})()

process.on("rejectionHandled", error => {
    console.log("rejectionHandled", error)
})

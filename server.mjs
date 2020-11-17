import amqp from 'amqplib/callback_api.js';
import bp from 'body-parser';
import express from 'express';
import pg from 'pg';

const pgHost = process.env['POSTGRESQL_HOST'] || 'localhost';
const mqHost = process.env['RABBITMQ_HOST'] || 'localhost';
const queueName = 'dockerized_example.work_queue';

const db = new pg.Pool({
  database: 'dockerized_example',
  host: pgHost,
  user: 'postgres',
  password: 'secret123',
});
const server = express();
server.use(bp.json())

amqp.connect(`amqp://${mqHost}`, (err, connection) => {
  if (err) return console.error(err);

  connection.createChannel((err, channel) => {
    if (err) return console.error(err);

    channel.assertQueue(queueName, { durable: true });

    server.post('/', async (req, res) => {
      const { rows: [record] } = await db.query(`
        INSERT INTO messages(message)
        VALUES ($1)
        RETURNING id, message
      `, [req.body]);
      const payload = Buffer.from(JSON.stringify(record))
      channel.sendToQueue(queueName, payload);
      res.json(record);
    });

    server.listen(3000);
  });
});

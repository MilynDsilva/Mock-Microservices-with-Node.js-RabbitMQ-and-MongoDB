const amqp = require('amqplib');

async function connect() {
    const conn = await amqp.connect(process.env.RABBITMQ_URI);
    const channel = await conn.createChannel();
    
    // Declare exchanges
    await channel.assertExchange('users_exchange', 'direct', { durable: true });
    await channel.assertExchange('payments_exchange', 'direct', { durable: true });
    await channel.assertExchange('emails_exchange', 'fanout', { durable: true });
    await channel.assertExchange('newsletters_exchange', 'fanout', { durable: true });

    return { conn, channel };
}

module.exports = { connect };

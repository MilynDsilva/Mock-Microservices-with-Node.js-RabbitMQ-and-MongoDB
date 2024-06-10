const express = require('express');
const bodyParser = require('body-parser');
const { connect } = require('../rabbitmq/config');

const app = express();
app.use(bodyParser.json());

async function sendMessage(exchange, routingKey, message) {
    const { channel, conn } = await connect();
    const response = await new Promise((resolve) => {
        const correlationId = generateUuid();
        const replyQueue = 'amq.rabbitmq.reply-to';

        channel.consume(replyQueue, (msg) => {
            if (msg.properties.correlationId === correlationId) {
                resolve(msg.content.toString());
            }
        }, { noAck: true });

        channel.publish(exchange, routingKey, Buffer.from(message), {
            correlationId,
            replyTo: replyQueue,
        });
    });

    conn.close();
    return response;
}

function generateUuid() {
    return Math.random().toString() + Math.random().toString() + Math.random().toString();
}

// Signup API
app.post('/signup', async (req, res) => {
    const response = await sendMessage('users_exchange', 'signup', JSON.stringify(req.body));
    res.send(response);
});

// Login API
app.post('/login', async (req, res) => {
    const response = await sendMessage('users_exchange', 'login', JSON.stringify(req.body));
    res.send(response);
});

// Get All Users API
app.get('/users', async (req, res) => {
    const response = await sendMessage('users_exchange', 'get_all', JSON.stringify(req.body));
    res.send(response);
});

// Payments API
app.post('/payments', async (req, res) => {
    const response = await sendMessage('payments_exchange', 'process', JSON.stringify(req.body));
    res.send(response);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));

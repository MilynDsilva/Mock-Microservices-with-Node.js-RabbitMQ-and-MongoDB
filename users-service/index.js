const express = require('express');
const bodyParser = require('body-parser');
const { connect } = require('../rabbitmq/config');
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/microservices', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
});

const User = mongoose.model('User', userSchema);

const app = express();
app.use(bodyParser.json());

async function handleMessage() {
    const { channel, conn } = await connect();
    await channel.assertQueue('users_signup');
    await channel.assertQueue('users_login');
    await channel.assertQueue('users_get_all');

    await channel.bindQueue('users_signup', 'users_exchange', 'signup');
    await channel.bindQueue('users_login', 'users_exchange', 'login');
    await channel.bindQueue('users_get_all', 'users_exchange', 'get_all');

    channel.consume('users_signup', async (msg) => {
        const { username, password, email } = JSON.parse(msg.content.toString());
        const user = new User({ username, password, email });
        await user.save();
        
        // Publish to newsletters exchange
        channel.publish('newsletters_exchange', '', Buffer.from(JSON.stringify({ email })));

        channel.sendToQueue(msg.properties.replyTo, Buffer.from('Signup successful'), {
            correlationId: msg.properties.correlationId,
        });
        channel.ack(msg);
    });

    channel.consume('users_login', async (msg) => {
        const { username, password } = JSON.parse(msg.content.toString());
        // Login validation logic here :/
        channel.sendToQueue(msg.properties.replyTo, Buffer.from('Login successful'), {
            correlationId: msg.properties.correlationId,
        });
        channel.ack(msg);
    });

    channel.consume('users_get_all', async (msg) => {
        const users = await User.find({});
        channel.sendToQueue(msg.properties.replyTo, Buffer.from(JSON.stringify(users)), {
            correlationId: msg.properties.correlationId,
        });
        channel.ack(msg);
    });
}

handleMessage();

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Users Service running on port ${PORT}`));

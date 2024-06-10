const express = require('express');
const bodyParser = require('body-parser');
const { connect } = require('../rabbitmq/config');

const app = express();
app.use(bodyParser.json());

async function handleMessage() {
    const { channel, conn } = await connect();
    await channel.assertQueue('emails');
    await channel.bindQueue('emails', 'emails_exchange', '');

    channel.consume('emails', async (msg) => {
        const { email, otp } = JSON.parse(msg.content.toString());
        
        console.log(`Sending email to ${email} with OTP: ${otp}`);

        channel.ack(msg);
    });
}

handleMessage();

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Email Service running on port ${PORT}`));

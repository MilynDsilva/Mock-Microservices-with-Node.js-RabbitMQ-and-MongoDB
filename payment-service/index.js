const express = require('express');
const bodyParser = require('body-parser');
const { connect } = require('../rabbitmq/config');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const otpSchema = new mongoose.Schema({
    userId: String,
    otp: String,
    createdAt: { type: Date, default: Date.now, expires: '10m' },
});

const Otp = mongoose.model('Otp', otpSchema);

const app = express();
app.use(bodyParser.json());

async function handleMessage() {
    const { channel, conn } = await connect();
    await channel.assertQueue('payments_process');
    await channel.bindQueue('payments_process', 'payments_exchange', 'process');

    channel.consume('payments_process', async (msg) => {
        const { userId, amount } = JSON.parse(msg.content.toString());
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const newOtp = new Otp({ userId, otp });
        await newOtp.save();

        console.log(`Sending OTP ${otp} to user ${userId}`);

        // Publish the OTP message to the email service
        channel.publish('emails_exchange', '', Buffer.from(JSON.stringify({ email: 'milyn.dsilva@codecraft.co.in', otp })));

        channel.sendToQueue(msg.properties.replyTo, Buffer.from('OTP sent'), {
            correlationId: msg.properties.correlationId,
        });
        channel.ack(msg);
    });
}

handleMessage();

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));

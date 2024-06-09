const express = require('express');
const bodyParser = require('body-parser');
const { connect } = require('../rabbitmq/config');

const app = express();
app.use(bodyParser.json());

async function handleMessage() {
    const { channel, conn } = await connect();
    await channel.assertQueue('newsletters');
    await channel.bindQueue('newsletters', 'newsletters_exchange', '');

    channel.consume('newsletters', async (msg) => {
        const { email, content } = JSON.parse(msg.content.toString());
        
        console.log(`Sending newsletter to ${email}: ${content}`);

        channel.ack(msg);
    });
}

handleMessage();

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Newsletter Service running on port ${PORT}`));

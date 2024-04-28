const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 9090;
const mongoose = require("mongoose");
const Order = require("./Order");
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated");

var channel, connection;

mongoose.connect("mongodb://localhost/order-service").then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("MongoDB connection error:", error);
});

app.use(express.json());

function createOrder(products, userEmail) {
    let total = 0;
    for (let t = 0; t < products.length; ++t) {
        total += products[t].price;
    }
    const newOrder = new Order({
        products,
        user: userEmail,
        total_price: total,
    });
    return newOrder.save();
}

async function connect() {
    try {
        const amqpServer = "amqp://localhost:5672";
        connection = await amqp.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertQueue("ORDER");
        console.log("Connected to RabbitMQ");
    } catch (error) {
        console.error("RabbitMQ connection error:", error);
    }
}

connect().then(() => {
    channel.consume("ORDER", (data) => {
        console.log("Consuming ORDER service");
        try {
            const { products, userEmail } = JSON.parse(data.content);
            createOrder(products, userEmail).then((newOrder) => {
                channel.ack(data);
                channel.sendToQueue(
                    "PRODUCT",
                    Buffer.from(JSON.stringify({ newOrder }))
                );
            }).catch((error) => {
                console.error("Error creating order:", error);
            });
        } catch (error) {
            console.error("Error parsing message:", error);
        }
    });
});

app.get("/order/orders", isAuthenticated, async (req, res) => {
    try {
        const email = req.user.email;
        console.log(email);
        const orders = await Order.find({ user: email });
        if (orders.length === 0 || !orders) {
            return res.json({ message: "No orders found for user" });
        }
        return res.json({ orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Order-Service at ${PORT}`);
});

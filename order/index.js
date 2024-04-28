const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 9090;
const mongoose = require("mongoose");
const Order = require("./Order");
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated");

// Connect to MongoDB
mongoose.connect("mongodb://localhost/order-service")
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error);
    });

// Middleware for parsing JSON bodies
app.use(express.json());

// Function to create an order in the database
async function createOrder(products, userEmail) {
    let total = 0;
    // Calculate total price of the order
    for (let t = 0; t < products.length; ++t) {
        total += products[t].price;
    }
    // Create a new order instance
    const newOrder = new Order({
        products,
        user: userEmail,
        total_price: total,
    });
    // Save the order in the database and return it
    return newOrder.save();
}

// Function to connect to RabbitMQ
async function connect() {
    try {
        const amqpServer = "amqp://localhost:5672";
        // Connect to RabbitMQ server
        connection = await amqp.connect(amqpServer);
        // Create a channel
        channel = await connection.createChannel();
        // Assert the ORDER queue
        await channel.assertQueue("ORDER");
        console.log("Connected to RabbitMQ");
    } catch (error) {
        console.error("RabbitMQ connection error:", error);
    }
}

// Connect to RabbitMQ and consume ORDER messages
connect().then(() => {
    channel.consume("ORDER", (data) => {
        console.log("Consuming ORDER service");
        try {
            // Parse the message data
            const { products, userEmail } = JSON.parse(data.content);
            // Create an order and send it to PRODUCT queue
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

// Route to get orders for a user
app.get("/order/orders", isAuthenticated, async (req, res) => {
    try {
        // Get user email from authenticated request
        const email = req.user.email;
        console.log(email);
        // Find orders for the user
        const orders = await Order.find({ user: email });
        if (orders.length === 0 || !orders) {
            return res.json({ message: "No orders found for user" });
        }
        // Return orders
        return res.json({ orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Order-Service at ${PORT}`);
});

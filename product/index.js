const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 8080;
const mongoose = require("mongoose");
const Product = require("./Product");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated");
var order;

var channel, connection;

app.use(express.json());
mongoose.connect("mongodb://localhost/product-service").then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("MongoDB connection error:", error);
});

async function connect() {
    try {
        const amqpServer = "amqp://localhost:5672";
        connection = await amqp.connect(amqpServer);
        channel = await connection.createChannel();
        await channel.assertQueue("PRODUCT");
        console.log("Connected to RabbitMQ");
    } catch (error) {
        console.error("RabbitMQ connection error:", error);
    }
}
connect();

app.get("/product/products", async (req, res) => {
    try {
        const products = await Product.find();
        return res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/product/buy", isAuthenticated, async (req, res) => {
    try {
        const { ids } = req.body;
        const products = await Product.find({ _id: { $in: ids } });
        channel.sendToQueue(
            "ORDER",
            Buffer.from(
                JSON.stringify({
                    products,
                    userEmail: req.user.email,
                })
            )
        );
        channel.consume("PRODUCT", (data) => {
            order = JSON.parse(data.content);
        });
        return res.json(order);
    } catch (error) {
        console.error("Error buying products:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/product/update", isAuthenticated, async (req, res) => {
    try {
        const { id, price } = req.body;
        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.json({ message: `Product with id ${id} not found` });
        }
        product.price = price;
        await product.save();
        return res.json(product);
    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/product/delete", isAuthenticated, async (req, res) => {
    try {
        const { id } = req.body;
        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.json({ message: "Product not found" });
        }
        await Product.deleteOne({ _id: id });
        return res.json({ message: "Product removed" });
    } catch (error) {
        console.error("Error deleting product:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/product/create", isAuthenticated, async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const newProduct = new Product({
            name,
            description,
            price,
        });
        await newProduct.save();
        return res.json(newProduct);
    } catch (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Product-Service at ${PORT}`);
});

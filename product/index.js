const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 8080;
const mongoose = require("mongoose");
const Product = require("./Product");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const isAuthenticated = require("../isAuthenticated");

// Middleware for parsing JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/product-service").then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("MongoDB connection error:", error);
});

// Initialize RabbitMQ connection
let channel, connection;

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

// Route to get all products
app.get("/product/products", async (req, res) => {
    console.log("Here");
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
        let order;
        const { ids } = req.body;

        // Initialize an empty array to store all products
        let products = [];

        // Iterate through the IDs and find each corresponding product
        for (const id of ids) {
            const product = await Product.findById(id);
            if (product) {
                // Add the product to the array
                products.push(product);
            }
        }

        // Calculate the total price considering all products
        let total = 0;
        products.forEach(product => {
            total += product.price;
        });

        // Send order to RabbitMQ
        channel.sendToQueue(
            "ORDER",
            Buffer.from(
                JSON.stringify({
                    products,
                    total_price: total,
                    userEmail: req.user.email,
                })
            )
        );
        // Listen for product data from RabbitMQ
        channel.consume("PRODUCT", (data) => {
            order = JSON.parse(data.content);
        });
        // Return the order details
        return res.json({message: "order placed successfully"});
    } catch (error) {
        console.error("Error buying products:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});



// Route to update product details
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

// Route to delete a product
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

// Route to create a new product
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

// Start the server
app.listen(PORT, () => {
    console.log(`Product-Service at ${PORT}`);
});

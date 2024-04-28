const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 8080;
const mongoose = require("mongoose");
const Product = require("./Product");
const jwt = require("jsonwebtoken");
const amqp = require("amqplib");
const isAuthenticated = require("./isAuthenticated");

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Middleware for parsing JSON bodies
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://mongodb:27017/product-service").then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("MongoDB connection error:", error);
});

// Initialize RabbitMQ connection
let channel, connection;

async function connect() {
    try {
        const amqpServer = "amqp://rabbitmq:5672";
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
        if (ids.length === 0)
        {
            return res.json("Invalid product values provided");
        }
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
        const { id, price, version } = req.body;
        const product = await Product.findOne({ _id: id });
        if (id.length === 0 || price <= 0 || version < 0)
        {
            return res.json("Invalid product values provided");
        }
        // Check if the product exists
        if (!product) {
            return res.status(404).json({ message: `Product with id ${id} not found` });
        }
        // Do not allow updation of products not owned by user.
        if (product.email !== req.user.email)
        {
            return res.json({message: "Product is not owned by user to update"});
        }
        // Check if the provided version matches the current version of the product
        if (product.version !== version) {
            return res.status(409).json({ message: `Concurrent modification detected for product ${id}` });
        }

        // Update the product details
        product.price = price;
        product.version++; // Increment the version

        // Save the updated product
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
        if (id.length === 0)
        {
            return res.json("Invalid product values provided");
        }
        // Do not allow deletion of products not owned by user.
        if (!product) {
            return res.json({ message: "Product not found" });
        }
        if (product.email !== req.user.email)
        {
            return res.json({message: "Product is not owned by user to delete"});
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
        const isFound = await Product.findOne({ email: req.user.email, name: name});
        if (name.length === 0 || price <= 0)
        {
            return res.json("Invalid product values provided");
        }
        if (isFound)
        {
            return res.json("Product already exists");
        }
        const newProduct = new Product({
            name,
            description,
            price,
            email: req.user.email
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

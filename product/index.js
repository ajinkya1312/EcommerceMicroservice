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
mongoose.connect("mongodb://localhost/product-service");

async function connect() {
    const amqpServer = "amqp://localhost:5672";
    connection = await amqp.connect(amqpServer);
    channel = await connection.createChannel();
    await channel.assertQueue("PRODUCT");
}
connect();

app.get("/product/products", async (req, res) => {
    try {
        const products = await Product.find();
        return res.json(products);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/product/buy", isAuthenticated, async (req, res) => {
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
});

app.post("/product/update", isAuthenticated, async (req, res) => {
    const { id, price } = req.body;
    const product = await Product.findOne({ id });
    if (!product)
    {
        return res.json({message: "product with ${id} not found"});
    }
    product.price = price;
    product.save();
    return res.json(product);
});

app.post("/product/delete", isAuthenticated, async (req, res) => {
    console.log(req.body);
    const { id } = req.body;
    console.log( id );
    const product = await Product.findOne({ _id : id });
    if (!product)
    {
        return res.json({message: "product not found"});
    }
    Product.deleteOne( {_id: id});
    Product.save();
    return res.json({message: "product removed"});
});

app.post("/product/create", isAuthenticated, async (req, res) => {
    const { name, description, price } = req.body;
    const newProduct = new Product({
        name,
        description,
        price,
    });
    newProduct.save();
    return res.json(newProduct);
});


app.listen(PORT, () => {
    console.log(`Product-Service at ${PORT}`);
});

const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 7070;
const mongoose = require("mongoose");
const User = require("./User");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');

mongoose.connect("mongodb://localhost/auth-service").then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("MongoDB connection error:", error);
});

app.use(express.json());

function hashString(inputString) {
    const hash = crypto.createHash('sha256');
    hash.update(inputString);
    return hash.digest('hex');
}

app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User doesn't exist" });
        } else {
            const hashedPassword = hashString(password);
            if (hashedPassword !== user.password) {
                return res.status(401).json({ message: "Password Incorrect" });
            }
            const payload = {
                email,
                name: user.name
            };
            jwt.sign(payload, "secret", (err, token) => {
                if (err) {
                    console.error("JWT signing error:", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }
                return res.json({ token: token });
            });
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/auth/register", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        } else {
            const hashedPassword = hashString(password);
            const newUser = new User({
                email,
                name,
                password: hashedPassword
            });
            await newUser.save();
            return res.json(newUser);
        }
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.listen(PORT, () => {
    console.log(`Auth-Service at ${PORT}`);
});

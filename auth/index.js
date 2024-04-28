const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 7070;
const mongoose = require("mongoose");
const User = require("./User");
const jwt = require("jsonwebtoken");

// Connect to MongoDB
mongoose.connect("mongodb://mongodb:27017/auth-service").then(() => {
    console.log("Connected to MongoDB");
}).catch((error) => {
    console.error("MongoDB connection error:", error);
});

app.use(express.json());

// Function to hash passwords using SHA-256 algorithm
async function hashPassword(password) {
    const hashedPassword = require('crypto').createHash('sha256').update(password).digest('hex');
    return hashedPassword;
}

// Route for user login
app.post("/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find user by email
        const user = await User.findOne({ email });
        // If user doesn't exist, return 404 error
        if (!user) {
            return res.status(404).json({ message: "User doesn't exist" });
        }
        // Hash the password provided and compare with stored password
        const hashedPassword = await hashPassword(password);
        if (hashedPassword !== user.password) {
            // If passwords don't match, return 401 error
            return res.status(401).json({ message: "Password Incorrect" });
        }
        // Generate JWT token with user payload
        const payload = {
            email,
            name: user.name
        };
        // Sign the JWT token with secret key
        jwt.sign(payload, "secret", (err, token) => {
            if (err) {
                // If error occurred during JWT signing, return 500 error
                console.error("JWT signing error:", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }
            // Return JWT token
            return res.json({ token });
        });
    } catch (error) {
        // Handle any internal server error
        console.error("Login error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route for user registration
app.post("/auth/register", async (req, res) => {
    try {
        const { email, password, name } = req.body;
        // Check if user with given email already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            // If user already exists, return 400 error
            return res.status(400).json({ message: "User already exists" });
        }
        // Hash the password provided
        const hashedPassword = await hashPassword(password);
        // Create a new user with hashed password
        const newUser = new User({
            email,
            name,
            password: hashedPassword
        });
        // Save the new user to database
        await newUser.save();
        // Return the newly created user
        return res.json(newUser);
    } catch (error) {
        // Handle any internal server error
        console.error("Registration error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Auth-Service at ${PORT}`);
});

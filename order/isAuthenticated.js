const jwt = require("jsonwebtoken");

module.exports = async function isAuthenticated(req, res, next) {
    try {
        const token = req.headers["authorization"];
        if (!token) {
            return res.status(401).json({ message: "No token provided" });
        }
        const tokenParts = token.split(" ");
        if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
            return res.status(401).json({ message: "Invalid token format" });
        }
        const accessToken = tokenParts[1];
        jwt.verify(accessToken, "secret", (err, user) => {
            if (err) {
                return res.status(401).json({ message: "Invalid token" });
            } else {
                req.user = user;
                next();
            }
        });
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    name: String,
    description: String,
    price: Number,
    email: String,
    created_at: {
        type: Date,
        default: Date.now(),
    },
    version : {
        type: Number,
        default: 0
    }
});

module.exports = Product = mongoose.model("product", ProductSchema);

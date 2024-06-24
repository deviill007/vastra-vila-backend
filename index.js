const dotenv = require("dotenv").config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://vastra-vila.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "auth-token"],
  })
);

// Image Storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});
const upload = multer({ storage: storage });

app.post("/upload", upload.single("product"), (req, res) => {
  try {
    res.json({
      success: 1,
      image_url: `/images/${req.file.filename}`,
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).send({ error: "Failed to upload image" });
  }
});

// Route for Images folder
app.use("/images", express.static("upload/images"));

// Middleware to fetch user from token
const fetchuser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    return res
      .status(401)
      .send({ errors: "Please authenticate using a valid token" });
  }
  try {
    const data = jwt.verify(token, "secret_ecom");
    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).send({ errors: "Please authenticate using a valid token" });
  }
};

// Schema for creating user model
const Users = mongoose.model("Users", {
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  cartData: { type: Object },
  date: { type: Date, default: Date.now() },
});

// Schema for creating Product
const Product = mongoose.model("ProductSchema", {
  id: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  new_price: { type: Number },
  old_price: { type: Number },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
});

// ROOT API Route For Testing
app.get("/", (req, res) => {
  res.send("Root");
});

// Create an endpoint at ip/login for login the user and giving auth-token
app.post("/login", async (req, res) => {
  console.log("Login");
  let success = false;
  try {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
      const passCompare = req.body.password === user.password;
      if (passCompare) {
        const data = {
          user: {
            id: user.id,
          },
        };
        success = true;
        console.log(user.id);
        const token = jwt.sign(data, "secret_ecom");
        res.json({ success, token });
      } else {
        return res.status(400).json({
          success: success,
          errors: "please try with correct email/password",
        });
      }
    } else {
      return res.status(400).json({
        success: success,
        errors: "please try with correct email/password",
      });
    }
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send({ error: "Failed to log in" });
  }
});

// Create an endpoint at ip/auth for registering the user & sending auth-token
app.post("/signup", async (req, res) => {
  console.log("Sign Up");
  let success = false;
  try {
    let check = await Users.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({
        success: success,
        errors: "existing user found with this email",
      });
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }
    const user = new Users({
      name: req.body.username,
      email: req.body.email,
      password: req.body.password,
      cartData: cart,
    });
    await user.save();
    const data = {
      user: {
        id: user.id,
      },
    };

    const token = jwt.sign(data, "secret_ecom");
    success = true;
    res.json({ success, token });
  } catch (error) {
    console.error("Error signing up:", error);
    res.status(500).send({ error: "Failed to sign up" });
  }
});

// Endpoint for getting all products data
app.get("/allproducts", async (req, res) => {
  try {
    let products = await Product.find({});
    console.log("All Products");
    res.send(products);
  } catch (error) {
    console.error("Error fetching all products:", error);
    res.status(500).send({ error: "Failed to fetch all products" });
  }
});

// Endpoint for getting latest products data
app.get("/newcollection", async (req, res) => {
  try {
    let products = await Product.find({});
    let arr = products.slice(0).slice(-8);
    console.log("New Collections");
    res.send(arr);
  } catch (error) {
    console.error("Error fetching new collections:", error);
    res.status(500).send({ error: "Failed to fetch new collections" });
  }
});

// Endpoint for getting women's products data
app.get("/popularinwomen", async (req, res) => {
  try {
    let products = await Product.find({ category: "women" });
    let arr = products.splice(0, 4);
    console.log("Popular In Women");
    res.send(arr);
  } catch (error) {
    console.error("Error fetching popular in women:", error);
    res.status(500).send({ error: "Failed to fetch popular in women." });
  }
});

// Endpoint for getting related products data
app.post("/relatedproducts", async (req, res) => {
  console.log("Related Products");
  try {
    const { category } = req.body;
    const products = await Product.find({ category });
    const arr = products.slice(0, 4);
    res.send(arr);
  } catch (error) {
    console.error("Error fetching related products:", error);
    res.status(500).send({ error: "Failed to fetch related products" });
  }
});

// Create an endpoint for saving the product in cart
app.post("/addtocart", fetchuser, async (req, res) => {
  console.log("Add Cart");
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate(
      { _id: req.user.id },
      { cartData: userData.cartData }
    );
    res.send("Added");
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).send({ error: "Failed to add to cart" });
  }
});

// Create an endpoint for removing the product in cart
app.post("/removefromcart", fetchuser, async (req, res) => {
  console.log("Remove Cart");
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] != 0) {
      userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate(
      { _id: req.user.id },
      { cartData: userData.cartData }
    );
    res.send("Removed");
  } catch (error) {
    console.error("Error removing from cart:", error);
    res.status(500).send({ error: "Failed to remove from cart" });
  }
});

// Create an endpoint for getting cart data of user
app.post("/getcart", fetchuser, async (req, res) => {
  console.log("Get Cart");
  try {
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
  } catch (error) {
    console.error("Error getting cart data:", error);
    res.status(500).send({ error: "Failed to get cart data" });
  }
});

// Create an endpoint for adding products using admin panel
app.post("/addproduct", async (req, res) => {
  try {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
      let last_product_array = products.slice(-1);
      let last_product = last_product_array[0];
      id = last_product.id + 1;
    } else {
      id = 1;
    }
    const product = new Product({
      id: id,
      name: req.body.name,
      description: req.body.description,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price,
      available: true,
    });
    await product.save();
    res.send("Added");
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send({ error: "Failed to add product" });
  }
});

// Create an endpoint for deleting product using admin panel
app.post("/deleteproduct", async (req, res) => {
  try {
    await Product.deleteOne({ id: req.body.id });
    res.send("Deleted");
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).send({ error: "Failed to delete product" });
  }
});

// Connect with Database
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });

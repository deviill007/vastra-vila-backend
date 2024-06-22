require("dotenv").config();
const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");

app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://vastra-vila.onrender.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//database
mongoose.connect(
  "mongodb+srv://8kavyasharma:GzLPxgXBDOKU7XLj@cluster0.bdmiftz.mongodb.net/VastraVila?retryWrites=true&w=majority&appName=Cluster0"
);

app.listen(port, (error) => {
  if (!error) {
    console.log("Server Running on Port " + port);
  } else {
    console.log("Error " + error);
  }
});

//API Creation
app.get("/", (req, res) => {
  res.send("Express App is running");
});

//Image Storage
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

//Upload Endpoint for images
app.use("/images", express.static("upload/images"));
app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `https://vastra-vila.onrender.com/${port}/images/${req.file.filename}`,
  });
});

//Product Schema
const Product = mongoose.model("ProductSchema", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

//Api for add products
app.post("/addproduct", async (req, res) => {
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
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  console.log(product);
  await product.save();
  console.log("Product Added");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//Remove Product API
app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({
    id: req.body.id,
  });
  console.log("Product Removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//Get All products
app.get("/allproducts", async (req, res) => {
  let allProducts = await Product.find({});
  console.log("All Products Fetched.");
  res.send(allProducts);
});

//User Model
const Users = mongoose.model("Users", {
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

//API for User login
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  // Validate request body
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      errors: "Username, email, and password are required.",
    });
  }

  try {
    // Check if user already exists
    let check = await Users.findOne({ email });
    if (check) {
      return res.status(400).json({
        success: false,
        errors: "Email already registered.",
      });
    }

    // Initialize cart data
    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }

    // Create new user
    const user = new Users({
      name: username,
      email,
      password,
      cartData: {},
    });

    await user.save();

    if (user) {
      const data = {
        user: {
          id: user.id,
        },
      };

      const token = jwt.sign(data, "secret_ecom");
      return res.json({ success: true, token });
    } else {
      console.error("Error saving user during signup");
      return res
        .status(500)
        .json({ success: false, errors: "Internal server error" });
    }
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error
      return res.status(400).json({
        success: false,
        errors: "Email already registered.",
      });
    } else {
      console.error("Error during user registration:", error);
      return res
        .status(500)
        .json({ success: false, errors: "Internal server error" });
    }
  }
});

app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({
        success: false,
        errors: "Password is invalid/incorrect.",
      });
    }
  } else {
    res.json({
      success: false,
      errors: "Email not registered, Please Sign up.",
    });
  }
});

//API for new collection data
app.get("/newcollection", async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  res.send(newcollection);
});

//API for popular in women category
app.get("/popularinwomen", async (req, res) => {
  let products = await Product.find({ category: "women" });
  let popularinwomen = products.slice(0, 4);
  res.send(popularinwomen);
});

//Middleware for fetching user
const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({ errors: "Please authenticate using valid token." });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res
        .status(401)
        .send({ errors: "Please authenticate using a valid token" });
    }
  }
};

//API for Cart Data
app.post("/addtocart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findByIdAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Added");
});

//API for removing cart data
app.post("/removefromcart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;

  await Users.findByIdAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.send("Removed");
});

//Retrive Cart data
app.post("/getcart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

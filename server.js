require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded images

// MongoDB Connection
mongoose.connect("process.env.MONGO_URI");

// Models
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
});
const User = mongoose.model("User", UserSchema);


const Product = mongoose.model("Product", new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image: String,
}));

const Cart = mongoose.model("Cart", new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1 },
  }));

  const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    image: String, 
  });
  
  const Billing = mongoose.model("Billing", new mongoose.Schema({
    firstName: String,
    lastName: String,
    companyName: String,
    country: String,
    streetAddress: String,
    apartment: String,
    city: String,
    state: String,
    pinCode: String,
    phone: String,
    email: String,
    additionalInfo: String,
    paymentMethod: String,
    cardNumber: String,
    expiryDate: String,
    cvc: String,
    totalAmount: Number,
    orderDate: { type: Date, default: Date.now }
  }));


  const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
  });

  const Contact = mongoose.model("Contact", contactSchema);


// Multer Storage (Image Upload)
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });


// ✅ Add Product
app.post("/api/admin/products", upload.single("image"), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : "";

    const product = new Product({ name, price, description, image });
    await product.save();

    res.json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Error adding product" });
  }
});





const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "sharmaanmol3585@gmail.com",
    pass:"daqo jsoo fcnq qwon",
  },
});

// API Route to Handle Contact Form Submission
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Save Data to MongoDB
    const newContact = new Contact({ name, email, subject, message });
    await newContact.save();

    // Send Email Notification
    const mailOptions = {
      from: "sharmaanmol3585@gmail.com",
      to: email,
      subject: "Contact Form Submission Received",
      text: `Hello ${name},\n\nThank you for reaching out!\n\nWe received your message:\n"${message}"\n\nOur team will get back to you soon.\n\nBest Regards,\nYour Company`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Message sent and saved successfully!" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ✅ Get Products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error fetching products" });
  }
});

//api/get/product
// Get Products with Search Query (by name)
app.get("/api/admin/products", async (req, res) => {
  try {
    const { search } = req.query; // Get search query from request
    let products;

    if (search) {
      // Use a regular expression to search by product name (case-insensitive)
      const regex = new RegExp(search, "i");
      products = await Product.find({ name: { $regex: regex } });
    } else {
      // If no search query is provided, fetch all products
      products = await Product.find();
    }

    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Error fetching products" });
  }
});
app.get("/api/cart", async (req, res) => {
    try {
      const cartItems = await Cart.find().populate("productId");
      let totalPrice = 0;
      cartItems.forEach(item => {
        totalPrice += item.productId.price * item.quantity;
      });
  
      res.json({ cartItems, totalPrice });
    } catch (error) {
      res.status(500).json({ error: "Error fetching cart items" });
    }
  });
  app.post("/api/cart/add", async (req, res) => {
    try {
      const { productId } = req.body;
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ error: "Product not found" });
  
      let cartItem = await Cart.findOne({ productId });
      if (cartItem) {
        cartItem.quantity += 1; // Increase quantity if product already in cart
      } else {
        cartItem = new Cart({ productId, quantity: 1 });
      }
  
      await cartItem.save();
      res.json({ message: "Added to cart", cartItem });
    } catch (error) {
      res.status(500).json({ error: "Error adding product to cart" });
    }
  });
  app.put("/api/cart/increase/:id", async (req, res) => {
    try {
      const cartItem = await Cart.findById(req.params.id).populate("productId");
      if (!cartItem) return res.status(404).json({ error: "Item not found" });
  
      cartItem.quantity += 1;
      await cartItem.save();
  
      res.json(cartItem);
    } catch (error) {
      res.status(500).json({ error: "Error updating quantity" });
    }
  });
  app.put("/api/cart/decrease/:id", async (req, res) => {
    try {
      const cartItem = await Cart.findById(req.params.id).populate("productId");
      if (!cartItem) return res.status(404).json({ error: "Item not found" });
  
      if (cartItem.quantity > 1) {
        cartItem.quantity -= 1;
        await cartItem.save();
        res.json(cartItem);
      } else {
        await cartItem.remove();
        res.json({ message: "Item removed from cart" });
      }
    } catch (error) {
      res.status(500).json({ error: "Error updating quantity" });
    }
  });
  app.delete("/api/cart/remove/:id", async (req, res) => {
    try {
      await Cart.findByIdAndDelete(req.params.id);
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      res.status(500).json({ error: "Error removing item from cart" });
    }
  });
  app.post("/api/order/place", async (req, res) => {
    try {
      await Cart.deleteMany();
      res.json({ message: "Order placed successfully" });
    } catch (error) {
      res.status(500).json({ error: "Error placing order" });
    }
  });
app.post("/api/order/confirm", async (req, res) => {
  try {
    const newBilling = new Billing(req.body);
    await newBilling.save();
    res.json({ message: "Order placed successfully", billingData: newBilling });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ error: "Error placing order" });
  }
});
app.get("/api/admin/billing", async (req, res) => {
  try {
    const orders = await Billing.find().sort({ orderDate: -1 });
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Failed to retrieve orders" });
  }
});
app.delete("/admin/products/:id", async (req, res) => {
  try {
      console.log("Delete request received for ID:", req.params.id); // Debugging

      const product = await Product.findByIdAndDelete(req.params.id);
      
      if (!product) {
          return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product deleted successfully" });
  } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Error deleting product", error });
  }
});
app.put("/admin/products/:id", async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,  
      { new: true }
    );
    if (!updatedProduct) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Error updating product" });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));

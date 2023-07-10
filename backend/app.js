const express = require("express");
const ErrorHandler = require("./Middleware/error");
const app = express();
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use("/", express.static("uploads"));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));


// config
if (process.env.NODE_ENV !== "PRODUCTION") {
    require("dotenv").config({
      path: "backend/config/.env",
    });
  }


//import routes
const user = require('./Controller/user')
const shop = require('./Controller/shop')
const product = require('./Controller/product')
const event = require('./Controller/event')
const coupon = require('./Controller/coupounCode')
const payment = require('./Controller/payment')
const order = require('./Controller/order')
const conversation = require('./Controller/conversation')
const message = require('./Controller/messages')



app.use("/api/v2/user", user)
app.use("/api/v2/shop", shop)
app.use("/api/v2/product", product)
app.use("/api/v2/event", event)
app.use("/api/v2/coupon", coupon)
app.use("/api/v2/payment", payment)
app.use("/api/v2/order", order)
app.use("/api/v2/conversation", conversation)
app.use("/api/v2/message", message)


// it's for ErrorHandling
app.use(ErrorHandler);

module.exports = app
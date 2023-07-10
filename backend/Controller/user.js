// import required modules and middleware
const express = require("express");
const path = require("path");
const User = require("../Model/User");
const router = express.Router();
const { upload } = require("../multer");
const fs = require("fs");
const ErrorHandler = require("../Utils/ErrorHandler");
const catchAsyncErrors = require("../Middleware/catchAsynError");
const jwt = require("jsonwebtoken");
const sendMail = require("../Utils/sendMail");
const sendToken = require("../Utils/jwtToken");
const { isAuthenticated } = require("../Middleware/auth");
const catchAsynError = require("../Middleware/catchAsynError");

// handle user creation route
router.post("/create-user", upload.single("file"), async (req, res, next) => {
  try {
    // get user data from request body
    const { name, email, password } = req.body;

    // check if user with the same email already exists
    const userEmail = await User.findOne({ email });
    if (userEmail) {
      // delete the uploaded file since user already exists
      const filename = req.file.filename;
      const filePath = `uploads/${filename}`;
      fs.unlink(filePath, (err) => {
        if (err) {
          console.log(err);
          res.status(500).json({ message: "Error deleting file" });
        }
      });
      // return an error if user already exists
      return next(new ErrorHandler("User already exists", 400));
    }

    // save uploaded file
    const filename = req.file.filename;
    const fileUrl = path.join(filename);

    // create user object
    const user = {
      name: name,
      email: email,
      password: password,
      avatar: fileUrl,
    }

    // create activation token for new user
    const activationToken = createActivationToken(user);

    // create activation URL to send to user's email
    const activationUrl = `http://localhost:3000/activation/${activationToken}`;

    // send activation email to user's email
    try {
      await sendMail({
        email: user.email,
        subject: "Activate your account",
        message: `Hello ${user.name}, please click on the link to activate your account: ${activationUrl}`,
      });
      // return success message if email is sent successfully
      res.status(201).json({
        success: true,
        message: `please check your email:- ${user.email} to activate your account!`,
      });
    } catch (error) {
      // return an error if email sending fails
      return next(new ErrorHandler(error.message, 500));
    }
  } catch (error) {
    // return an error if user creation fails
    return next(new ErrorHandler(error.message, 400));
  }
});

// create activation token for new user
const createActivationToken = (user) => {
  return jwt.sign(user, process.env.ACTIVATION_SECRET, {
    expiresIn: "5m",
  });
};

// handle user activation route
router.post(
  "/activation",
  catchAsyncErrors(async (req, res, next) => {
    try {
      // get activation token from request body
      const { activation_token } = req.body;

      // verify activation token
      const newUser = jwt.verify(
        activation_token,
        process.env.ACTIVATION_SECRET
      );

      // return an error if token is invalid
      if (!newUser) {
        return next(new ErrorHandler("Invalid token", 400));
      }
      // extract user data from token
      const { name, email, password, avatar } = newUser;

      // check if user with the same email already exists

      if (user) {
        return next(new ErrorHandler("User already exists", 400));
      }
      user = await User.create({
        name,
        email,
        avatar,
        password,
      });

      sendToken(user, 201, res);
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// login the user

router.post('/login-user', catchAsynError(async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ErrorHandler("Please provide the all fields!", 400));
    }

    const user = await User.findOne({ email }).select("+password")

    if (!user) {
      return next(new ErrorHandler("User doesn't exists!", 400));
    }

    const isPasswordValid = await user.comparePassword(password)

    if (!isPasswordValid) {
      return next(
        new ErrorHandler("Please provide the correct information", 400)
      );
    }

    sendToken(user, 201, res);

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));

  }
}))



// load user
router.get(
  "/getuser",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      if (!user) {
        return next(new ErrorHandler("User doesn't exists", 400));
      }

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);



// logout  
router.get('/logout' , isAuthenticated , catchAsyncErrors(async(req, res, next)=>{
  try {
    res.cookie("token", null ,{
      expiresIn: new Date(Date.now()),
      httpOnly: true
    })

    res.status(201).json({
      success: true,
      message:" log out successfully"
    })
    
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}))

// update the user profile
router.put(
  "/update-user-info",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { email, password, phoneNumber, name } = req.body;

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return next(new ErrorHandler("User not found", 400));
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        return next(
          new ErrorHandler("Please provide the correct information", 400)
        );
      }

      user.name = name;
      user.email = email;
      user.phoneNumber = phoneNumber;

      await user.save();

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user avatar
router.put(
  "/update-avatar",
  isAuthenticated,
  upload.single("image"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const existsUser = await User.findById(req.user.id);

      const existAvatarPath = `uploads/${existsUser.avatar}`;

      fs.unlinkSync(existAvatarPath);

      const fileUrl = path.join(req.file.filename);

      const user = await User.findByIdAndUpdate(req.user.id, {
        avatar: fileUrl,
      });

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user addresses
router.put(
  "/update-user-addresses",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);

      const sameTypeAddress = user.addresses.find(
        (address) => address.addressType === req.body.addressType
      );
      if (sameTypeAddress) {
        return next(
          new ErrorHandler(`${req.body.addressType} address already exists`)
        );
      }

      const existsAddress = user.addresses.find(
        (address) => address._id === req.body._id
      );

      if (existsAddress) {
        Object.assign(existsAddress, req.body);
      } else {
        // add the new address to the array
        user.addresses.push(req.body);
      }

      await user.save();

      res.status(200).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// delete user address
router.delete(
  "/delete-user-address/:id",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const userId = req.user._id;
      const addressId = req.params.id;

      console.log(addressId);

      await User.updateOne(
        {
          _id: userId,
        },
        { $pull: { addresses: { _id: addressId } } }
      );

      const user = await User.findById(userId);

      res.status(200).json({ success: true, user });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// update user password
router.put(
  "/update-user-password",
  isAuthenticated,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id).select("+password");

      const isPasswordMatched = await user.comparePassword(
        req.body.oldPassword
      );

      if (!isPasswordMatched) {
        return next(new ErrorHandler("Old password is incorrect!", 400));
      }

      if (req.body.newPassword !== req.body.confirmPassword) {
        return next(
          new ErrorHandler("Password doesn't matched with each other!", 400)
        );
      }
      user.password = req.body.newPassword;

      await user.save();

      res.status(200).json({
        success: true,
        message: "Password updated successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// find user infoormation with the userId
router.get(
  "/user-info/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      res.status(201).json({
        success: true,
        user,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

module.exports = router;

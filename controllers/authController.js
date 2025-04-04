const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const verifyCaptcha = require("../utils/recaptchaVerifier");
const User = require("../models/userModel");
const ErrorHandler = require("../utils/errorHandler");
const sendToken = require("../utils/jwtToken");
const { sendEmail } = require("../utils/sendEmail");
const crypto = require("crypto");

exports.checkAuth = catchAsyncErrors(async (req, res, next) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.sendStatus(401);
  }
});

exports.createUser = catchAsyncErrors(async (req, res, next) => {
  // const captchaResult = await verifyCaptcha(req.body.recaptchaToken);
  // if (!captchaResult) {
  //   return next(new ErrorHandler("Something went wrong Please try again", 401));
  // }

  const { referralCode } = req?.body || {};

  let referralId = null;

  if (referralCode) {
    const parentUser = await User.findOne({ username: referralCode });

    if (parentUser) referralId = parentUser?._id || parentUser?.id;
  }

  const user = new User(req.body);

  user.referralId = referralId;

  const saved = await user.save();

  res.json({ success: true, message: "User Created", data: saved });
});

exports.signin = catchAsyncErrors(async (req, res, next) => {
  const { password, email, recaptchaToken } = req.body;
  /* const captchaResult = await verifyCaptcha(recaptchaToken);
  if (!captchaResult) {
    return next(new ErrorHandler("Something went wrong Please try again", 401));
  } */
  if (!email || !password) {
    return next(
      new ErrorHandler("Please enter email or username and password", 400)
    );
  }
  const user = await User.findOne({
    $or: [{ email: email }, { username: email }],
  }).select("+password");
  if (!user) {
    return next(new ErrorHandler("Invalid Credientials", 401));
  }
  const isPasswordMateched = await user.comparePassword(password);
  if (!isPasswordMateched) {
    return next(new ErrorHandler("Invalid Credientials", 401));
  }
  sendToken(user, 200, res);
});

exports.signout = catchAsyncErrors(async (req, res, next) => {
  // res.cookie("token", null, {
  //   expires: new Date(Date.now()),
  //   httpOnly: true,
  // });
  res.json({
    success: true,
    message: "Signed Out Successfully",
  });
});

exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
  // const captchaResult = await verifyCaptcha(req.body.recaptchaToken);
  // if (!captchaResult) {
  //   return next(new ErrorHandler("Something went wrong Please try again", 401));
  // }
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ErrorHandler("user not found", 404));
  }
  const resetToken = user.setResetPasswordToken();
  const resetPasswordUrl = `${req.protocol}://${req.get(
    "host"
  )}/auth/password/reset/${resetToken}`;
  await user.save({ validateBeforeSave: false });
  try {
    await sendEmail({
      email: user.email,
      subject: "Forgot Password",
      message: resetPasswordUrl,
    });
    res.json({
      success: true,
      message: "SUCCESS",
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  // const captchaResult = await verifyCaptcha(req.body.recaptchaToken);
  // if (!captchaResult) {
  //   return next(new ErrorHandler("Something went wrong Please try again", 401));
  // }
  const { password, confirmPassword } = req.body;
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });
  if (!user) {
    return next(
      new ErrorHandler(
        "reset password  token is invalid or has been expired",
        400
      )
    );
  }
  if (password !== confirmPassword) {
    new ErrorHandler("password does not match with confirm password", 400);
  }
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  res.json({
    success: true,
    message: "Reset Password Successfully",
  });
});

exports.changePassword = catchAsyncErrors(async (req, res, next) => {
  const { id } = req?.user || {};
  const { oldPassword, password } = req.body || {};

  const user = await User.findById(id).select("+password");

  if (!user) {
    return next(
      new ErrorHandler(
        "User not found for not logged In. Please login and try again.",
        400
      )
    );
  }

  const isMatched = await user.comparePassword(oldPassword);

  if (!isMatched) {
    return next(
      new ErrorHandler("Please enter correct old password and try again.", 400)
    );
  }

  user.password = password;
  await user.save();

  res.json({
    success: true,
    message: "Password Changed Successfully",
  });
});

exports.checkDataExist = catchAsyncErrors(async (req, res, next) => {
  const { username, email, mobileNo, countryCode, recaptchaToken } =
    req.body || {};
  // const captchaResult = await verifyCaptcha(recaptchaToken);
  // if (!captchaResult) {
  //   return next(new ErrorHandler("Something went wrong Please try again", 401));
  // }

  const emailExist = await User.findOne({ email });

  if (emailExist) {
    return next(
      new ErrorHandler(
        "Email already exists. Please choose another to continue.",
        201
      )
    );
  }

  const usernameExist = await User.findOne({ username });

  if (usernameExist) {
    return next(
      new ErrorHandler(
        "Username already exists. Please choose another to continue.",
        201
      )
    );
  }

  const mobileNoExist = await User.findOne({
    $and: [{ countryCode }, { mobileNo }],
  });

  if (mobileNoExist) {
    return next(
      new ErrorHandler(
        "Phone number already exists. Please choose another to continue.",
        201
      )
    );
  }

  res.json({
    success: true,
  });
});

exports.usernameToName = catchAsyncErrors(async (req, res, next) => {
  const { username, recaptchaToken } = req.body || {};
  // const captchaResult = await verifyCaptcha(recaptchaToken);

  // if (!captchaResult) {
  //   return next(new ErrorHandler("Something went wrong Please try again", 401));
  // }

  if (!username) {
    return next(new ErrorHandler("Invalid data provided", 201));
  }

  const user = await User.findOne({ username });

  if (!user) return res.json({ success: false });

  return res.json({
    success: true,
    data: {
      firstName: user?.firstName,
      lastName: user?.lastName,
    },
  });
});

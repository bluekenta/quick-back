const sendToken = (user, statusCode, res) => {
  const token = user.getJWTToken();

  //option for cookie

  const options = {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  console.log(token, "1111111111111111111111111111111111111111");
  res
    .status(statusCode)
    // .cookie("token", token, options)
    .json({
      succes: true,
      user,
      token,
    });
};

module.exports = sendToken;

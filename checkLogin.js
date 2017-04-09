var jwt = require('jsonwebtoken');
var utils = require('./utils/utils');
// no login
function noLogin(req, res, next) {
    var cookie = req.headers.cookie;
    var cookies = {};
    console.log(cookie);
    if (req.headers.cookie) {
        cookieStr = cookie.split(";");
        console.log(cookies);
        for (var i = 0; i < cookieStr.length; i++) {
            temp = cookieStr[i].split("=");
            cookies[temp[0].trim()]=temp[1].trim();
        }
        console.log(cookies);
    }
    if (cookies.token && req.path.indexOf('/static')!==0) {
      // var cookies = req.headers.cookie;
      var decoded;
      try {
        // console.log(req.cookies);
        // console.log(req.cookies.token);
        secret = "1234";
        decoded = jwt.verify(cookies.token, secret);

        // parameter for all view pages
        //res.locals.name = decoded.name;
        // console.log(decoded);
        req.decodedToken = decoded;
        var expire = req.decodedToken.exp;
        if (new Date().getTime() > expire*1000-utils.TOKEN_EXTEND_DISTANCE_TO_EXPIRE_IN_MILLISECONDS) {
          utils.setTokenCookie(decoded, res);
        }
      } catch(err) {
        console.log(err);
      }
    }
    if (!req.session.user) {
        // console.log("抱歉，你还没有登录！");
        return res.redirect('/login');
    }
    next();
}

// login
function login(req, res, next) {
    // console.log(req.cookies);

    if (req.session.user) {
        // console.log("抱歉，你已经登录！");
        return res.redirect('/');
    }
    next();
}

exports.noLogin = noLogin;
exports.login = login;
//加载依赖库
var express = require('express');
var path = require('path');
var bodyPaser = require('body-parser');
var crypto = require('crypto');
var session = require('express-session');
var moment = require('moment');

// 7天免验证token
var expressJwt = require('express-jwt');
var jwt = require('jsonwebtoken');

var utils = require('./utils/utils');

//nologin check
var checkLogin = require('./checkLogin.js');

// mongoose
var mongoose = require('mongoose');

// models
var models = require('./models/models');

var User = models.User;
var Note = models.Note;

// connect mongo
mongoose.connect('mongodb://localhost:27017/notes');
mongoose.connection.on('error', console.error.bind(console, "connect monogdb error"));

//创建express实例
var app = express();

//定义ejs模版引擎和模版文件位置
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//定义静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

//定义数据解析器
app.use(bodyPaser.json());
app.use(bodyPaser.urlencoded({extended: true}));

// 建立session模型
app.use(session({
    secret: '1234',
    name: 'mynote',
    cookie: {maxAge: 1000 * 60 * 20}, // 设置保存时间为20分钟
    resave: false,
    saveUninitialized: true
}));

//相应首页请求
app.get('/', checkLogin.noLogin);
app.get('/', function(req, res) {
    // if (req.session.user == null) {
    //     return res.redirect('/login');
    // }
    Note.find({author: req.session.user.username})
        .exec(function(err, allNotes) {
            if (err) {
                console.log(err);
                return res.redirect('/');
            }
            res.render('index', {
                title: '首页',
                user: req.session.user,
                notes: allNotes
            });
        })

});

app.get('/register', checkLogin.login);
app.get('/register', function(req, res) {
    res.render('register', {
        user: req.session.user,
        title: '注册',
        message: ''
    });
});

app.get('/register', checkLogin.login);
app.post('/register', function(req, res) {
    //eq.body 可以获取到表单的每项数据
    var username = req.body.username;
    var password = req.body.password;
    var passwordRepeat = req.body.passwordRepeat;

    if (username.trim().length < 3 || username.trim().length > 20) {
        // console.log("用户长度为3-20个字符");
        return res.render('register',{
            user: req.session.user,
            title: '注册',
            message: '用户长度为3-20个字符'
        });
    }

    var reg = /^[a-zA-Z0-9]+$/;
    var usernameRes = reg.test(username);
    if (!usernameRes) {
        // console.log("用户名只能是字母、数字、下划线的组合");
        return res.render('register',{
            user: req.session.user,
            title: '注册',
            message: '用户名只能是字母、数字、下划线的组合!'
        });
    }

    if (password.trim().length == 0 || passwordRepeat.trim().length == 0) {
        // console.log("密码不允许为空！");
        return res.render('register',{
            user: req.session.user,
            title: '注册',
            message: '密码不允许为空!'
        });
    }

    if (password.trim().length < 6 || passwordRepeat.trim().length < 6) {
        // console.log("密码长度至少为6位");
        return res.render('register',{
            user: req.session.user,
            title: '注册',
            message: '密码长度至少为6位!'
        });
    }

    if (password.trim() != passwordRepeat.trim()) {
        // console.log("两次密码输入不同");
        return res.render('register',{
            user: req.session.user,
            title: '注册',
            message: '两次密码输入不同!'
        });
    }
    

    var azreg = /[a-z]+/;
    var AZreg = /[A-Z]+/;
    var numberreg = /[0-9]+/;
    if (!(azreg.test(password) && AZreg.test(password) && numberreg.test(password))) {
        // console.log("密码必须同时包含数字、小写字母、大写字母");
        return res.render('register',{
            user: req.session.user,
            title: '注册',
            message: '密码必须同时包含数字、小写字母、大写字母!'
        });
    }

    

    // 检查用户名是否已经存在，不存在，则保存该记录
    User.findOne({username:username}, function(err, user) {
        if (err) {
            // console.log(err);
            return res.render('register',{
                user: req.session.user,
                title: '注册',
                message: '服务异常！'
            });
        }
        if (user) {
            // console.log('user name is exist');
            return res.render('register',{
                user: req.session.user,
                title: '注册',
                message: '用户名已存在！'
            });
        }

        // 对密码进行md5加密
        var md5 = crypto.createHash('md5'),
            md5password = md5.update(password).digest('hex');

        // 新建user对象用于保存数据
        var newUser = new User({
            username: username,
            password: md5password
        });
        newUser.save(function(err, doc){
            if (err) {
                // console.log(err);
                return res.redirect('/register');
            }
            // console.log('register success');
            return res.redirect('/');
        });

    });

});

app.get('/login', checkLogin.login);
app.get('/login', function(req, res) {
    res.render('login', {
        user: req.session.user,
        title: '登录',
        message: ''
    });
});

app.get('/login', checkLogin.login);
app.post('/login', function(req, res) {
    //eq.body 可以获取到表单的每项数据
    var username = req.body.username;
    var password = req.body.password;

    if (username.trim().length == 0) {
        // console.log("username is empty");
        return res.render('login', {
            user: req.session.user,
            title: '登录',
            message: '用户名不能为空！'
        });
    }

    if (password.trim().length == 0) {
        console.log("password is empty");
        return res.render('login', {
            user: req.session.user,
            title: '登录',
            message: '密码不能为空！'
        });
    }


    // 检查用户名是否已经存在，不存在，则保存该记录
    User.findOne({username:username}, function(err, user) {
        if (err) {
            // console.log(err);
            return res.render('login', {
                user: req.session.user,
                title: '登录',
                message: '服务异常'
            });
        }
        if (!user) {
            console.log('user name is not exist');
            return res.render('login', {
                user: req.session.user,
                title: '登录',
                message: '用户不存在！'
            });
        }

        // 对密码进行md5加密
        var md5 = crypto.createHash('md5'),
            md5password = md5.update(password).digest('hex');

        if (user.password !== md5password) {
            console.log("password is not correct");
            return res.render('login', {
                user: req.session.user,
                title: '登录',
                message: '密码不对！'
            });
        }
        console.log('login success');

        user.password = null;
        delete user.password;
        req.session.user = user;

        var profile = {
            id: user._id,
            email: user.email,
            name: user.username
        };
        utils.setTokenCookie(profile, res);
        return res.redirect('/');

    });

});


app.get('/quit', function(req, res) {
    req.session.user = null;
    return res.redirect('/login');
});

app.get('/post', checkLogin.noLogin);
app.get('/post', function(req, res) {
    res.render('post', {
        user: req.session.user,
        title: 'post'
    });
});

app.get('/post', checkLogin.noLogin);
app.post('/post', function(req, res) {
    var note = new Note({
        title: req.body.title,
        author: req.session.user.username,
        tag: req.body.tag,
        content: req.body.content
    });

    note.save(function(err, doc) {
        if (err) {
            // console.log(err);
            return res.redirect('/post');
        }
        console.log('文章发表成功');
        return res.redirect('/');
    });
});

app.get('/detail/:_id', checkLogin.noLogin);
app.get('/detail/:_id', function(req, res) {
    console.log("look note");
    Note.findOne({_id: req.params._id})
        .exec(function(err, art) {
            if (err) {
                // console.log(err);
                return res.redirect('/');
            }
            if (art) {
                res.render('detail', {
                    title: "笔记详情",
                    user: req.session.user,
                    art: art,
                    moment: moment
                });
            }
        });
});

//监听3000端口
app.listen(3000, function(req, res) {
    console.log('app is running at port 3000');
});


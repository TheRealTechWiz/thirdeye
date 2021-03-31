var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var session = require('express-session');                         //passport
var passport = require('passport');                               //passport
var passportLocalMongoose = require('passport-local-mongoose');   //passport
var LocalStrategy = require('passport-local');
var methodOverride = require('method-override');
var flash = require('connect-flash');
const tf = require('@tensorflow/tfjs-node')
const faceapi = require('@vladmandic/face-api');
var canvas = require('canvas');
const LabeledDescriptions = [];
let faceMatcher;

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })


async function createMatcher() {
    await faceapi.nets.faceRecognitionNet.loadFromDisk('./views/models')
    await faceapi.nets.faceLandmark68Net.loadFromDisk('./views/models')
    await faceapi.nets.ssdMobilenetv1.loadFromDisk('./views/models')

    // for (let i = 1; i < 4; i++) {
    //     const img = await canvas.loadImage(`./labeled_images/${i}.jpg`);
    //     const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
    //     descriptions.push(detections.descriptor)
    // }

    const testFolder = './labeled_images/';
    const fs = require('fs');
    let filesArr = fs.readdirSync(testFolder);
     for (let i = 0; i < filesArr.length; ++i) {
        //  console.log(testFolder+filesArr[i]);
            let descriptions = [];
            const img = await canvas.loadImage(testFolder+filesArr[i]);
            const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
            descriptions.push(detections.descriptor)
            LabeledDescriptions.push(new faceapi.LabeledFaceDescriptors(filesArr[i].slice(0,-4),descriptions))
        }
    faceMatcher = new faceapi.FaceMatcher(LabeledDescriptions, 0.6)
    console.log(faceMatcher);
}

app.set("view engine", "ejs");
app.use(express.static(__dirname + '/views'));

app.use(session({                               //passport express-session
    secret: "This the secret line",              //passport express-session
    resave: false,                               //passport express-session
    saveUninitialized: false                     //passport express-session
}));                                            //passport express-session
app.use(passport.initialize());                 //passport
app.use(passport.session());                    //passport
app.use(methodOverride('_method'));
app.use(flash());

// mongoose.connect("mongodb://localhost:27017/face_recognition", { useNewUrlParser: true, useUniJfiedTopology: true });
mongoose.connect("mongodb+srv://admin:019s9pQgbH7WX40Z@cluster0-byaob.mongodb.net/face_recognition", { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set('useFindAndModify', false);

//==================MongooseSchemasAndModels=======================
// var userSchema = new mongoose.Schema({ username: String, password: String });
var userSchema = new mongoose.Schema({ 
    username:{ type: String, required: true}, 
    password:{ type: String},
    absent:{type: Boolean, default: true},
    validated:{type: Boolean, default: true},
    phone:{type: String, default:"+919999999999"}
});
userSchema.plugin(passportLocalMongoose);           //passport
var User = mongoose.model("User", userSchema);
//==================///MongooseSchemasAndModels=====================


passport.use(new LocalStrategy(User.authenticate())); //passport colt
//passport.use(User.createStrategy());                //passport passport-local-mongoose angela
passport.serializeUser(User.serializeUser());       //passport passport-local-mongoose
passport.deserializeUser(User.deserializeUser());   //passport passport-local-mongoose

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

//========================Auth============================

app.get("/register", function (req, res) {
    res.render('register');
});

app.post("/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            req.flash('error', err.message);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                req.flash('success', 'Welcome ' + user.username);
                res.redirect("/dashboard");
            });
        }
    });

});

app.post("/api/register", function (req, res) {
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) return res.status(500).json({ "result": err });
        else return res.status(200).json({ "result": "ok","user":user });
    });
});


app.get("/login", function (req, res) {
    res.render('login');
});

app.post("/login", passport.authenticate("local", { successRedirect: "/dashboard", failureRedirect: "/" }), function (req, res) { });

app.post('/api/login', passport.authenticate('local'), function (req, res) {
    return res.status(200).json({ "result": "ok","user":req.user});
});

app.get("/logout", function (req, res) {
    req.logout();
    req.flash('success', 'Successfuly Logged Out');
    res.redirect('/');
});

//=================///Auth===============


//=================FaceRecognitionAPI=============

app.post("/api/img", async function (req, res) {
    const img = await canvas.loadImage(req.body.img);
    const username = req.body.username.toUpperCase();
    // console.log("username",username);
    // console.log("img",img);
    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor()
    if (detections == undefined || detections.length == 0) {
        presentAndNotValidate(username,"");
        return res.status(500).json({ "result": "error","detection":"face not clear. Try Again" });
    }
    else {
        // return res.status(200).json({ "result": "ok", "detection": "face detected" });
      const result = faceMatcher.findBestMatch(detections.descriptor)
      if (result.label == "unknown") {
      presentAndNotValidate(username,result.label);
      return res.status(401).json({ "result": "error", "detection": "Someone Else" }); 
      }
      else {
        if(result.label==username){ 
            presentAndValidate(username)
            return res.status(200).json({ "result": "ok", "detection": result.label });
        }
        else {
            presentAndNotValidate(username,result.label); 
            return res.status(403).json({ "result": "error", "detection": "Name not verified" });
        }
      }
    }
});
function presentAndNotValidate(uname,detected_name){
    console.log("NotValidate","given name:",uname, "detected name",detected_name);
    User.findOneAndUpdate({ username:uname}, {absent:false, validated:false},(err,res)=>{if(err)console.log(err)});
}
function presentAndValidate(uname){
    console.log("Validate","given name:",uname)
    User.findOneAndUpdate({username:uname}, {absent:false, validated:true},(err,res)=>{if(err)console.log(err)});
}
//==============///FaceRecognitionAPI=============
//=================StatusChangeAPI================

app.post("/api/statusChange",function(req,res){
    console.log(typeof(req.body.valid),req.body.valid)
    if(req.body.valid) presentAndValidate(req.body.username);
    else presentAndNotValidate(req.body.username,"");
    return res.status(200).json({ "result": "ok"});

});

//==============///StatusChangeAPI================

//=================AllUsersAPI====================

app.post("/api/allUsers", function (req, res) {
    User.find({}, function (err, allUsers) {
        if (err) { return res.status(403).json({ "result": "error", "error": err.message });}
        else { return res.status(200).json({ "result": "ok", "users": allUsers });}
    });
});

//=============///AllUsersAPI=====================

//================UserExistsAPI===================

// app.post("/api/userExists",(req,res)=>{
//     User.find({username:req.body.username}, function (err, User) {
//         if (err) { return res.status(403).json({ "result": "error", "error": err.message });}
//         else { 
//             if(User.length==0)
//             return res.status(403).json({ "result": "false", "user": User });
//             else
//             return res.status(200).json({ "result": "true", "user": User });
//         }
//     });
// });

//=============///UserExistAPI====================
app.get("/", isLoggedIn, function (req, res) {
    res.render('face')
});
app.get("/dashboard", isLoggedIn, function (req, res) {
    res.render('dashboard')
});

app.get("/all-students", isLoggedIn, function (req, res) {
      User.find({}, function (err, users) {
        if (err) 
        res.render('all-dashboard-cards', {data:[]});
        else  
        res.render('all-dashboard-cards', {data:users});
    });
    // res.render('all-dashboard-cards', {
    //     data: 
        // [
        //     { name: 'Tarun Jain', image: 'avatar.png', phone: '+917009950116' }, { name: 'Pratham Goyal', image: 'avatar.png', phone: '+919988034040' }, { name: 'Rajat Mittal', image: 'avatar.png', phone: '+919041950023' }, { name: 'Etendra Verma', image: 'avatar.png', phone: '+918601062439' }, { name: 'John Doe', image: 'avatar.png', phone: '+919999999999' }
        // ]
    // }
    // )
});

app.get("/submitted", isLoggedIn, function (req, res) {
    User.find({validated :true, absent: false}, function (err, users) {
        if (err) 
        res.render('all-dashboard-cards', {data:[]});
        else  
        res.render('all-dashboard-cards', {data:users});
    });
    // res.render('all-dashboard-cards', {
    //     data: [
    //         { name: 'Tarun Jain', image: 'avatar.png', phone: '+917009950116' }, { name: 'Pratham Goyal', image: 'avatar.png', phone: '+919988034040' }
    //     ]
    // }
    // )
});

app.get("/verification-failed", isLoggedIn, function (req, res) {
    User.find({validated :false, absent: false}, function (err, users) {
        if (err) 
        res.render('all-dashboard-cards', {data:[]});
        else  
        res.render('all-dashboard-cards', {data:users});
    });
    
    // res.render('all-dashboard-cards', {
    //     data: [
    //         // {name:'Rajat Mittal',image:'avatar.png',phone:'+919041950023'}
    //     ]
    // }
    // )
});

app.get("/absentees", isLoggedIn, function (req, res) {
    User.find({absent: true}, function (err, users) {
        if (err) 
        res.render('all-dashboard-cards', {data:[]});
        else  
        res.render('all-dashboard-cards', {data:users});
    });

    // res.render('all-dashboard-cards', {
    //     data: [
    //         { name: 'Etendra Verma', image: 'avatar.png', phone: '+918601062439' }
    //     ]
    // }
    // )
});


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash('error', 'You must login first');
        res.redirect('/login');
    }
}

let port = process.env.PORT;
if (port == null || port == "") {
  port = 4000;
}

app.listen(port, function () {
    console.log("Listening at port 4000");
    createMatcher();
});
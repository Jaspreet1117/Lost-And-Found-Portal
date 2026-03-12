// const express=require('express');
// const app=express();
// app.set("view engine",'ejs');
// app.use(express.static("public"));
// app.use(express.urlencoded({extended:true}));
// app.get('/Welcome',(req,res)=>{
//     res.render("Welcome",{title:"Welcome Page"});
// })
// app.use((req, res) => {
//     res.status(404).render("pageNotFound",{title:"Page Not Found"});
// });


// app.listen(3000, ()=>{
//     console.log("server is running");
// })





/////////////////
// const express = require('express');
// const fs = require('fs');

// const app = express();

// app.set("view engine",'ejs');
// app.use(express.static("public"));
// app.use(express.urlencoded({extended:true}));

// // CORS FIX
// app.use((req,res,next)=>{
// res.setHeader("Access-Control-Allow-Origin","*");
// res.setHeader("Access-Control-Allow-Methods","GET,POST");
// next();
// });


// // SIGNUP
// app.get("/signup",(req,res)=>{

// let username = req.query.username;
// let password = req.query.pwd1;

// let data = JSON.parse(fs.readFileSync("data.json"));

// data.push({
// username:username,
// password:password
// });

// fs.writeFileSync("data.json",JSON.stringify(data,null,2));

// res.send("User Registered Successfully");

// });


// // LOGIN
// app.get("/login",(req,res)=>{

// let username = req.query.username;
// let password = req.query.pwd1;

// let data = JSON.parse(fs.readFileSync("data.json"));

// let found=false;

// for(let u of data){
// if(u.username==username && u.password==password){
// found=true;
// break;
// }
// }

// if(found){
// res.send("Login Successful");
// }
// else{
// res.send("Login Failed");
// }

// });


// // WELCOME PAGE (friend ka code)
// app.get('/Welcome',(req,res)=>{
//     res.render("Welcome",{title:"Welcome Page"});
// })


// // 404 PAGE
// app.use((req, res) => {
//     res.status(404).render("pageNotFound",{title:"Page Not Found"});
// });


// app.listen(3000, ()=>{
//     console.log("Server running on http://localhost:3000");
// });






/////////////////////////
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// CORS FIX
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST");
  next();
});


// HOME ROUTE
app.get("/", (req, res) => {
  res.redirect("/Welcome");
});


// WELCOME PAGE
app.get('/Welcome', (req, res) => {
  res.render("Welcome", { title: "Welcome Page" });
});


// LOGIN PAGE (HTML)
app.get("/loginPage", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});


// SIGNUP PAGE (HTML)
app.get("/signupPage", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signup.html"));
});


// SIGNUP LOGIC
app.get("/signup", (req, res) => {

  let username = req.query.username;
  let password = req.query.pwd1;

  let data = JSON.parse(fs.readFileSync("data.json"));

  data.push({
    username: username,
    password: password
  });

  fs.writeFileSync("data.json", JSON.stringify(data, null, 2));

  res.send("User Registered Successfully");

});


// LOGIN LOGIC
// app.get("/login", (req, res) => {

//   let username = req.query.username;
//   let password = req.query.pwd1;

//   let data = JSON.parse(fs.readFileSync("data.json"));

//   let found = false;

//   for (let u of data) {
//     if (u.username == username && u.password == password) {
//       found = true;
//       break;
//     }
//   }

//   if (found) {
//     res.redirect("/Welcome");
//   } else {
//     res.send("Login Failed");
//   }

// });

// LOGIN LOGIC
app.get("/login", (req, res) => {

  let username = req.query.username;
  let password = req.query.pwd1;

  let data = JSON.parse(fs.readFileSync("data.json"));

  let found = false;

  for (let u of data) {
    if (u.username == username && u.password == password) {
      found = true;
      break;
    }
  }

  if (found) {
    res.send("Login Successful");
  } else {
    res.send("Login Failed");
  }

});

// 404 PAGE
app.use((req, res) => {
  res.status(404).render("pageNotFound", { title: "Page Not Found" });
});


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
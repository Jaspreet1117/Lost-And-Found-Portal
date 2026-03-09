const express=require('express');
const app=express();
app.set("view engine",'ejs');
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.get('/Welcome',(req,res)=>{
    res.render("Welcome",{title:"Welcome Page"});
})
app.use((req, res) => {
    res.status(404).render("pageNotFound",{title:"Page Not Found"});
});


app.listen(3000, ()=>{
    console.log("server is running");
})
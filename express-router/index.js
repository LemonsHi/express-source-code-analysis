const express = require('express');
const app = express();
app.get('/user',function(req,res,next){
  console.log('user');
  next();
},function(req,res,next){
  console.log('next');
  next();
}).get('/world',function(req,res,next){
  console.log('world');
  next();
}).get('/hello',function(req,res,next){
  console.log('hello');
  res.end('ok');
});
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

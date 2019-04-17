var express = require('express');
const app = express();
app.use(function(req,res,next){
  console.log('Ware1:',Date.now());
  next();
});
app.get('/',function(req,res,next){
  console.log('get /');
  res.end('1');
});
const user = express.Router();
user.use(function(req,res,next){
  console.log('Ware2',Date.now());
  next();
});
user.use('/2',function(req,res,next){
  res.end('2');
  next();
});
app.use('/user',user);
app.use(function(err,req,res,next){
  res.end('catch '+err);
});
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

var express = require('express');
var app = express();

// app.use(function (req, res, next) {
//   res.send('use');
// });

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

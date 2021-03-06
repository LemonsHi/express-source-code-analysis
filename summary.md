# 2019-04-18 -- 2019-04-19

简单分析 express 源码，从 express 框架整体出发，分别针对 express 框架的两个阶段（注册阶段和执行阶段）详细分析。

## express 框架整体分析

express 框架可以分为两阶段：

1. 注册阶段：express 注册阶段，将需要执行的回调函数或者业务逻辑注册进 Router.stack 或者 Route.stack 数组中。
2. 执行阶段：express 执行阶段，循环遍历 Router.stack 和 Route.stack 数组，并按照匹配的路径执行回调函数或业务逻辑。

举个简单的例子：

```javascript
var express = require('express');
// 初始 express
var app = express();
// 注册阶段
app.get('/', function (req, res) {
  res.send('Hello World!');
});
// 执行阶段
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
```

简单解释上面的例子：express 首先通过 app.get() 将需要执行的业务逻辑注册进 Router.stack 中，然后通过 app.listen() 执行相匹配的业务逻辑。

### 1 express 框架的注册阶段

在 express 中可以将注册类型分为两类：route layer 对象和 middleware layer 对象。

#### 1.1 route layer

route layer 对象主要是通过 get、post 和 put 等方法所注册。注册过程如下源码所示。

```javascript
// express/router/index.js
proto.route = function route(path) {
  // ...
  // 实例化 layer 对象
  var layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  }, route.dispatch.bind(route));
  // layer 对象的 route 指向 route 对象
  layer.route = route;
  // 注册 route layer 对象
  // this 指代的是 Router 对象
  this.stack.push(layer);
  return route;
};
```

该代码主要有以下几个关键部分：

1. layer 对象的 route 是 route 对象
2. layer 对象的 handle 是 route.dispatch()

对于第 1 点，express 采用双数组的形式存储注册的 layer 对象，这种存储形式类似于一个菜单，Router.stack 为一级菜单，Route.stack 为二级菜单，一级与二级之间的联系便是这个 layer.route = route。

在解释第 2 点之前，可以看下下面这个例子：

```javascript
app.get('/user',function(req,res,next){
  console.log('user');
  next();
},function(req,res,next){
  console.log('next');
  next();
})
```

对于第 2 点，在注册 route layer 对象的时候，其回调函数不止一个时，便需要都注册，express 采用一个 route.stack 数组来存储 layer 对象（该对象上的 handle 属性绑定了需要执行的业务逻辑），并通过类似于管道的形式执行业务逻辑。因此，express 设计了一个 dispath 方法，并在内部实现了 next 方法，通过回调函数调用 next 方法，执行下一个回调函数。

#### 1.2 middleware layer

middleware layer 对象主要是通过 use 注册。

```javascript
// express/router/index.js
proto.use = function use(fn) {
  // ...
  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];
    // ...
    // 实例化 layer 对象
    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, fn);
    // layer 对象的 route 指向 undefined
    layer.route = undefined;
    // 注册 middleware layer 对象
    // this 指代的是 Router 对象
    this.stack.push(layer);
  }
  return this;
};
```

该代码主要有以下几个关键部分：

1. layer 对象的 route 是 undefined
2. layer 对象的 handle 是 fn（回调函数）

在理解两点之前，需先理解什么是中间件？

举个例子：用户在一个系统中执行一些操作，需要验证用户是否登录，便可以通过中间件来验证用户信息，并根据验证结果，来处理接下来的业务逻辑。

从上面这个例子中可以看出，中间件内部的代码是可复用，用户无论执行什么需要验证用户是否登录的操作，只需要执行这一个验证登录中间件即可。同时，中间件也处于系统与应用的中间层，去控制与管理用户的操作等。

针对第 1 点，express 通过 use 注册的 middleware layer 对象为中间件，因此，layer.route = undefined 没有其他的指向。

针对第 2 点，通过中间件的特性（中间件也处于系统与应用的中间层，去控制与管理用户的操作等），因此，layer.handle 即为用户的注册的中间件业务逻辑。

#### 1.3 Router.stack

综合以上所述，Route.stack 结构如下所示：

<div align=center>

![](./express-router.png)

</div>

#### 2 express 框架的执行阶段

express 通过执行 app.listen() 开始进入执行阶段。

```javascript
app.listen = function listen() {
  var server = http.createServer(this);
  return server.listen.apply(server, arguments);
};
```

从上面代码上分析，主要有以下两点：

1. app.listen 实质是调用 http.createServer 这个方法。
2. express 在调用 http.createServer 方法时，以 express 返回的 app 函数作为 requestListener 参数传入。

在成功开启服务器后，便会执行 express 返回的 app 函数，其代码如下：

```javascript
var app = function(req, res, next) {
  app.handle(req, res, next);
};
```

app 函数主要是执行 app.handle 方法，app.handle 方法实质是执行 router.handle 方法

```javascript
app.handle = function handle(req, res, callback) {
  // ...
  // ahh.handle 实质是执行 router.handle
  router.handle(req, res, done);
};
```

接下来看下分析下 router.handle 方法

```javascript
proto.handle = function handle(req, res, out) {
  // ...
  // router.stack 中的 layer 对象编号
  var idx = 0;
  // ...
  var stack = self.stack;
  // ...
  // 开始第一个 layer 对象
  next();
  function next(err) {
    // ...
    var layer;
    var match;
    var route;
    // 找到路径匹配的 layer 对象
    while (match !== true && idx < stack.length) {
      layer = stack[idx++];
      match = matchLayer(layer, path);
      route = layer.route;
      // ...
    }
    // ...
    self.process_params(layer, paramcalled, req, res, function (err) {
      if (err) {
        return next(layerError || err);
      }

      if (route) {
        // 执行 route layer 对象
        // 实质执行的是 layer.handle 函数
        // 在 router layer 对象中是 route.dispatch 函数
        return layer.handle_request(req, res, next);
      }

      trim_prefix(layer, layerError, layerPath, path);
    });
  }

  function trim_prefix(layer, layerError, layerPath, path) {
    // ...
    // 执行 middleware layer 对象
    if (layerError) {
      layer.handle_error(layerError, req, res, next);
    } else {
      layer.handle_request(req, res, next);
    }
  }
};
```

其中有几个关键的部分：

1. match = matchLayer(layer, path);
2. layer.handle_request(req, res, next);
3. trim_prefix(layer, layerError, layerPath, path);

针对第 1 点，matchLayer 实质上是调用 layer.match 函数，用来匹配 url。

针对第 2 点，layer.handle_request 实质是执行 layer.handle 函数，因此，针对 route layer 对象实质执行的是 route.dispatch 方法，而 middleware layer 对象执行的是 app.use(path, fn) 中的 fn 回调函数。

针对第 3 点，trim_prefix 函数的执行的条件是，如果不是 route layer 对象，便会执行该函数即为 middleware layer 对象的 layer.handle。

layer.handle_request 代码如下：

```javascript
Layer.prototype.handle_request = function handle(req, res, next) {
  // 实质执行的是 layer.handle
  var fn = this.handle;

  if (fn.length > 3) {
    return next();
  }

  try {
    fn(req, res, next);
  } catch (err) {
    next(err);
  }
};

```

总结下 express 整体执行流程，如下：

                          app function
                               |
                               |
                           app.handle
                               |
                               |
                         router.handle   —— —— ——
                            /     \              |
                           /       \             |
                route.dispath  layer.handle —— ——
                      |             |
                      |             |
                 layer.handle      fn
                      |
                      |
                     fn

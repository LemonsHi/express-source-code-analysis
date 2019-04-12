## 2019-04-12

### 执行流程

在执行 `var app = express()` 时发生了什么？

1. 执行 `router/layer.js` 文件

```javascript
// 导出 Layer 对象
module.exports = Layer;
```

2. 执行 `router/route.js` 文件

```javascript
// 导出 Route 对象
module.exports = Route;

// ...

// methods 为 node.js 中的 http.METHODS 的值
// 将方法循环挂在 Route.prototype 上面
methods.forEach(function(method){
  Route.prototype[method] = function(){
    // handles 回调函数数组
    // 当我们调用 app.get('/', (...) => {...}) 这个方法的时候
    // handles -> [(...) => {...}]
    var handles = flatten(slice.call(arguments));

    for (var i = 0; i < handles.length; i++) {
      var handle = handles[i];

      if (typeof handle !== 'function') {
        var type = toString.call(handle);
        var msg = 'Route.' + method + '() requires a callback function but got a ' + type
        throw new Error(msg);
      }

      debug('%s %o', method, this.path)
      // 创建一个 Layer 对象
      // Layer.handle = handle -> (...) => {...}
      // Layer.method = method -> get
      var layer = Layer('/', {}, handle);
      layer.method = method;

      this.methods[method] = true;
      // 将带有 handle 和 method 的 Layer 对象放入 route.stack 数组中
      // Router.stack -> Layer(Layer.route -> route)
      // Route.stack -> Layer(Layer.handle 以及 Layer.method)
      // 建立了 Router 和 Route 之间的关系
      this.stack.push(layer);
    }

    return this;
  };
});
```

3. 执行 `router/index.js` 文件

```javascript
// 导出 proto 函数，该函数返回 router 对象
var proto = module.exports = function(options) { /*...*/ }

// ...

// 建立 Router 与 Route 的关系
proto.route = function route(path) {
  // 创建一个 Route 对象
  var route = new Route(path);
  // 创建一个 Layer 对象
  var layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  }, route.dispatch.bind(route));

  // 将 Layer.route -> route
  layer.route = route;
  // 往 Router 的 stack 数组中添加一个 Layer 对象
  // Layer.route -> route
  this.stack.push(layer);
  // 返回的是一个 route 对象
  return route;
};

// methods 为 node.js 中的 http.METHODS 的值
// 为 methods 添加一个 all 方法，并循环挂载 methods 中的方法
// 在 proto 函数上面
methods.concat('all').forEach(function(method){
  proto[method] = function(path){
    var route = this.route(path)
    route[method].apply(route, slice.call(arguments, 1));
    return this;
  };
});
```

4. 执行 `appliction.js` 文件

```javascript
// 导出 app 对象
var app = exports = module.exports = {};

// ...

// methods 为 node.js 中的 http.METHODS 的值
// 将方法循环挂在 app 对象上面
methods.forEach(function(method){
  app[method] = function(path){
    // 当我们调用 app.get('/', (...) => {...}) 这个方法的时候
    // 对输入的参数进行判断，如果是不带路径的，便返回 this.set(path)
    if (method === 'get' && arguments.length === 1) {
      // app.get(setting)
      return this.set(path);
    }
    // 实质 new Router - this._router
    this.lazyrouter();
    // 实质调用的是 router/index.js 中的 proto.route 该方法
    // Router 内部的 stack 数组中有一个 Layer 对象
    // 形式如：stack -> [Layer(get('/'))]
    var route = this._router.route(path);
    // 实质调用的 route 对象上面的 get 方法
    // this -> route 为 Router stack 中的那个
    route[method].apply(route, slice.call(arguments, 1));
    return this;
  };
});
```

5. 执行 `express.js` 中的 `createApplication` 函数

```javascript
function createApplication() {
  var app = function(req, res, next) {/*...*/};

  // 添加方法到 app 对象上面
  mixin(app, EventEmitter.prototype, false);
  mixin(app, proto, false);

  // ...

  // 初始 app 对象，包括配置和参数等
  app.init();
  // 实质返回的是一个 JavaScript 函数
  return app;
}
```

当执行 `app.listen(3000, function () {/*..*/});` 时发生了什么

1. 执行 `appliction.js` 中的 `app.listen`

```javascript
// app.listen 源码
app.listen = function listen() {
  // express 实质的代理了 node 的 http.Server.listen
  // this 指的是 app，而 app 是一个 JavaScript 函数，即 express 对象
  // app 函数（express() 返回的函数）
  // 作为 http.createServer() 中的 requestListener
  var server = http.createServer(this);
  return server.listen.apply(server, arguments);
};
```

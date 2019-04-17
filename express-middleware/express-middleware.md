## 2019-04-17

### express middleware

`express` 通过 `app.use` 注册中间件，实质调用的是 `router.use` 方法

```javascript
app.use = function use(fn) {
  // ...

  // offset 为偏移量，如 app.use(path, fn) 时，offset = 1
  // fns = [fn, fn, fn, ...]
  var fns = flatten(slice.call(arguments, offset));

  fns.forEach(function (fn) {
    if (!fn || !fn.handle || !fn.set) {
      // 实质调用的是 router.use 方法
      return router.use(path, fn);
    }

    // ...
  }, this);

  // 返回 this -> app 函数
  // 支持链式调用
  return this;
};
```

`express` 注册的实际步骤是，将 `layer` 对象 `push` 进 `Router.stack` 中，与 `route` 的注册不同的是，`middleware` 的注册过程中 `layer.route = undefined`。

```javascript
proto.use = function use(fn) {
  // ...

  var callbacks = flatten(slice.call(arguments, offset));

  // ...

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];

    // ...

    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, fn);
    // 与 route 不同的是，layer.route = undefined
    layer.route = undefined;
    // 将 middleware push 进 Router.stack 中
    this.stack.push(layer);
  }

  return this;
};
```

`middleware` 的执行在 `router.handle` 方法中，通过 `trim_prefix` 方法执行中间件。

```javascript
proto.handle = function handle(req, res, out) {
  // ...

  var idx = 0;

  // ...

  var stack = self.stack;

  // ...

  next();

  function next(err) {

    // ...

    self.process_params(layer, paramcalled, req, res, function (err) {
      // ...

      // 执行 route layer 对象
      if (route) {
        return layer.handle_request(req, res, next);
      }
      // 执行 middleware layer 对象
      trim_prefix(layer, layerError, layerPath, path);
    });
  }

  // ...
};
```

`index.js` 中，通过 `next` 方法，使得 `idx` 增长，从而遍历 `Router.stack` 数组，执行相应的 `layer.handle` 方法（或调函数）。

> **注意：** `Router.stack` 数组，通过 `router.handle` 中的 `next` 方法遍历数组；`Route.stack` 数组，通过 `route.dispath` 中的 `next` 方法遍历数组。

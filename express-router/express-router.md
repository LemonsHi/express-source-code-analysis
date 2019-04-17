## 2019-04-16

### express router

`express router` 通过 `router` 和 `route` 的 `stack` 数组完成。

<div align=center>

![](https://user-gold-cdn.xitu.io/2018/3/24/162541b0548860b4?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

</div>

1. 在 `router` 对象中的 `stack` 数组中存放着一个个 `layer` 对象，该 `layer` 对象的 `route` 指向对应的 `route` 对象。
2. 在 `route` 对象中的 `stack` 数组中存放着一个个 `layer` 对象，该 `layer` 对象的 `method` 和 `handler` 属性用于存放方法的名称和回调函数。

```javascript
methods.forEach(function(method){
  app[method] = function(path){
    // ...

    // 往 Router.stack 中 push layer 对象
    // layer.route = Route
    var route = this._router.route(path);

    // 调用 Route 中的方法
    // 往 Route.stack 中 push layer 对象
    // layer.handle = fn
    // layer.method = method 名称
    route[method].apply(route, slice.call(arguments, 1));
    // 通过上面两步构成了 express 的 router 结构

    // 因为返回的 this -> app 函数对象
    // 所以，支持例子中的链式调用
    return this;
  };
});
```

在调用 app.listen 时，通过两个 idx 来，来执行回调。
1. 第一个 `idx` 控制 `Router.stack`。通过匹配 `url` 找到指定的 `layer` 对象。然后通过回调函数执行 `next` 方法，进入 `route.dispath` ，从而进入第二个 `idx` 控制。
2. 第二个 `idx` 控制 `Route.stack`。依次执行 `stack` 中的 `layer` 对象中的 `handle` 函数（回调函数）。

```javascript
proto.route = function route(path) {
  // ...

  // 进入第二个 idx 控制的关键
  // route.dispatch.bind(route)
  var layer = new Layer(path, {
    sensitive: this.caseSensitive,
    strict: this.strict,
    end: true
  }, route.dispatch.bind(route));

  // ...

  return route;
};
```

## 2019-04-16

### express router

`express router` 通过 `router` 和 `route` 的 `stack` 数组完成。

<div align=center>

![](https://user-gold-cdn.xitu.io/2018/3/24/162541b0548860b4?imageView2/0/w/1280/h/960/format/webp/ignore-error/1)

</div>

1. 在 `router` 对象中的 `stack` 数组中存放着一个个 `layer` 对象，该 `layer` 对象的 `route` 指向对应的 `route` 对象。
2. 在 `route` 对象中的 `stack` 数组中存放着一个个 `layer` 对象，该 `layer` 对象的 `method` 和 `handler` 属性用于存放方法的名称和回调函数。

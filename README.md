sail
====

CMD Context

### Fetures
* support global `require`, `exports`, `module`
* no need wrap with `define`
* not a loader, but will

### Usage

```
<html>
  <head>
    <!-- CMD environment -->
     <script src="sail.js"></script>
     
     <script src="./jquery.js"></script>
     <script src="./a.js"></script>
     <script src="./b.js"></script>
  </head>

  <body>
    <script>
      var b = require('./b');
      
      console.info(b);
    </script>
  </body>
</html>
```

In script `./a.js`

```
var $ = require('./jquery');

module.exports = function () {
  console.log($.jquery);
};
```

In script `./b.js`

```
var a = require('./a');

a();

module.exports = "all is ok";

```

Just for a environment, will work with same tools like `transform`, `concat`, `uglify`


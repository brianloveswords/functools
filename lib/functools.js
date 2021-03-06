var functools = (function(undefined){

  function isArray(el){
    return Object.prototype.toString.call(el) == '[object Array]';
  }

  /**
   * Function composition implementation
   */ 
  function compose(/* functions */){
    var fns = Array.prototype.slice.call(arguments);
    return function(initialValue){
      return reduce(function(f,g){
        return function(val){ 
          return g(f(val));
        };
      },fns)(initialValue);
    };
  }

  compose.async = function compose_async(/* functions */){
    var fns = Array.prototype.slice.call(arguments);
    return function(initialValue,callback){
      (function(i,error,value){
        if(error || fns.length<=i){
          callback(error, value);
          return;
        }

        fns[i](value, partial(arguments.callee, [i+1]));

      })(0,undefined,initialValue);
    };
  };

  /**
   * Take a set of functions, return a function that is the juxtaposition of those
   * functions. The returned function takes a variable number of arguments and returns
   * a list containing the result of applying each fn to the arguments.
   * 
   * usage examples;
   *   juxt(Number, String, Array)(true) => [1, "true", [true]]
   *   juxt({ "num": Number, "str": String, "arr": Array })(true) => { "num": 1, "str": "true", "arr": [true] }
   */
  function juxt(/* functions */){
    var fns = arguments.length > 1 || typeof arguments[0] != 'object' ? arguments : arguments[0];

    return function(){
      var args = arguments;
      return map(function(fn){
        return fn.apply(undefined, args); 
      }, fns);
    };

  }

  juxt.async = function(/* functions */){
    var fns = arguments.length > 1 || typeof arguments[0] != 'object' ? arguments : arguments[0];
    return function(/* args, callback */){
      var args     = Array.prototype.slice.call(arguments, 0, arguments.length-1),
          callback = arguments[arguments.length-1];

      map.async(function(fn, callback){
        fn.apply(undefined, args.concat([callback]));
      }, fns, callback);
    };
  };

  /**
   * Transform multiple-argument 'fn' into a chain of functions that return each other until all arguments
   * are gathered.
   */
  function curry(fn){
    var args = Array.prototype.slice.call(arguments,1),
        len = fn.length;
    return (function(){
      Array.prototype.push.apply(args,arguments);
      return args.length >= len && fn.apply(null,args) || arguments.callee;
    })();
  }

  /**
   * Execute 'fn' once per 'iterable' element.
   */
  function each(fn,iterable){
    for(var i = -1, len=iterable.length; ++i < len; ){
      fn(iterable[i],i,iterable);
    };
    return iterable;
  }

  /**
   * Apply 'fn' to every element of 'iterable', returning those elements for which fn returned a true value.
   */
  function filter(fn,iterable){
    var accumulation = [];
    for(var i = -1, len=iterable.length; ++i < len; ){
      fn(iterable[i],i,iterable) && accumulation.push(iterable[i]);
    };
    return accumulation;
  }

  filter.async = function filter_async(fn, iterable, callback){
    var accumulation = [];
    (function(i,ptest){

        ptest && accumulation.push(iterable[i-1]);

        if(i>=iterable.length){
          callback(accumulation);
          return;
        }

        fn(iterable[i], partial(arguments.callee, [i+1]));

    })(0);
  }

  /**
   * Apply fn to every element of iterable.
   */
  function map(fn, iterable){
    var clone, i, len, key;

    if(isArray(iterable)){

      clone = Array.prototype.slice.call(iterable, 0);
      i = -1;
      len = clone.length;
      
      while(++i<len){
        clone[i] = fn(clone[i], i, clone);
      }

    } else if(typeof iterable == 'object') {
      
      clone = {};

      for(key in iterable){
        clone[key] = fn(iterable[key], key, clone);
      }

    }

    return clone;
  }

  map.async = function map_async(fn, iterable, callback){
    var clone, iter, i, len, key, value,
        list = isArray(iterable);
    
    iter = list ? Array.prototype.slice.call(iterable) : Object.keys(iterable);
    clone = list ? iter : {};

    (function next(i, error, rpl){
      
      key = list ? i-1 : iter[i-1];
      value = list ? clone[i] : iterable[ iter[i] ];

      arguments.length > 2 && ( clone[key] = rpl );

      if(error || i>=iter.length){
        callback(error, clone);
        return;
      }

      fn(value, next.bind(undefined, i+1));

    })(0);

  };

  /**
   * Return a new function which will call 'fn' with the positional arguments 'args'
   */
  function partial(fn,initialArgs,ctx){
    !initialArgs && ( initialArgs = [] );
    return function(){
      var args = Array.prototype.slice.call(initialArgs,0);
      Array.prototype.push.apply(args,arguments);
      return fn.apply(ctx,args);
    };
  };

  /**
   * Apply fn cumulatively to the items of iterable,  as to reduce the iterable to a single value
   */
  function reduce(fn,iterable){
    var accumulator = iterable[0];

    for(var i = 0, len=iterable.length; ++i < len; ){
      accumulator=fn(accumulator,iterable[i],iterable);
    };

    return accumulator;
  }

  reduce.async = function reduce_async(fn,iterable,callback){
    (function(i, error, accumulator){
      
      if(error || i>=iterable.length){
        callback(error, accumulator);
        return;
      }

      fn(accumulator, iterable[i], partial(arguments.callee, [i+1]));

    })(1,undefined,iterable[0]);
  };

  return {
    "compose":compose,
    "curry":curry,
    "each":each,
    "filter":filter,
    'juxt':juxt,
    "map":map,
    "partial":partial,
    "reduce":reduce
  };

})();

if(typeof module != 'undefined' && module.exports){
  module.exports = functools;
}

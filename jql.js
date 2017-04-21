/**
  author: zjh 2017/04/15 11:02:17
  Thanks to https://github.com/fordth/jinqJs/
  demo:
    new jql().from(datas)
             .where((row) => row.field > 3)
             .groupBy("field", "field1", "field2")
             .sum("field4")
             .orderBy("field4")
             .desc()
             .select("field", "field1", "field2", "field4")
*/
'use strict';
var jql = function () {
  /**
  私有属性
  */
  var self = {
    /**
    原始数据集，在方法中不会被修改
    */
    collections: [],
    /**
    数据筛选结果
    */
    result: [],
    /**
    分组条件
    */
    groups: []
  };

  /**
    工具方法
  */
  var util = {
    /**
      判断数组是否为空
    */
    isEmpty: function(array) {
      return typeof array === 'undefined' || array.length === 0;
    },
    /**
      判断参数是否为数组
    */
    isArray: function(array) {
      return util.hasProperty(array, 'length') && !util.isString(array) && !util.isFunction(array);
    },
    /**
      判断参数是否为对象
    */
    isObject: function(obj) {
      return obj !== null && (obj.constructor === Object || util.isArray(obj));
    },
    /**
      判断参数是否为字符串
    */
    isString: function(str) {
      return str !== null && str.constructor === String;
    },
    /**
      判断某对象(第一个参数)是否含有扣个key(第二个参数)
    */
    hasProperty: function(obj, property) {
      return obj[property] !== undefined;
    },
    /**
      判断参数是否为函数
    */
    isFunction: function(func) {
      return typeof func === 'function';
    },
    /**
      判断参数是否为数字
    */
    isNumber: function(value) {
      return typeof value === 'number';
    },
    /**
      提取某对象(第一个参数)的指定列(第二个参数，可以是数组)，如
      {
        id: 1
        name: "zjh",
        class: "7",
        gender: "man"
      }
      调用condenseToFields(obj, ['name', 'class'])的返回值为
      {
        name: "zjh",
        class: "7"
      }
      如果obj内没有相应列，则会返回0
    */
    condenseToFields: function(obj, fields) {
      var newObj = {};
      if (util.isArray(fields)) {
        for (var index = 0; index < fields.length; index++) {
          var field = fields[index];
          newObj[field] = util.hasProperty(obj, field) ? obj[field] : 0;
        }
      } else {
        newObj[fields] = util.hasProperty(obj, fields) ? obj[fields] : 0;
      }
      return newObj;
    },
    /**
      在指定数组(collection)内查找和指定对象的值(obj)相同的列。第三个参数表示是否直接返回查找到的第一个结果
      如果没有找到，返回null而不是空数组
    */
    arrayFindItem: function(collection, obj, findFirst) {
      findFirst = findFirst || false;
      var isMatched = false;
      var ret = [];
      for (var index = 0; index < collection.length; index++) {
        isMatched = false;
        var row = collection[index];
        var isObj = util.isObject(row);
        for (var field in obj) {
          if (!isObj && row !== obj[field] || isObj && row[field] !== obj[field]) {
            isMatched = false;
            break;
          }
          isMatched = true;
        }
        if (isMatched) {
          if (findFirst) {
            return row;
          } else {
            ret.push(row);
          }
        }
      }
      return ret.length === 0 ? null : ret;
    },
    arrayFindFirstItem: function(collection, obj) {
      return util.arrayFindItem(collection, obj, true);
    },
    /**
      连接数组
    */
    concatCollection: function(collection) {
      var concatCollection = [];
      for (var index = 0; index < collection.length; index++) {
        concatCollection = concatCollection.concat(collection[index]);
      }
      return concatCollection;
    },
    /**
      聚合函数，在self.groups之后调用。调用完成后会清空self.groups
      使用第二个参数的fn作为聚合后的新列的值
    */
    aggregator: function(args, fn) {
      var collection = [];
      var keys = null;
      var values = null;
      var row = null;

      for (var index = 0; index < self.result.length; index++) {
        keys = util.condenseToFields(self.result[index], self.groups);
        values = util.condenseToFields(self.result[index], args);

        row = util.arrayFindFirstItem(collection, keys);
        if (row === null) {
          row = {};
          for (var keyField in keys) {
            row[keyField] = keys[keyField];
          }
          for (var valField in values) {
            // 将函数fn的返回值作为分组后的新列的value
            row[valField] = fn(row[valField], values[valField], JSON.stringify(keys) + valField);
          }
          collection.push(row);
        } else {
          for (var valField in values) {
            row[valField] = fn(row[valField], values[valField], JSON.stringify(keys) + valField);
          }
        }
      }
      self.groups = [];
      return collection;
    }
  };

  /**
    接收数据集。可以传多个数据集。
  */
  var _from = function() {
    if (arguments.length === 0) return jql;
    for (var index = 0; index < arguments.length; index++) {
      self.collections.push(arguments[index]);
    }
    self.result = util.concatCollection(self.collections);
    return this;
  };

  /**
    筛选方法。传入一个返回值为true或false的函数，会保留执行函数后返回值为true的数据
    如果没有传或者传入的参数不是函数，则直接返回
  */
  var _where = function(predicate) {
    if (typeof predicate === "undefined") return jql;
    if (!util.isFunction(predicate)) return jql;
    self.result = self.result.filter(predicate);
    return this;
  };

  /**
    选择输出的列。该函数一般最后调用
  */
  var _select = function() {
    if (util.isEmpty(self.result)) return [];
    if (arguments.length === 0) return self.result;

    var fields = [];
    var collection = new Array(self.result.length);
    fields = arguments;;

    for (var index = 0; index < self.result.length; index++) {
      var obj = {};
      for (var field = 0; field < fields.length; field++) {
        var fieldName = fields[field];
        obj[fieldName] = self.result[index][fieldName] === 0 ? 0 : self.result[index][fieldName] || null;
      }
      collection[index] = obj;
    }

    return collection;
  };

  /**
    组合函数
  */
  var _groupBy = function() {
    self.groups = util.concatCollection(arguments);
    return this;
  };

  /**
    求和函数，一般在group之后调用。求指定列的和
    如果在group之前调用，会直接以传入的参数作为数据列，并逐项累加
  */
  var _sum = function() {
    var sum = null;
    if (self.groups.length === 0) {
      sum = 0;
      for (var index = 0; index < self.result.length; index++) {
        sum += arguments.length === 0 ? self.result[index] : self.result[index][arguments[0]];
      }
      self.result = [sum];
    } else {
      sum = {};
      self.result = util.aggregator(arguments, function(oVal, nVal, key) {
        if (!util.hasProperty(sum, key)) {
          sum[key] = 0;
        }
        sum[key] += nVal;
        return sum[key];
      });
    }
    return this;
  };

  /**
    求平均值。具体用法和sum类似
  */
  var _avg = function() {
    var avg = null;
    if (self.groups.length === 0) {
      avg = 0;
      for (var index = 0; index < self.result.length; index++) {
        avg += arguments.length === 0 ? self.result[index] : self.result[index][arguments[0]];
      }
      self.result = [avg / self.result.length];
    } else {
      avg = {};
      self.result = util.aggregator(arguments, function(oVal, nVal, key) {
        if (!util.hasProperty(avg, key)) {
          avg[key] = {
            count: 0,
            sum: 0
          };
        }
        avg[key].count++;
        avg[key].sum += nVal;
        return avg[key].sum / avg[key].count;
      });
    }
    return this;
  };

  /**
    分情况
    1. 只传进来一个key，会判断key所对应的值的类型
        · string: 使用localeCompare进行排序（这个方法很坑，不建议使用）
        · number: 则按照大小排列(>, <, =)
    2. 传进来一个function，则按照function排序
    3. 啥都不传则不排序
  */
  var _orderBy = function() {
    if (arguments.length === 0) return this;
    if(self.result.length == 0) return this;
    var fields = arguments;
    if (fields.length === 1) {
      var field = fields[0];
      if (util.isFunction(field)) {
        self.result.sort(field);
      } else if (util.isString(field) && util.isNumber(self.result[0][field])) {
        self.result.sort(function(l, r) {
          var first = l[field];
          var second = r[field];
          return first - second;
        });
      } else {
        self.result.sort(function(l, r) {
          var first = JSON.stringify(util.condenseToFields(l, fields));
          var second = JSON.stringify(util.condenseToFields(r, fields));
          return first.localeCompare(second);
        });
      }
    }
    return this;
  };

  /**
    逆序
  */
  var _desc = function() {
    self.result.reverse();
    return this;
  };

  /**
    返回首/尾指定个数个元素。参数为正，从首开始返回amount个元素，参数为负，从尾返回abs(amount)个元素
   */
  var _top = function(amount) {
    var totalRows;
    totalRows = Math.abs(parseInt(amount));
    if (amount < 0) {
      self.result = self.result.slice(-1 * totalRows);
    } else {
      self.result = self.result.slice(0, totalRows);
    }
    return this;
  };

  /**
    传入一个列名，返回该列所有不重复的数据
    如果不传则不进行去重操作
  */
  var _distinct = function(field) {
    if (typeof field === "undefined") return this;
    var collection = [];
    var row = null;
    for (var index = 0; index < self.result.length; index++) {
      row = util.condenseToFields(self.result[index], field);
      if (util.arrayFindFirstItem(collection, row) === null) {
        collection.push(row);
      }
    }
    self.result = collection;
    return this;
  };

  // 暴露的方法
  this.from = _from;
  this.where = _where;
  this.select = _select;
  this.sum = _sum;
  this.groupBy = _groupBy;
  this.avg = _avg;
  this.orderBy = _orderBy;
  this.desc = _desc;
  this.top = _top;
  this.distinct = _distinct;
};

;
(function(global, fn) {
  // AMD / RequireJS
  if (typeof define !== 'undefined' && define.amd) {
    define('jql', [], function() {
      return fn
    });
  }
  // Node.js
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = fn;
  }
  // <script>
  else {
    global.jql = fn;
  }
})(typeof window === "undefined" ? undefined : window, jql);

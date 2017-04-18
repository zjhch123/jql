function init() {
  analyData(window.result)
}

function analyData(results) {
  var result = new jql().from(results)
           .where((row) => row.dataType == 0)
           .groupBy("platform", "units", "startTime")
           .sum('number')
           .orderBy(function(l, r) {
                return l.startTime - r.startTime
            })
           .select("platform", "units", "number", "startTime")

  console.log(result)

  var result2 = new jql().from(results)
                        .distinct("dataType")
                        .select("dataType")
                        .map(function(data) {
                          return data.dataType
                        })
  console.log(result2)
}

init()

var https = require("https");
var notlisted = require("./notlisted.json");

var process = (nl, l) => {
  nl = nl.map(e => ({...e, path:`${e.addr}-ETH`}));
  l = l.map(e => ({...e, path:`${e.name}-ETH`}));
  var unique=nl.concat(l).reduce( (res, curr) => ({...res, [curr.addr]: curr }), {});
  list = Object.keys(unique).map( k => unique[k]);
  console.log(JSON.stringify(list));
}

// fetch etherdelta configuration and retrieve tokens only
https.get('https://etherdelta.github.io/config/main.json', (res) => {
  var data = "";
  res.setEncoding("utf8");
  res.on('data', d => { data += d });
  res.on('end', () => { process( notlisted, JSON.parse(data).tokens ) })

}).on('error', (e) => {
  console.error(e);
});

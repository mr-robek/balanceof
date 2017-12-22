// bignumber.js helpers
function formatAmount(amount, decimals){
  // prepend correct amount of zeros if the number is less then decimals
  if (amount.length <= decimals) {
    amount = "0".repeat(1+decimals-amount.length) + amount;
  }
  var pos = amount.length-decimals;
  // inserts a dot in the correct position
  amount = amount.substring(0, pos) + "." + amount.substring(pos, amount.length);
  //remove last zeros
  amount=amount.replace(/0*$/g,'');
  //remove last dot
  amount=amount.replace(/\.$/g,'');
  return amount;
}

function toBigNumber(str, decimals){
  // prepend correct amount of zeros if the number is less then decimals
  var full =  str.split(".")[0];
  var fraction =  str.split(".")[1] || "";
  fraction = fraction.slice(0, decimals); // this should not happend but if the fraction has more digits then decimals we should discard them
  // append the correct amount of zero to the end of fraction
  fraction += "0".repeat(decimals-fraction.length);
  return new BigNumber(full+fraction);
}

// end of bignumber.js helpers

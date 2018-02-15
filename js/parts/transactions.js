// Metamask triggers

var web3initDone=false;
function initWeb3() {
  if (web3initDone)
    return Promise.resolve();
  return new Promise( (resolve, reject) => {
    if (typeof web3 === "undefined" || web3 === undefined || !user()) {
      onError("Could not connect to Ethereum. Consider installing <a href='https://metamask.io/' target='_blank' title='metamask.io'>MetaMask</a>. If you are using MetaMask, you may need to unlock your account. Please reload this page and try again.");
      return reject();
    }
    web3 = new Web3(web3.currentProvider);
    web3initDone = true;
    return resolve();
  })
}

var tokenabi;
async function initTokenContract(name, address) {
  await initWeb3();
  var abi = tokenabi || await fetchJson(name);
  return web3.eth.contract(abi).at(address);
}
async function initContract(name, address) {
  await initWeb3();
  var abi = await fetchJson(name);
  return web3.eth.contract(abi).at(address.toLowerCase());
}


function TxParam() {
  return {
    value: 0,
    gasPrice: web3.toWei(20, "gwei"),
    gas: GAS_LIMIT,
    from: web3.eth.accounts[0]
  }
}

// this function is only "template"; should be used with txCallback.bind({resolve:resolve, reject:reject))
function txCallback(err, txHash){
  if (err) {
    return this.reject(err)
  }
  return this.resolve(txHash);
}
function bindTxCallback(resolve, reject) {
  return txCallback.bind({resolve: resolve, reject: reject});
}
async function transferToken(bn, token, address) {
  var tokencontract = await initTokenContract("standardtoken", token.addr);
  var txParam = TxParam();
  return new Promise( (resolve, reject) => {
    tokencontract.transfer(address, bn.toString(10), txParam, bindTxCallback(resolve, reject));
  });
}

async function transferEther(bn, address) {
  var txParam = TxParam();
  txParam.value = bn.toString(10);
  txParam.to = address;
  return new Promise( (resolve, reject) => {
    web3.eth.sendTransaction(txParam, bindTxCallback(resolve, reject));
  });
}

async function transfer(bn, token, address) {
  if (isEth(token.addr)) {
    return await transferEther(bn, address);
  }
  return await transferToken(bn, token, address);
}

async function withdrawToken(bn, token) {
  if (!App.edcontract) {
    App.edcontract = await initContract('edabi', ED_ADDRESS);
  }
  var txParam = TxParam();
  return new Promise( (resolve, reject) => {
    App.edcontract.withdrawToken(token.addr, bn.toString(10), txParam, bindTxCallback(resolve, reject));
  });
}

async function withdrawEther(bn) {
  if (!App.edcontract) {
      App.edcontract = await initContract('edabi', ED_ADDRESS);
  }
  var txParam = TxParam();
  return new Promise( (resolve, reject) => {
    App.edcontract.withdraw(bn.toString(10), txParam, bindTxCallback(resolve, reject));
  })
}

async function withdraw(bn, token) {
  if (isEth(token.addr)) {
    return await withdrawEther(bn);
  }
  return await withdrawToken(bn, token);
}

async function approveToken(bn, token) {
  var tokencontract = await initTokenContract("standardtoken", token.addr);
  var txParam = TxParam();
  return new Promise( (resolve, reject) => {
    tokencontract.approve(ED_ADDRESS, bn.toString(10), txParam, bindTxCallback(resolve, reject));
  });
}

async function depositEther(bn) {
  if (!App.edcontract) {
      App.edcontract = await initContract('edabi', ED_ADDRESS);
  }
  var txParam = TxParam();
  txParam.value = bn.toString(10);
  return new Promise( (resolve, reject) => {
    App.edcontract.deposit(txParam, bindTxCallback(resolve, reject));
  })
}

async function depositToken(bn, token) {
  if (!App.edcontract) {
      App.edcontract = await initContract('edabi', ED_ADDRESS);
  }
  var txParam = TxParam();
  return new Promise( (resolve, reject) => {
    App.edcontract.depositToken(token.addr, bn.toString(10), txParam, bindTxCallback(resolve, reject));
  })
}

async function deposit(bn, token) {
  if (isEth(token.addr)) {
    return await depositEther(bn);
  }
  return await depositToken(bn, token);
}

function fetchAccountBalance(account) {
  return new Promise( (resolve, reject) => {
    web3.eth.getBalance(account, (err, ans) => {
      if (err) return reject();
      else return resolve(ans);
    });
  });
}

function fetchEtherdeltaEtherBalance(account) {
  return new Promise( (resolve, reject) => {
    App.jbcontract.balanceOfEther(account, {value: 0, from: user()}, (err, ans) => {
      if (err) return reject();
      else return resolve(ans[1]);
    });
  });
}

function fetchTokenBalance(token, account) {
  return new Promise( (resolve, reject) => {
    App.jbcontract.balanceOfToken(token.addr, account, {value: 0, from: user()}, (err, ans) => {
      if (err) return reject();
      else return resolve(ans);
    });
  });
}

// end of metamask triggers

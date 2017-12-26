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
// constants

const GAS_LIMIT=120000;
const JB_ADDRESS = "0x0ead7Fa41038D2a8040A74FcfBDDc079F254dc9D";
const ED_ADDRESS = "0x8d12A197cB00D4747a1fe03395095ce2A5CC6819";

// end of constants
// end of rest of the app.js
function onError(text) {
    createAlert("error", text);
}

function closeAlert(id) {
    $('div#'+id).remove();
}
var alertsCounter = 0;
function createAlert(type, content) {
    alertsCounter++;
    var box=`<div class="${ type === 'info' ? '' : 'info-error' }" id="alert${alertsCounter}"><span class="close-box" onClick="closeAlert('alert${alertsCounter}')">x</span><hr/><p>${content}</p></div>`
    $("div.info-wrapper").append(box);
}

function getEtherdeltaTradeAnchor(token) {
    if (isEth(token.addr))
        return "ETH";
    return `<a href='https://etherdelta.com/#${token.name}-ETH' title="https://etherdelta.com/#${token.name}-ETH" target="_blank">${token.name}</a>`;
}

function createDropdownLink(title, amount, token) {
    return `<a href="#" id="${title}-${token.addr}" class="button button-outline" ${amount.greaterThan(0) ? "" : "disabled"}>${title}</a>`
}
function createDropdownContent(wallet, etherdelta, token) {
    return `<div class="dropdown-content">${createDropdownLink("deposit", wallet, token)}${createDropdownLink("withdraw", etherdelta, token)}<hr />${createDropdownLink("transfer", wallet, token)}</div>`
}
function getRowMenu(wallet, etherdelta, token) {
  return `<div class="dropdown"><button class="button button-outline"> &plus; </button>${createDropdownContent(wallet, etherdelta, token)}</div>`;
}

function getTableRow(wallet, etherdelta, token) {
  var total = formatAmount(wallet.add(etherdelta).toString(10), token.decimals);
  var walletbalance = formatAmount(wallet.toString(10), token.decimals);
  var edbalance = formatAmount(etherdelta.toString(10), token.decimals);
  return `<tr><td>${getEtherdeltaTradeAnchor(token)}</td><td>${escape(total)}</td><td>${escape(walletbalance)}</td><td>${escape(edbalance)}</td><td>${getRowMenu(wallet, etherdelta, token)}</td></tr>`;
}
function onProgress(current, total) {
  $("span#current").text(current);
  $("span#total").text(total);
}

function onTokenFound(wallet, etherdelta, token) {
  var markup = getTableRow(wallet, etherdelta, token);
  $("table tbody").append(markup);
  $("table tbody").on("click", `#deposit-${token.addr}`, (ev) => {
      ev.preventDefault();
      wallet.greaterThan(0) && App.showDepositModal(wallet, token);
  });
  $("table tbody").on("click", `#withdraw-${token.addr}`, (ev) => {
      ev.preventDefault();
      etherdelta.greaterThan(0) && App.showWithdrawModal(etherdelta, token);
  })
  $("table tbody").on("click", `#transfer-${token.addr}`, (ev) => {
      ev.preventDefault();
      wallet.greaterThan(0) && App.showTransferModal(wallet, token);
  })
}

function isEth(addr) {
  return addr === '0x0000000000000000000000000000000000000000';
}

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    $.getJSON('./js/'+path+".json").done(resolve).error(reject);
  })
}

var web3initDone=false;
function initWeb3() {
  if (web3initDone)
    return Promise.resolve();
  return new Promise( (resolve, reject) => {
    if (web3 === undefined || !user()) {
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
  return web3.eth.contract(abi).at(address);
}

function split( val ) {
  return val.split( /,\s*/ );
}
function extractLast( term ) {
  return split( term ).pop();
}

function createSelectedTickerBage(ticker, token) {
  ticker=escape(ticker);
  var rawElement = `<div class="selected-ticker" id="${ticker}-selected">${ticker}<span class="remove-ticker" onClick="removeSelectedTicker('${ticker}')">x</span></div>`;
  var element = $(rawElement);
  element.data("token",token);
  return element;
}

function removeSelectedTicker(ticker) {
  $(`div#${ticker}-selected`).remove();
}

function user() {
  return web3.eth.accounts[0];
}


var App = {
  start: async () => {
    App.tokens = await fetchJson("tokens");
    App.tokens = App.tokens.reduce((acc,token) => {acc[token.name] = token; return acc;}, {});
    App.findUiElements();
    App.initTickersInput();
    App.initScanSelectedBtn();
    App.initScanAllBtn();
    App.initModal(); // TODO: ?
  },
  findUiElements: () => {
    App.page = {
      tickersInput: $('#tickersInput'),
      selectedTickers: $('.selected-container'),
      scanSelected: $('#scan-selected'),
      scanAll: $('#scan-all'),
      depositModal: $("#depositModal"),
      transferModal: $("#transferModal"),
      withdrawModal: $("#withdrawModal"),
      donateModal: $("#donateModal")
    }
  },

  initModal: () => {
    window.onclick = () => {
      let modals = [App.page.depositModal[0], App.page.withdrawModal[0], App.page.transferModal[0], App.page.donateModal[0]];
      if (modals.filter( m => m == event.target).length) {
        // there should be only one active modal so closing all does not change much ...
        App.closeAllModals()
      }
    }
  },

  closeAllModals: () => {
    App.page.depositModal.css("display", "none");
    App.page.transferModal.css("display", "none");
    App.page.withdrawModal.css("display", "none");
    App.page.donateModal.css("display", "none");
  },

  showDepositModal(available, token) {
    var modal = App.page.depositModal;
    modal.find("button").off("click").on("click", ev => {
      ev.preventDefault;
      App.removeErrorFromModal(modal);
      var amount = App.getAmountFromModal(modal, token);
      var approveHash, depositHash;

      Promise.resolve()
      .then( () => {
        if (isEth(token.addr)){
          return Promise.resolve("");
        }
        return approveToken(amount, token);
      }).then( txHash => {
        if (txHash) {
          var url = `https://etherscan.io/tx/${txHash}`
          createAlert("info", `${token.name} approve submitted. Watch the tx on <a href="${url}" title=${url} target="_blank">etherscan.io</a>.`);
        }
        return deposit(amount, token);
      }).then( txHash => {
        if (txHash) {
          var url = `https://etherscan.io/tx/${txHash}`
          createAlert("info", `${token.name} deposit submitted. Watch the tx on <a href="${url}" title=${url} target="_blank">etherscan.io</a>.`);
        }
        return Promise.resolve();
      }).then(() => {
          App.closeAllModals();
      }).catch( err => {
        App.showErrorOnModal(modal, err)
      });
    })
    this.resetAndShowModal(modal, available, token);
  },

  showTransferModal(available, token) {
    var modal = App.page.transferModal;
    modal.find("button").off("click").on("click", ev => {
      ev.preventDefault;
      App.removeErrorFromModal(modal);
      var amount = App.getAmountFromModal(modal, token);
      var address = App.getAddressFromModal(modal);
      transfer(amount, token, address)
      .then((txHash) => {
        var url = `https://etherscan.io/tx/${txHash}`
        createAlert("info", `Transfer ${token.name} submitted. Watch the tx on <a href="${url}" title=${url} target="_blank">etherscan.io</a>.`);
        App.closeAllModals();
      }).catch(msg => { App.showErrorOnModal(modal, msg) });
    })
    this.resetAndShowModal(App.page.transferModal, available, token);
  },

  showWithdrawModal(available, token) {
    var modal = App.page.withdrawModal;
    var button=modal.find("button");
    var callback = (ev) => {
      ev.preventDefault;
      App.removeErrorFromModal(modal);
      var amount = App.getAmountFromModal(modal, token);
      withdraw(amount, token)
      .then((txHash) => {
        var url = `https://etherscan.io/tx/${txHash}`
        createAlert("info", `Withdraw ${token.name} submitted. Watch the tx on <a href="${url}" title=${url} target="_blank">etherscan.io</a>.`);
        App.closeAllModals();
      }).catch(msg => { App.showErrorOnModal(modal, msg); });
    };
    button.off("click").on("click", callback)
    this.resetAndShowModal(modal, available, token);
  },

  removeErrorFromModal(modal) {
    modal.find("div.error").text("");
  },

  showErrorOnModal(modal, msg) {
    modal.find("div.error").text(msg);
  },

  getAmountFromModal(modal, token) {
    return toBigNumber(modal.find("input#amountInput").val(), token.decimals);
  },
  getAddressFromModal(modal) {
    var addressInput = modal.find("input#transferAddress");
    return addressInput ? addressInput.val() : "";
  },
  resetAndShowModal(modal, available, token) {
      // this one is useful with doing the ratio on slider
      var prettyBnAvailable = new BigNumber(formatAmount(available.toString(10), token.decimals));
      var name = modal.find("span#name");
      name.text(escape(token.name));

      var address = modal.find("input#transferAddress");
      address && address.val("");

      var amountInput = modal.find("input#amountInput");
      amountInput.val(0);
      amountInput.off("input").on("input", () => {
          var amount = new BigNumber(amountInput.val());
          balanceRange.val(amount.dividedBy(prettyBnAvailable));
      })
      var balanceRange = modal.find("input#balanceRange");
      balanceRange.val(0);
      balanceRange.off("input").on("input", () => {
          var part = available.times(balanceRange.val()).floor();
          var part_str = formatAmount(part.toString(10), token.decimals);
          amountInput.val(part_str);
      });

      var max = modal.find("span#max");
      max.off("click").on("click", () => {
          amountInput.val(formatAmount(available.toString(10), token.decimals));
          amountInput.trigger("input");
      });
      App.removeErrorFromModal(modal);
      modal.css("display", "block");
  },

  initTickersInput: () => {
    App.page.tickersInput
      .on('keydown', (event) => {
        if ( event.keyCode === $.ui.keyCode.TAB && $( this ).autocomplete( "instance" ).menu.active ) {
          event.preventDefault();
        }
      })
      .autocomplete({
        minLength: 0,
        source: ( request, response ) => {
          // delegate back to autocomplete, but extract the last term
          response( $.ui.autocomplete.filter(
            Object.keys(App.tokens), extractLast( request.term ) ) );
        },
        focus: () => false, // prevent value inserted on focus
        select: function( event, ui ) {
          var selected = ui.item.value;
         App.page.selectedTickers.append( createSelectedTickerBage(selected, App.tokens[selected]) )
         this.value = ""
         return false;
       }
    })
  },
  disableScanButtons: () => {
    App.page.scanAll.prop("disabled", true);
    App.page.scanSelected.prop("disabled", true);
  },
  enableScanButtons: () => {
    App.page.scanAll.prop("disabled", false);
    App.page.scanSelected.prop("disabled", false);
  },

  initScanSelectedBtn: () => {
    App.page.scanSelected.on('click', (event) => {
      event.preventDefault();
      var tokens = $.map($(".selected-ticker"), (el) => $(el).data("token"));
      App.scan(tokens, true);
    })
  },
  initScanAllBtn: () => {
    App.page.scanAll.on('click', (event) => {
      event.preventDefault();
      App.scan(Object.values(App.tokens));
    })
  },

  scan: async (tokens, showZero) => {
    if (!App.jbcontract) {
      App.jbcontract = await initContract('jbabi', JB_ADDRESS);
    }
    $("table tbody").empty();
    App.disableScanButtons();
    onProgress(0, tokens.length);
    for (var i = 0; i < tokens.length; i++) {
      try {
        var token = tokens[i];
        var balances = [];
        if (isEth(token.addr)) {
          balances.push(await fetchAccountBalance(user()));
          balances.push(await fetchEtherdeltaEtherBalance(user()));
        } else {
          balances = await fetchTokenBalance(token, user());
        }
        onProgress(i+1, tokens.length);
        var broke = balances[0].equals(0) && balances[1].equals(0);
        if ( !broke || showZero) {
          onTokenFound(balances[0], balances[1], token);
        }
      } catch (e) {
        console.error("Error fetching " + escape(tokens[i].name) + " balance.",e);
        onError("Error fetching " + escape(tokens[i].name) + " balance.");
      }
    }
    App.enableScanButtons();
  }
}


function waitAndStart(time) {
    setTimeout(App.start, time);
}

function handleDonate() {
    App.page.donateModal.css("display", "block");
}

// Inital loading of the page
if (document.readyState !== 'complete') {
  // Document has not finished loaded yet, load the page when it is complete
  window.addEventListener('load', function() {
    waitAndStart(500);
  })
} else {
  // Document has finished loaded, load the page
  waitAndStart(500);
}
// end of rest of the app.js
// Metamask triggers

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

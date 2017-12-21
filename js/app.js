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

function getWithdrawAllAnchor(token, balance) {
    return `<a href='#' id='${token.addr}' class="button button-clear" ${balance === '0' ? "disabled" : ""} >Withdraw all</a>`;
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

function onProgress(current, total) {
  $("span#current").text(current);
  $("span#total").text(total);
}

function onTokenFound(wallet, etherdelta, token) {
  var total = formatAmount(wallet.add(etherdelta).toString(10), token.decimals);
  var walletbalance = formatAmount(wallet.toString(10), token.decimals);
  var edbalance = formatAmount(etherdelta.toString(10), token.decimals);
  var name = token.name;
  var markup = `<tr><td>${getEtherdeltaTradeAnchor(token)}</td><td>${escape(total)}</td><td>${escape(walletbalance)}</td><td>${escape(edbalance)}</td><td>${getRowMenu(wallet, etherdelta, token)}</td></tr>`;
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

async function withdraw(bn, token) {
    if (!App.edcontract) {
        App.edcontract = await initContract('edabi', ED_ADDRESS);
    }
    var txParam = {
        value: 0,
        gasPrice: web3.toWei(20, "gwei"),
        gas: 250000,
        from: web3.eth.accounts[0]
    }
    return new Promsie( (resolve, reject) => {
        var fn = (err, txHash) => {
            if(err) {
                onError(`Withdraw ${token.name} failed.`);
                reject(`Withdraw ${token.name} failed.`);
                return;
            }
            var url = `https://etherscan.io/tx/${txHash}`
            createAlert("info", `Withdraw all ${token.name} submitted. Watch the tx on <a href="${url}" title=${url} target="_blank">etherscan.io</a>.`);
            console.log(`Submitted: ${url}`);
            resolve(`Submitted: ${url}`);
        };
        if (isEth(token.addr)) {
            App.edcontract.withdraw(bn.toString(10), txParam, fn);
        } else {
            App.edcontract.withdrawToken(token.addr, bn.toString(10),txParam, fn);
        }
    })
}


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
  var fraction =  str.split(".")[1];
  fraction = fraction.slice(0, decimals); // this should not happend but if the fraction has more digits then decimals we should discard them
  // append the correct amount of zero to the end of fraction
  fraction += "0".repeat(decimals-fraction.length);
  return new BigNumber(full+fraction);
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

const JB_ADDRESS = "0x0ead7Fa41038D2a8040A74FcfBDDc079F254dc9D";
const ED_ADDRESS = "0x8d12A197cB00D4747a1fe03395095ce2A5CC6819";

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
      var amount = toBigNumber(modal.find("input#amountInput").val());
      if (amount.greaterThan(available)) {
          // show a warning message
      }
      deposit(amount, token)
      .then(() => {
          App.closeAllModals();
      });
    })
    this.resetAndShowModal(App.page.modal, available, token);
  },

  showTransferModal(available, token) {
    var modal = App.page.transferModal;
    modal.find("button").off("click").on("click", ev => {
      ev.preventDefault;
      var amount = toBigNumber(modal.find("input#amountInput").val());
      if (amount.greaterThan(available)) {
        // show a warning message
      }
      transfer(amount, token)
      .then(() => {
        App.closeAllModals();
      });
    })
    this.resetAndShowModal(App.page.transferModal, available, token);
  },

  showWithdrawModal(available, token) {
    var modal = App.page.withdrawModal;
    modal.find("button").off("click").on("click", ev => {
        ev.preventDefault;
        var amount = toBigNumber(modal.find("input#amountInput").val());
        if (amount.greaterThan(available)) {
            // show a warning message
        }

        withdraw(amount, token)
        .then(() => {
            App.closeAllModals();
        });
    })
    this.resetAndShowModal(modal, available, token);

  },

  resetAndShowModal(modal, available, token) {
      // this one is useful with doing the ratio on slider
      var prettyBnAvailable = new BigNumber(formatAmount(available.toString(10), token.decimals));
      var name = modal.find("span#name");
      name.text(escape(token.name));

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
  }
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

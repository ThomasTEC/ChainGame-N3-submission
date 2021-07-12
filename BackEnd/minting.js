const Neon = require("@cityofzion/neon-js");

const rpc = Neon.rpc;
const api = Neon.api;
const wallet = Neon.wallet;
const fs = Neon.fs;
const sc = Neon.sc;
const tx = Neon.tx;
const def = Neon.default;
const nep = Neon.nep5;

const setup = {
  contracthash_items: "0xd9da3d4578cf6975d0b5e831472e0f06ecb46a5a",
  rpcAddress: "https://testnet1.neo.coz.io:443",
  magic: 844378958
}

const mysql = require('mysql');

scan_minting();
check_minting();

async function scan_minting() { // We need to wrap the loop into an async function for this to work
  con = createConnection();
  for (let i = 0; i < +Infinity; i++)
  {
    console.log("scan minting Loop", i)

    var state = 0;
    var query_mint = 'SELECT * FROM to_mint WHERE state = ?';

    con.query(query_mint, state, function(err,result)
    {
      if(err) throw err //Error
      let tokenInformation = []

      Object.keys(result).forEach(function(key)  //Form result into object
      {
        var row = result[key];

        tokenInformation.push(
        {
          id: row.id,
          item_id: row.item_id,
          receiver: row.receiver,
          state: row.state
        })
      })

      console.log(tokenInformation)

      for (let j=0; j<tokenInformation.length; j++)
      {
        var id = tokenInformation[j].item_id;
        var query_items = 'SELECT * FROM items WHERE itemid = ?';

        con.query(query_items, id, function(err,result)
        {
          if(err) throw err //Error
          if (result)
          {
            Object.keys(result).forEach(function(key) //Form result into object
            {
              var row = result[key];
              console.log(row);

              //>=6000 <7000; recipes
              //>=7000 <7500; material
              //>=7500 <8000; questitem
              //>=8000 <8500; skin

              if (row.itemid < 6000) {type = "equipment";}
              else if (row.itemid >= 6000 && row.itemid < 7000) {type = "recipe";}
              else if (row.itemid >= 7000 && row.itemid < 8000) {type = "material";}
              else if (row.itemid >= 8000 && row.itemid < 8500) {type = "skin";}

              if (type === "equipment")
              {
                item = JSON.stringify(
                {
                  title: "Chain.Game.Item",
                  type: type,
                  properties: {
                    name: row.name,
                    item_id: row.itemid,
                    stack: row.stack,
                    category: row.category,
                    content: JSON.parse(row.content)
                  }
                })
              }
              else if (type === "recipe")
              {
                item = JSON.stringify(
                {
                  title: "Chain.Game.Item",
                  type: type,
                  properties: {
                    name: row.name,
                    item_id: row.itemid,
                    stack: row.stack,
                    content: JSON.parse(row.content)
                  }
                })
              }
              else if (type === "material")
              {
                item = JSON.stringify(
                {
                  title: "Chain.Game.Item",
                  type: type,
                  properties: {
                    name: row.name,
                    item_id: row.itemid,
                    stack: row.stack,
                    content: JSON.parse(row.content)
                  }
                })
              }
              else if (type === "skin")
              {
                item = JSON.stringify(
                {
                  title: "Chain.Game.Item",
                  type: type,
                  properties: {
                    name: row.name,
                    item_id: row.itemid,
                    stack: row.stack,
                    content: JSON.parse(row.content)
                  }
                })
              }
            })

            minted = mintToken(item, tokenInformation[j].receiver, tokenInformation[j].id);

            if (minted)
            {
              console.log("minting successful")
            }
            else
            {
              console.log("minting error")
            }
          }
          else
          {
            console.log("nothing to update")
          }
        })
      }
    });
    await timer(5000);
  }
  con.end(function(err){})
}

async function check_minting()
{
  con = createConnection();
  for (let i = 0; i < +Infinity; i++)
  {
    console.log("check minting Loop", i)

    var state = 1;
    var query_mint = 'SELECT * FROM to_mint WHERE state = ?';

    con.query(query_mint, state, function(err,result)
    {
      if(err) throw err //Error
      let tokenInformation = []

      Object.keys(result).forEach(function(key)  //Form result into object
      {
        var row = result[key];

        tokenInformation.push(
        {
          id: row.id,
          item_id: row.item_id,
          receiver: row.receiver,
          state: row.state,
          txid: row.txid
        })
      })
      console.log(tokenInformation)

      for (let j=0; j<tokenInformation.length; j++)
      {
        const client = new rpc.RPCClient(setup.rpcAddress);

        client.getRawTransaction(tokenInformation[j].txid).then(response => {
          if (response)
          {
            var state = 2;
            var query_state = 'UPDATE to_mint SET state = ? WHERE id = ?';

            con.query(query_state, [state, tokenInformation[j].id], function(err,result)
            {
              if(err) throw err //Error
              console.log("Info: ", tokenInformation[j].id, "updated state 2")
            })
          }
        })
      }
    })

    await timer(5000);
  }
  con.end(function(err){})
}


async function mintToken(properties, receiver, mintID)
{
  const mintAccount = new Neon.wallet.Account(
    "" //add private key from hardcoded ADMIN of the contract here
  )

  console.log(properties)
  tokenProperties = Neon.sc.ContractParam.byteArray(ascii_to_hexa(properties));

  const params = [
    Neon.sc.ContractParam.hash160(mintAccount.address),
    tokenProperties,
    Neon.sc.ContractParam.hash160(wallet.getScriptHashFromAddress(receiver)),
  ]

  let txid = await publishInvoke(setup.rpcAddress, setup.magic, setup.contracthash_items, "mint", params, mintAccount)

  if (txid)
  {
    var state_minting = 1;
    var query_state = 'UPDATE to_mint SET state = ?, txid = ? WHERE id = ?';

    con.query(query_state, [state_minting, txid, mintID], function(err,result)
    {
      if(err) throw err //Error
      console.log("updated", mintID)
    })

    var query_charname = 'SELECT user_uid FROM game_users WHERE user_publicKey=?';
    con.query(query_charname, [receiver], function(err,result)
    {
      if(err) throw err //Error

      if (result.length > 0)
      {
        Object.keys(result).forEach(function(key)  //Form result into object
        {
          var row = result[key];
          char_name = row.user_uid;
        })
        var query_inventory = 'INSERT INTO update_inventory (char_name, txid, state) VALUES (?,?,?)';
        con.query(query_inventory, [char_name, txid, 0], function(err,result)
        {
          if(err) throw err //Error
        });
      }
    });
    return true
  }
  else
  {
    return false
  }
}

function timer(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function ascii_to_hexa(str) {
  var arr1 = [];
  for (var n = 0, l = str.length; n < l; n ++)
  {
  	var hex = Number(str.charCodeAt(n)).toString(16);
  	arr1.push(hex);
  }
  return arr1.join('');
}

function hex2a(hexx) {
  var hex = hexx.toString();//force conversion
  var str = '';
  for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
}

async function publishInvoke(rpcAddress, networkMagic, scriptHash, operation, args, account){
  const contract = new Neon.experimental.SmartContract(
    Neon.u.HexString.fromHex(scriptHash),
    {
      networkMagic,
      rpcAddress,
      account,
    }
  );

  let result
  try {
    result = await contract.invoke(operation, args)
  } catch (e) {
    console.log(e)
  }

  return result
}

function createConnection()
{

  var con = mysql.createPool({
    connections: 10,
    host: "localhost",
    user: "root",
    password: "",
    database: "Browsergame"
  });
  return con
}

/*
Programm which is always looking into the Database "await_transactions"
The looked for state == 1
0 ... player still need to initiate
1 ... player initiated the transaction and should appear on blockchain soon
2 ... item received on the blockchain, needed task can be executed
The tasks can be:
- learning_recipe; char_locked
- crafting_item; char_locked
- finishing_quest;
When task is finished state will be set to 2
*/

const Neon = require("@cityofzion/neon-js");

const rpc = Neon.rpc;
const api = Neon.api;
const wallet = Neon.wallet;
const fs = Neon.fs;
const sc = Neon.sc;
const tx = Neon.tx;
const def = Neon.default;
const nep = Neon.nep5;
const u = Neon.u;

const mysql = require('mysql');

const setup = {
  contracthash_items: "0xd9da3d4578cf6975d0b5e831472e0f06ecb46a5a",
  rpcAddress: "https://testnet1.neo.coz.io:443",
  magic: 844378958
}

const fromAccount = new Neon.wallet.Account(
  "" //add private key from hardcoded ADMIN of the contract here
)

await_transactions();
execute_task();

async function await_transactions()
{
  con = createConnection();
  for (let i = 0; i < +Infinity; i++)
  {
    console.log("check await_transactions", i)

    to_check_itemids = await active_transactions();

    console.log(to_check_itemids)

    if (to_check_itemids != false)
    {
      current_itemids = await current_tokenids(setup.rpcAddress, setup.magic, setup.contracthash_items);
      console.log(current_itemids)

      for (let j = 0; j < to_check_itemids.length; j++)
      {
        console.log("Item id:"+to_check_itemids[j].id)
        if (current_itemids.includes(to_check_itemids[j].bid))
        {
          var state = 2;
          var query_state = 'UPDATE await_transactions SET state = ? WHERE id = ?';

          con.query(query_state, [state, to_check_itemids[j].id], function(err,result)
          {
            if(err) throw err //Error
            console.log("Info: ", to_check_itemids[j].id, "updated state 2")
          })
        }
      }

    }
    await timer(2500);
  }
  con.end(function(err){})
}

async function execute_task()
{
  con = createConnection();
  for (let i = 0; i < +Infinity; i++)
  {
    console.log("check execute task", i)

    to_performed_task = await completed_transactions();
    if (to_performed_task != false)
    {
      for (let j = 0; j < to_performed_task.length; j++)
      {
        perform_task(to_performed_task[j].char_name, to_performed_task[j].task, to_performed_task[j].task_item_id, to_performed_task[j].id)
      }
    }
  await timer(2200);
  }
}

function active_transactions()
{
  console.log("query active transactions")

  query_transactions = 'SELECT id, blockchain_item_id FROM await_transactions WHERE state = ?';
  return new Promise(function(resolve, reject) {
    con.query(query_transactions, 1, function(err,result)
    {
      if(err) throw err //Error

      let looked_for_items = []

      if (result.length > 0)
      {
        Object.keys(result).forEach(function(key)  //Form result into object
        {
          var row = result[key];
          looked_for_items.push(
            {
              id: row.id,
              bid: JSON.parse(row.blockchain_item_id)
            })
        })
        resolve(looked_for_items)
      }
      else
      {
        resolve(false)
      }
    });
  });
}

function completed_transactions()
{
  console.log("query completed transactions")

  query_transactions = 'SELECT id, char_name, task, task_item_id FROM await_transactions WHERE state = ?';
  return new Promise(function(resolve, reject) {
    con.query(query_transactions, 2, function(err,result)
    {
      if(err) throw err //Error

      let looked_for_tasks = []

      if (result.length > 0)
      {
        Object.keys(result).forEach(function(key)  //Form result into object
        {
          var row = result[key];
          looked_for_tasks.push(
            {
              char_name: row.char_name,
              task: row.task,
              task_item_id: row.task_item_id,
              id: row.id
            })
        })
        resolve(looked_for_tasks)
      }
      else
      {
        resolve(false)
      }
    });
  });
}

async function perform_task(char_name, task, task_item_id, id)
{
  if (task === "learning_recipe")
  {
    job = await getJob(char_name)
    console.log(job)
    if (job != false)
    {
      updateRecipes(char_name, job, task_item_id)
      dismissAwaitTransaction(id)
      updateCharlock(char_name)
    }
    else
    {
      console.log("error")
    }
  }
  else if (task === "crafting_item")
  {

  }
  else if (task === "finishing_quest")
  {

  }
}

function getJob(char_name)
{
  query_job = 'SELECT char_job FROM game_chars WHERE char_name = ?';
  return new Promise(function(resolve, reject) {
    con.query(query_job, char_name, function(err,result)
    {
      if(err) throw err //Error

      if (result.length > 0)
      {
        Object.keys(result).forEach(function(key)  //Form result into object
        {
          var row = result[key];
          job_number = row.char_job
        })

        if (job_number === 0) {job = false}
        else if (job_number === 1) {job = "job_crafter"}
        else if (job_number === 2) {job = "job_tailor"}
        else if (job_number === 3) {job = "job_smith"}

        resolve(job)
      }
      else
      {
        resolve(false)
      }
    });
  });
}

function updateRecipes(char_name, job, recipe_number)
{
  query_update_recipes = 'UPDATE '+job+' SET recipe_'+recipe_number+'=? WHERE char_name=?';
  con.query(query_update_recipes, [1, char_name], function(err,result)
  {
    if(err) throw err //Error
    console.log("recipe learned")
  })
}

function updateCharlock(char_name)
{
  query_update_charlock = 'UPDATE game_chars SET char_locked =? WHERE char_name=?';
  con.query(query_update_charlock, [0, char_name], function(err,result)
  {
    if(err) throw err //Error
    console.log("char unlocked")
  })
}

function dismissAwaitTransaction(id)
{
  query_delete = 'DELETE FROM await_transactions WHERE id=?';
  con.query(query_delete, id, function(err,result)
  {
    if(err) throw err //Error
    console.log("query_done")
  })
}

async function current_tokenids(node, networkMagic, contractHash)
{
  const method = "tokensOf"

  const address = Neon.sc.ContractParam.hash160(fromAccount.address)

  const res = await testInvoke(node, networkMagic, contractHash, method, [address])

  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  let tokenids = new Array()

  for (key in res[0].iterator)
  {
    let i = 0
    for (next in res[0].iterator[key].value)
    {
      if (i%2 !== 0)
      {
        tokenids.push(res[0].iterator[key].value[next].value)
        //tokenids.push(Neon.u.base642hex(res[0].iterator[key].value[next].value))
      }
      i++
    }
  }

  tokenidsRenew = new Array()

  for (key in tokenids)
  {
    if (tokenids[key].length === 2)
    {
      tokenidsRenew.push(parseInt(Neon.u.base642hex(tokenids[key]), 16))
    }
    else if (tokenids[key].length === 4)
    {
      tokenidsRenew.push(parseInt(Neon.u.reverseHex(Neon.u.base642hex(tokenids[key])), 16))
    }
  }

  return tokenidsRenew
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

async function testInvoke(rpcAddress, networkMagic, scriptHash, operation, args){
  const contract = new Neon.experimental.SmartContract(
    Neon.u.HexString.fromHex(scriptHash),
    {
      networkMagic,
      rpcAddress,
    }
  );
  let res = await contract.testInvoke(operation, args)

  console.log(res)

  return res.stack
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

/*
Programm which query the database update_inventory
It is looking for the state 0 and 1
0 ... Item transaction is initiated
1 ... Item transaction was successful

0:
Will wait until the transaction is completed
If it is completed the state will be set to 1

1:
Will update the invenotry of the specific character
If inventory update is completed the entry can be deleted
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

check_state();
to_update_inventory();

async function check_state()
{
  con = createConnection();
  for (let i = 0; i < +Infinity; i++)
  {
    console.log("check state:", i)
    to_check = await get_state_zero() //object with id, txid

    if (to_check != false)
    {
      for (let j=0; j<to_check.length; j++)
      {
        check_transaction(to_check[j].id, to_check[j].txid)
      }
    }
    await timer(250);
  }
  con.end(function(err){})
}

async function to_update_inventory()
{
  con = createConnection();
  for (let i = 0; i < +Infinity; i++)
  {
    console.log("check update_inventory:", i)
    to_update = await get_state_one() //object with id, txid

    if (to_update != false)
    {
      for (let j=0; j<to_update.length; j++)
      {
        let char_name = to_update[j].char_name
        let public_key = await get_publickey(char_name)
        console.log(public_key)

        itemids = await get_itemids(public_key)
        //console.log(itemids)

        inventory_old = await get_inventory(char_name)
        //console.log(inventory_old)
        inventory_new = await form_inventory(itemids, public_key, inventory_old)
        //console.log(inventory_new)
        inventory_saved = await save_inventory(inventory_new, char_name)
        //console.log(inventory_saved)
        if (inventory_saved === true)
        {
          delete_transaction(to_update[j].id)
        }
        else
        {
          console.log("error while updating")
        }
      }
    }

    await timer(250);
  }
  con.end(function(err){})
}

function get_state_zero()
{
  let query_states = 'SELECT id, txid FROM update_inventory WHERE state = ?';
  return new Promise(function(resolve, reject) {
    con.query(query_states, 0, function(err,result)
    {
      if(err) throw err //Error

      let looked_for_transactions = []

      if (result.length > 0)
      {
        Object.keys(result).forEach(function(key)  //Form result into object
        {
          var row = result[key];
          looked_for_transactions.push(
            {
              id: row.id,
              txid: row.txid
            })
        })
        resolve(looked_for_transactions)
      }
      else
      {
        resolve(false)
      }
    });
  });
}

function get_state_one()
{
  let query_states = 'SELECT * FROM update_inventory WHERE state = ?';
  return new Promise(function(resolve, reject) {
    con.query(query_states, 1, function(err,result)
    {
      if(err) throw err //Error

      let state_one_transactions = []

      if (result.length > 0)
      {
        Object.keys(result).forEach(function(key)  //Form result into object
        {
          var row = result[key];
          state_one_transactions.push(
            {
              id: row.id,
              char_name: row.char_name,
              txid: row.txid
            })
        })
        resolve(state_one_transactions)
      }
      else
      {
        resolve(false)
      }
    });
  });
}

function check_transaction(id, txid)
{
  const client = new rpc.RPCClient(setup.rpcAddress);

  client.getRawTransaction(txid, 1).then(response => {
    if ("blockhash" in response)
    {
      var state = 1;
      var query_state = 'UPDATE update_inventory SET state = ? WHERE id = ?';

      con.query(query_state, [1, id], function(err,result)
      {
        if(err) throw err //Error
        console.log("Info: ", id, "updated state to 1")
      })
    }
  })
  .catch(error => {console.log("Info: ", id, "no state change")})
}

function get_publickey(char_name)
{
  let query_publickey = 'SELECT user_publicKey FROM game_users WHERE user_uid = ?';
  return new Promise(function(resolve, reject) {
    con.query(query_publickey, char_name, function(err,result)
    {
      if(err) throw err //Error

      Object.keys(result).forEach(function(key)  //Form result into object
      {
        var row = result[key]
        console.log(row)
        publicKey = row.user_publicKey
      })
      resolve(publicKey)
    })
  })
}

async function get_itemids(publicKey)
{
  const method = "tokensOf"
  const address = Neon.sc.ContractParam.hash160(wallet.getScriptHashFromAddress(publicKey))

  const res = await testInvoke(setup.rpcAddress, setup.magic, setup.contracthash_items, method, [address])

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

function get_inventory(char_name)
{
  query_blockchain_inventory = "SELECT inventory_json FROM inventory_blockchain WHERE char_name = ?";

  return new Promise(function(resolve, reject) {
    con.query(query_blockchain_inventory, char_name, function(err,result)
    {
      if(err == null)
      {
        let inventory = []

        if (result.length > 0)
        {
          Object.keys(result).forEach(function(key)  //Form result into object
          {
            var row = result[key];
            inventory.push(row.inventory_json)
            resolve(inventory[0])
          })
        }
        else
        {
          resolve(false) //Error
        }
      }
      else
      {
        resolve(false)
      }
    });
  });
}

function form_inventory(tokenids, char_name, inventory_old)
{
  let query_properties = []; //summary of all queries for the items

  let char_items = []; //all items from the blockchain query as array + string

  let char_equipment = []; //all specific items of an type collected

  let char_recipes = []; //all recipes

  let char_materials_all = []; //all specific items of an type collected
  let char_materials = {}; //materials sorted after their game ids as an object
  let char_materials_array = [] //array representing the object to fit into the inventory creation

  let char_questitems = []; //all specific items of an type collected
  let char_skins = []; //all specific items of an type collected

  let inventory_interim = []; //vorgeformtes inventar aus blockchain
  let inventory = []; //inventory from the character


  return new Promise(async function(resolve, reject) {
    for (let i=0; i<tokenids.length; i++)
    {
      stringifiedItem = await queryProperties(setup.rpcAddress, setup.magic, setup.contracthash_items, tokenids[i])

      console.log(stringifiedItem)
      item = JSON.parse(stringifiedItem)
      if (item.type === "equipment")
      {
        char_equipment.push(
          {
            b_id: tokenids[i],
            g_id: item.properties.item_id,
            stk: 1,
            slt: undefined
          }
        )
      }
      else if (item.type === "recipe")
      {
        char_recipes.push(
          {
            b_id: tokenids[i],
            g_id: item.properties.item_id,
            stk: 1,
            slt: undefined
          }
        )
      }
      else if (item.type === "material")
      {
        char_materials_all.push(
          {
            b_id: tokenids[i],
            g_id: item.properties.item_id,
            stk: 1,
            slt: undefined
          }
        )
      }
      else if (item.type === "questitem")
      {
        char_questitems.push(
          {
            b_id: tokenids[i],
            g_id: item.properties.item_id,
            stk: 1,
            slt: undefined
          }
        )
      }
      else if (item.type === "skin")
      {
        char_skins.push(
          {
            b_id: tokenids[i],
            g_id: item.properties.item_id,
            stk: 1,
            slt: undefined
          }
        )
      }
    }

    for (let i=0; i<char_materials_all.length; i++)
    {
      if (!char_materials.hasOwnProperty(char_materials_all[i].g_id))
      {
        char_materials[char_materials_all[i].g_id] = char_materials_all[i]
      }
      else
      {
        if (!Array.isArray(char_materials[char_materials_all[i].g_id].b_id))
        {
          b_id = char_materials[char_materials_all[i].g_id].b_id;
          b_id_new = char_materials_all[i].b_id;
          char_materials[char_materials_all[i].g_id].b_id = [b_id, b_id_new]
        }
        else
        {
          char_materials[char_materials_all[i].g_id].b_id.push(char_materials_all[i].b_id)
        }
        char_materials[char_materials_all[i].g_id].stk += 1;
      }
    }

    //Breaking up the Object into an array that can be used to build inventory
    for (const [key, value] of Object.entries(char_materials)) {
      char_materials_array.push(value)
    }

    /*
    console.log("Equipment: ", char_equipment);
    console.log("Materials: ", char_materials_array);
    console.log("Questitems: ", char_questitems);
    console.log("Skins: ", char_skins);
    */

    //TO DO
    //materials und questitems auf gleiche items checken und auf stack zusammenfassen
    //daraus vorläufiges inventar bilden, ohne inventarposition zu beachten


    inventory_interim = inventory_interim.concat(char_equipment, char_recipes, char_materials_array, char_questitems, char_skins);
    let inventory_dummy = create_inventory_dummy(inventory_interim); //raw structure of the inventory which will be saved later on in the database

    console.log("Inventory_old: ",JSON.parse(inventory_old))
    console.log("Interim:", inventory_interim);
    console.log("Dummy:", inventory_dummy);

    new_inventory = JSON.stringify(create_inventory(JSON.parse(inventory_old), inventory_interim, inventory_dummy))

    resolve(new_inventory);
  });

  //mit token ids nach den token auf der blockchain suchen
  //als ergebnis object mit struktur tokenid_chain|tokenid_datenbank|
  //stackbare ITEMS NFT
}

function save_inventory(inventory_new, char_name)
{
  query_save_inventory = "UPDATE inventory_blockchain SET inventory_json=? WHERE char_name=?";
  return new Promise(function(resolve, reject) {
    con.query(query_save_inventory, [inventory_new, char_name], function(err,result)
    {
      if(err) throw resolve(false) //Error
      resolve(true)
    });
  });
}

function create_inventory_dummy(tokenids)
{
  inventory_size = tokenids.length;

  let inventory_dummy = {
    head: undefined,
    chest: undefined,
    gauntlets: undefined,
    legs: undefined,
    shoes: undefined,
    mainhand: undefined,
    offhand: undefined,
    ring1: undefined,
    ring2: undefined,
    amulette: undefined
  }

  for (let i=0; i<inventory_size; i++)
  {
      inventory_dummy[i] = undefined;
  }

  return inventory_dummy;
}

function create_inventory(old, interim, dummy)
{
  let check_length = true //check if old and interim have the same amount of ids
  let check_ids = true //check if all ids match

  let interim_b_ids = [] //array for all blockchain ids --> inventory interim
  let old_b_ids = [] //array for all blockchain ids --> inventory old

  let equipment_slots = [ //zum filtern
    'head',
    'chest',
    'gauntlets',
    'legs',
    'shoes',
    'mainhand',
    'offhand',
    'ring1',
    'ring2',
    'amulette'
  ]

  for (let i=0; i<interim.length; i++)
  {
    interim_b_ids.push(interim[i]["b_id"])
  }

  for (let [key, value] of Object.entries(old))
  {
    console.log(old_b_ids)
    old_b_ids.push(old[key][0])
  }

  if (!(interim_b_ids.length === old_b_ids.length))
  {
    check_length = false;
  }

  for (let [key, value] of Object.entries(old))
  {
    if (check_ids === true)
    {
      if (!interim_b_ids.includes(old[key][0]))
      {
        check_ids = false
      }
    }
  }

/*
  console.log(old_b_ids)
  console.log(interim_b_ids)

  console.log("Check_values:", "length", check_length, "ids", check_ids)
*/

  if (check_length === false || check_ids === false)
  {
    if (check_length === false && check_ids === false) {console.log("Length - false, Ids - false")}
    else if (check_length === true && check_ids === false) {console.log("Length - true, Ids - false")}
    else if (check_length === false && check_ids === false) {console.log("Length - false, Ids - true")}

    //dummy durchloopen - schauen, ob in old ein item auf dem slot ist
    let missing = []
    let place_found = []

    for (let [key, value] of Object.entries(dummy))
    {
      if (old !== false)
      {
        if (key in old)
        {
          let placed = false //variable um festzulegen, ob ein item schon einem Inventarplatz zugewiesen wurde

          while (placed === false)
          {
            //inventarplatz zuweisen
            if (interim_b_ids.includes(old[key][0]))
            {
              dummy[key] = [interim[interim_b_ids.indexOf(old[key][0])].b_id,
                            interim[interim_b_ids.indexOf(old[key][0])].g_id,
                            interim[interim_b_ids.indexOf(old[key][0])].stk]

              interim[interim_b_ids.indexOf(old[key][0])].slt = key;

              placed = true
            }
            else
            {
              placed = true
            }
          }
        }
      }
      else
      {
        placed = true
      }
    }

    for (let i=0; i<interim.length; i++)
    {
      if (interim[i].slt === undefined)
      {
        missing.push([interim[i],i])
      }
    }

    for (let [key, value] of Object.entries(dummy))
    {
      if (dummy[key] === undefined && !equipment_slots.includes(key))
      {
        place_found.push(key)
      }
    }

    for (let i=0; i<missing.length; i++)
    {
      dummy[place_found[i]] = [missing[i][0].b_id,
                              missing[i][0].g_id,
                              missing[i][0].stk]

      interim[missing[i][1]].slt = place_found[i]
    }

    console.log(interim)
    console.log(dummy)

    console.log("neue items vorhanden und neue ids dazugekommen/weggefallen")
    return dummy
  }

  else if (check_length === true && check_ids === true)
  {
    console.log("return that inventory_old fits")
    console.log(old)
    return old
  }
}

function delete_transaction(id)
{
  query_delete = 'DELETE FROM update_inventory WHERE id=?';
  con.query(query_delete, id, function(err,result)
  {
    if(err) throw err //Error
  })
}

async function queryProperties(node, networkMagic, contractHash, tokenid){
  const method = "properties"

  token_id = {
    type: "Integer",
    value: tokenid.toString()
  }

  console.log(">>>>", token_id)

  token_id_param = new Neon.sc.ContractParam(token_id)

  const res = await testInvoke(node, networkMagic, contractHash, method, [token_id_param])

  if (res === undefined || res.length === 0) {
    throw new Error("unrecognized response")
  }

  return hex2a(res[0].value.replace("Q==", "d"))
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

function hex2a(hexx) {
  var hex = hexx.toString();//force conversion
  var str = '';
  for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
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

function timer(ms) {
  return new Promise(res => setTimeout(res, ms));
}

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

login();

async function login()
{
  con = createConnection();
  for (let i = 0; i < +Infinity; i++)
  {
    console.log("Iteration", i);

    var state = 0;
    var get_player = 'SELECT * FROM player_login WHERE state = ?';

    let waiting_for_login = await login_query(get_player, state)
    console.log(waiting_for_login)

    if (waiting_for_login != false)
    {
      for (let j=0; j<waiting_for_login.length; j++)
      {
        if(waiting_for_login[j].login_type === 0)
        {
          console.log("spieler war nochnie eingeloggt")

          var query_mint = 'INSERT INTO to_mint (item_id, receiver) VALUES (?,?)';
          let startequipment = await startequipment_query(query_mint, waiting_for_login[j].public_key)
          if (startequipment == true)
          {
            console.log("equip in minting queue")
            while (await scan_minting(waiting_for_login[j].public_key) == false)
            {
              await timer(1000);
            }
            console.log("equipment minted, create inventory");
            let items = await get_starteritems_minted(waiting_for_login[j].public_key)
            await create_starterinventory(waiting_for_login[j].char_name, items)
            console.log("inventory created, change login type");
            await change_logintype(waiting_for_login[j].public_key);
            console.log("logintype updated");
            await timer(15000);
          }
          else
          {
            break;
          }
        }

        let public_key = waiting_for_login[j].public_key
        let char_name = waiting_for_login[j].char_name

        console.log(public_key)
        console.log(char_name)

        itemids = await get_itemids(public_key)
        console.log(itemids)

        inventory_old = await get_inventory(char_name)
        console.log(inventory_old)
        inventory_new = await form_inventory(itemids, public_key, inventory_old)
        console.log(inventory_new)
        inventory_saved = await save_inventory(inventory_new, char_name)
        console.log(inventory_saved)

        if (inventory_saved === true)
        {
          finish_login(waiting_for_login[j].public_key);
        }
        else
        {
          console.log("login error")
        }
      }
    }
    await timer(1000);
  }
  con.end(function(err){})

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

function login_query(get_player, state)
{
  return new Promise(function(resolve, reject) {
    con.query(get_player, state, function(err,result)
    {
      if(err == null)
      {
        let blockchainquery = []

        if (result.length > 0)
        {
          Object.keys(result).forEach(function(key)  //Form result into object
          {
            var row = result[key];

            blockchainquery.push(
            {
              id: row.id,
              char_name: row.char_name,
              public_key: row.public_key,
              login_type: row.login_type,
              state: row.state
            })
            resolve(blockchainquery)
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

function startequipment_query(query_mint, public_key)
{
  return new Promise(function(resolve, reject) {

    let start_items = [1000,1500,2500,3000,5000]

    for (let i=0; i<start_items.length; i++)
    {
      con.query(query_mint, [start_items[i], public_key], function(err,result)
      {
        if(err) throw resolve(false) //Error
        resolve(true)
      });
    }
  });
}

function get_starteritems_minted(public_key)
{
  return new Promise(function(resolve, reject) {
    //get minted startequipment items
    query_startequipment = "SELECT * FROM to_mint WHERE receiver=? AND state=?"

    con.query(query_startequipment, [public_key, 2], function(err,result)
    {
      if(err) throw err //Error

      let items = []

      if (result.length > 0)
      {
        Object.keys(result).forEach(function(key)  //Form result into object
        {
          var row = result[key];
          items.push([row.id, row.item_id, 1])
        })
      }
      console.log(items)
      resolve(items)
    });
  });
}

function create_starterinventory(char_name, items)
{
  return new Promise(function(resolve, reject) {

    query_create_inventory = "INSERT INTO inventory_blockchain (char_name, inventory_json) VALUES (?,?)";

    items_key = {
      head: 1000,
      chest: 1500,
      legs: 2500,
      shoes: 3000,
      mainhand: 5000
    }

    for (let [key, value] of Object.entries(items_key))
    {
      for (let i=0; i<items.length; i++)
      {
        if (value === items[i][1])
        {
          items_key[key] = items[i]
        }
      }
    }

    let inventory_json = JSON.stringify(items_key)

    con.query(query_create_inventory, [char_name, inventory_json], function(err,result)
    {
      if(err) throw err //Error
      resolve(true)
    });
  });
}

function scan_minting(public_key)
{
  minted = false;

  return new Promise(function(resolve, reject) {

    var query_mining_state = 'SELECT * FROM to_mint WHERE receiver = ?';
    console.log("vor query")

    con.query(query_mining_state, public_key, function(err,result)
    {
      if(err) throw err //Error

      let login_results = []

      if (result.length > 0)
      {
        Object.keys(result).forEach(function(key)  //Form result into object
        {
          var row = result[key];

          login_results.push(
          {
            id: row.id,
            char_name: row.item_id,
            public_key: row.receiver,
            state: row.state,
            txid: row.txid
          })
        })

        for(let i=0; i<login_results.length; i++)
        {
          if(login_results[i].state!=2)
          {
            minted = false;
            break;
          }
          else
          {
            minted = true;
          }
        }
      }
    resolve(minted);
    })
  });
}

function change_logintype(public_key)
{
  console.log("updating the logintype")
  query_logintype = "UPDATE game_users SET user_logintype=? WHERE user_publicKey=?";
  return new Promise(function(resolve, reject) {
    con.query(query_logintype, [1, public_key], function(err,result)
    {
      if(err) throw resolve(false) //Error
      resolve(true)
    });
  });
}

function finish_login(public_key)
{
  query_finishlogin = "UPDATE player_login SET state=? WHERE public_key=?";
  return new Promise(function(resolve, reject) {
    con.query(query_finishlogin, [1, public_key], function(err,result)
    {
      if(err) throw resolve(false) //Error
      resolve(true)
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

function create_inventory_dummy(tokenids)
{
  inventory_size = tokenids.length;

  let inventory_dummy = {
    head: undefined,
    shoulder: undefined,
    chest: undefined,
    gauntlets: undefined,
    legs: undefined,
    shoes: undefined,
    mainhand: undefined,
    offhand: undefined,
    ring: undefined,
    amulette: undefined
  }

  for (let i=0; i<inventory_size; i++)
  {
      inventory_dummy[i] = undefined;
  }

  return inventory_dummy;
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

function create_inventory(old, interim, dummy)
{
  let check_length = true //check if old and interim have the same amount of ids
  let check_ids = true //check if all ids match

  let interim_b_ids = [] //array for all blockchain ids --> inventory interim
  let old_b_ids = [] //array for all blockchain ids --> inventory old

  let equipment_slots = [ //zum filtern
    'head',
    'shoulder',
    'chest',
    'gauntlets',
    'legs',
    'shoes',
    'mainhand',
    'offhand',
    'ring',
    'amulette'
  ]

  for (let i=0; i<interim.length; i++)
  {
    interim_b_ids.push(interim[i]["b_id"])
  }

  for (let [key, value] of Object.entries(old))
  {
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
